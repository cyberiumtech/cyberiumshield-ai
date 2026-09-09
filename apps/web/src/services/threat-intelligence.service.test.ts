import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  extractHttpLinks,
  fetchKevCatalog,
  fetchThreatIntelligenceHealth,
  getDueStatus,
  isKnownRansomwareUse,
  normalizeKevCatalog,
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
});
