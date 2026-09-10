import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkThreatIndicator,
  extractHttpLinks,
  fetchThreatFeedStatus,
  fetchThreatHistory,
  fetchKevCatalog,
  fetchThreatIntelligenceHealth,
  getDueStatus,
  isKnownRansomwareUse,
  normalizeKevCatalog,
  normalizeIndicatorInput,
  normalizeIndicatorResult,
  parseCatalogDate,
  ThreatIntelligenceError,
} from './threat-intelligence.service';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const sourceRecord = {
  cveID: 'CVE-2026-1234',
  vendorProject: 'Example Vendor',
  product: 'Example Product',
  vulnerabilityName: 'Example vulnerability',
  dateAdded: '2026-08-31',
  shortDescription: 'A description supplied by the source.',
  requiredAction: 'Apply mitigations per vendor instructions.',
  dueDate: '2026-09-14',
  knownRansomwareCampaignUse: 'Known',
  notes: 'See https://example.gov/advisory.',
  cwes: ['CWE-79'],
};

describe('threat intelligence service', () => {
  it('normalizes only valid CISA-style records and preserves source metadata', () => {
    const catalog = normalizeKevCatalog(
      {
        title: 'CISA Catalog of Known Exploited Vulnerabilities',
        catalogVersion: '2026.09.01',
        dateReleased: '2026-09-01T12:00:00Z',
        count: 2,
        vulnerabilities: [sourceRecord, { vendorProject: 'Missing CVE' }],
      },
      '2026-09-01T12:01:00Z'
    );

    expect(catalog.vulnerabilities).toHaveLength(1);
    expect(catalog.vulnerabilities[0]).toMatchObject({
      cveID: 'CVE-2026-1234',
      cwes: ['CWE-79'],
    });
    expect(catalog.declaredCount).toBe(2);
    expect(catalog.fetchedAt).toBe('2026-09-01T12:01:00Z');
    expect(catalog.sourceStatus).toBe('live');
  });

  it('rejects a response that is not a usable KEV catalog', () => {
    expect(() => normalizeKevCatalog({ vulnerabilities: [] })).toThrow(ThreatIntelligenceError);
    expect(() => normalizeKevCatalog({ records: [sourceRecord] })).toThrow(
      'unexpected catalog format'
    );
  });

  it('derives due-state and ransomware labels without inventing activity', () => {
    const now = new Date('2026-09-07T12:00:00');
    expect(getDueStatus('2026-09-06', now)).toBe('overdue');
    expect(getDueStatus('2026-09-14', now)).toBe('due-soon');
    expect(getDueStatus('2026-10-01', now)).toBe('scheduled');
    expect(getDueStatus('2026-02-31', now)).toBe('scheduled');
    expect(parseCatalogDate('2026-02-31')).toBeNull();
    expect(isKnownRansomwareUse('Known')).toBe(true);
    expect(isKnownRansomwareUse('Unknown')).toBe(false);
  });

  it('extracts advisory URLs from CISA notes safely', () => {
    expect(extractHttpLinks('References: https://example.gov/a, https://example.gov/b.')).toEqual([
      'https://example.gov/a',
      'https://example.gov/b',
    ]);
  });

  it('loads a validated catalog through the local service and supports forced refresh', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          title: 'CISA KEV',
          declaredCount: 1,
          vulnerabilities: [sourceRecord],
          fetchedAt: '2026-09-01T12:01:00Z',
          sourceStatus: 'cache',
          cacheAgeSeconds: 42,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const catalog = await fetchKevCatalog(undefined, true);

    expect(fetchMock).toHaveBeenCalledWith(
      '/threat-intelligence-api/api/kev?refresh=1',
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(catalog.sourceStatus).toBe('cache');
    expect(catalog.cacheAgeSeconds).toBe(42);
    expect(catalog.declaredCount).toBe(1);
    expect(catalog.fetchedAt).toBe('2026-09-01T12:01:00Z');
  });

  it('preserves backend error details and health metadata', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'CISA upstream unavailable.' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'ok',
            source: 'CISA KEV',
            cached: true,
            cache_age_seconds: 30,
            time: '2026-09-01T12:01:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchKevCatalog()).rejects.toMatchObject({
      message: 'CISA upstream unavailable.',
      status: 502,
    });
    await expect(fetchThreatIntelligenceHealth()).resolves.toMatchObject({
      status: 'ok',
      cached: true,
    });
  });

  it('normalizes supported indicators before lookup and rejects unsupported values locally', async () => {
    expect(normalizeIndicatorInput(' cve-2026-1234 ')).toBe('CVE-2026-1234');
    expect(normalizeIndicatorInput(' EXAMPLE.COM ')).toBe('example.com');
    expect(normalizeIndicatorInput('A'.repeat(32))).toBe('a'.repeat(32));
    expect(() => normalizeIndicatorInput('not an indicator')).toThrow('Unsupported indicator');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          indicator: 'CVE-2026-1234',
          indicatorType: 'cve',
          riskScore: 85,
          verdict: 'critical',
          reasons: ['CISA lists this CVE as a Known Exploited Vulnerability.'],
          checkedAt: '2026-09-01T12:00:00Z',
          evidence: { cisa_kev: true },
          details: {},
          providerErrors: [],
          model: { loaded: true, used: false },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(checkThreatIndicator(' cve-2026-1234 ')).resolves.toMatchObject({
      indicator: 'CVE-2026-1234',
      riskScore: 85,
      verdict: 'critical',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/threat-intelligence-api/api/indicator/check',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ indicator: 'CVE-2026-1234' }),
      })
    );
  });

  it('expands persisted result_json rows while retaining their database id', async () => {
    const storedResult = {
      indicator: 'example.com',
      indicatorType: 'domain',
      riskScore: 10,
      verdict: 'low',
      reasons: [],
      checkedAt: '2026-09-01T12:00:00Z',
      evidence: { dns_resolves: true },
      details: { dns: { resolves: true, addresses: ['203.0.113.8'] } },
      providerErrors: ['ThreatFox: not configured'],
      model: { loaded: false, used: false },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          observations: [
            {
              id: 42,
              indicator: 'indexed-value.example',
              score: 0,
              result_json: JSON.stringify(storedResult),
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const history = await fetchThreatHistory(500);
    expect(fetchMock).toHaveBeenCalledWith(
      '/threat-intelligence-api/api/history?limit=200',
      expect.any(Object)
    );
    expect(history[0]).toMatchObject({
      id: 42,
      indicator: 'example.com',
      indicatorType: 'domain',
      details: { dns: { addresses: ['203.0.113.8'] } },
    });
  });

  it('normalizes provider detail and feed status without trusting unexpected shapes', async () => {
    const result = normalizeIndicatorResult({
      indicator: 'https://example.test/login',
      indicatorType: 'url',
      riskScore: 140,
      verdict: 'HIGH',
      reasons: ['Multiple signals'],
      checkedAt: '2026-09-01T12:00:00Z',
      evidence: { ml_high_risk: true, nested: { ignored: true } },
      details: {
        urlFeatures: { length: 26, suspicious: true },
        mlProbability: 0.91,
        threatFox: { configured: true, matches: [{ ioc: 'example.test' }], status: 'ok' },
      },
      providerErrors: ['NVD unavailable'],
      model: { loaded: true, used: true },
    });
    expect(result.riskScore).toBe(100);
    expect(result.verdict).toBe('high');
    expect(result.evidence).toEqual({ ml_high_risk: true });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            cisaKEV: { status: 'live', count: 1400, lastKnownGood: true },
            nvd: { configured: true },
            threatFox: { configured: false },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    await expect(fetchThreatFeedStatus()).resolves.toMatchObject({
      cisaKEV: { status: 'live', count: 1400 },
      nvd: { configured: true },
      threatFox: { configured: false },
    });
  });

  it('surfaces indicator backend errors and does not issue requests for invalid input', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'ThreatFox quota exceeded.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(checkThreatIndicator('example.com')).rejects.toMatchObject({
      message: 'ThreatFox quota exceeded.',
      status: 429,
    });
    await expect(checkThreatIndicator('invalid value')).rejects.toThrow('Unsupported indicator');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
