import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreatIntelligencePage } from './ThreatIntelligencePage';
import {
  checkThreatIndicator,
  fetchKevCatalog,
  fetchThreatFeedStatus,
  fetchThreatHistory,
  fetchThreatIntelligenceHealth,
} from '../../services/threat-intelligence.service';

vi.mock('../../services/threat-intelligence.service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../services/threat-intelligence.service')>();
  return {
    ...actual,
    checkThreatIndicator: vi.fn(),
    fetchKevCatalog: vi.fn(),
    fetchThreatFeedStatus: vi.fn(),
    fetchThreatHistory: vi.fn(),
    fetchThreatIntelligenceHealth: vi.fn(),
  };
});

const result = {
  indicator: 'CVE-2024-3094',
  indicatorType: 'cve' as const,
  riskScore: 85,
  verdict: 'critical' as const,
  reasons: ['CISA lists this CVE as a Known Exploited Vulnerability.'],
  checkedAt: '2026-09-10T09:00:00Z',
  evidence: { cisa_kev: true },
  details: {},
  providerErrors: [],
  coverage: {
    status: 'supported' as const,
    confidence: 'high' as const,
    meaningfulEvidence: true,
    sourcesQueried: 2,
    sourcesExpected: 2,
    summary: 'All applicable reputation providers completed the lookup.',
    providers: [
      {
        name: 'CISA KEV',
        category: 'reputation' as const,
        status: 'contributed' as const,
        detail: 'Known exploited record matched.',
      },
    ],
  },
  model: { loaded: true, used: false },
};

describe('ThreatIntelligencePage', () => {
  beforeEach(() => {
    vi.mocked(checkThreatIndicator).mockResolvedValue(result);
    vi.mocked(fetchThreatHistory).mockResolvedValue([]);
    vi.mocked(fetchThreatIntelligenceHealth).mockResolvedValue({
      status: 'ok',
      service: 'CyberShield AI Threat Intelligence',
      source: 'CISA KEV',
      cached: false,
      cache_age_seconds: null,
      time: '2026-09-10T09:00:00Z',
      modelLoaded: true,
      providers: { NVD: true, ThreatFox: false },
    });
    vi.mocked(fetchThreatFeedStatus).mockResolvedValue({
      cisaKEV: {
        status: 'live',
        count: 1400,
        fetchedAt: '2026-09-10T09:00:00Z',
        lastKnownGood: true,
      },
      nvd: { configured: true },
      threatFox: { configured: false },
    });
    vi.mocked(fetchKevCatalog).mockResolvedValue({
      title: 'CISA KEV',
      catalogVersion: '2026.09.10',
      dateReleased: '2026-09-10',
      declaredCount: 0,
      vulnerabilities: [],
      fetchedAt: '2026-09-10T09:00:00Z',
      sourceStatus: 'live',
      cacheAgeSeconds: 0,
    });
  });

  it('runs an example IOC investigation and renders evidence without changing tabs', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ThreatIntelligencePage />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'CVE-2024-3094' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run investigation' }));

    expect(await screen.findByRole('heading', { name: 'CVE-2024-3094' })).toBeInTheDocument();
    expect(screen.getByText('critical risk')).toBeInTheDocument();
    expect(screen.getByText('Supported coverage')).toBeInTheDocument();
    expect(screen.getByText('high confidence')).toBeInTheDocument();
    expect(
      screen.getByText('CISA lists this CVE as a Known Exploited Vulnerability.')
    ).toBeInTheDocument();
    expect(checkThreatIndicator).toHaveBeenCalledWith('CVE-2024-3094', expect.any(AbortSignal));
    expect(screen.getByRole('button', { name: 'CISA KEV catalog' })).toBeInTheDocument();
  });

  it('renders missing reputation evidence as inconclusive instead of safe', async () => {
    vi.mocked(checkThreatIndicator).mockResolvedValue({
      ...result,
      indicator: '203.0.113.10',
      indicatorType: 'ip',
      riskScore: 0,
      verdict: 'inconclusive',
      reasons: ['No reputation provider completed the lookup; the verdict is inconclusive.'],
      evidence: {},
      coverage: {
        status: 'inconclusive',
        confidence: 'none',
        meaningfulEvidence: false,
        sourcesQueried: 0,
        sourcesExpected: 1,
        summary:
          'No reputation provider completed this lookup. A zero score must not be interpreted as safe.',
        providers: [
          {
            name: 'ThreatFox',
            category: 'reputation',
            status: 'not_configured',
            detail: 'Auth key is not configured.',
          },
        ],
      },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ThreatIntelligencePage />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText('Indicator value'), {
      target: { value: '203.0.113.10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run investigation' }));

    expect(await screen.findByText('inconclusive verdict')).toBeInTheDocument();
    expect(screen.getByText('Inconclusive evidence')).toBeInTheDocument();
    expect(screen.getByText('none confidence')).toBeInTheDocument();
    expect(screen.queryByText('low risk')).not.toBeInTheDocument();
  });
});
