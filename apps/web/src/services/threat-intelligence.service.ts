export const CISA_KEV_SOURCE_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

export const CISA_KEV_INFORMATION_URL =
  'https://www.cisa.gov/known-exploited-vulnerabilities-catalog';

const threatIntelligenceBaseUrl = (
  import.meta.env.VITE_THREAT_INTELLIGENCE_API_URL || '/threat-intelligence-api'
).replace(/\/$/, '');

export interface KevVulnerability {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  notes: string;
  cwes: string[];
}

export interface KevCatalog {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  declaredCount: number | null;
  vulnerabilities: KevVulnerability[];
  fetchedAt: string;
  sourceStatus: 'live' | 'cache' | 'stale';
  cacheAgeSeconds: number;
  warning?: string;
}

export interface ThreatIntelligenceHealth {
  status: string;
  service: string;
  source: string;
  cached: boolean;
  cache_age_seconds: number | null;
  time: string;
  modelLoaded: boolean;
  providers: {
    NVD: boolean;
    ThreatFox: boolean;
  };
}

export type IndicatorType = 'cve' | 'ip' | 'domain' | 'url' | 'hash' | 'unknown';
export type ThreatVerdict = 'critical' | 'high' | 'medium' | 'low' | 'inconclusive';

export type EvidenceCoverageStatus = 'supported' | 'partial' | 'degraded' | 'inconclusive';
export type EvidenceConfidence = 'high' | 'moderate' | 'low' | 'none';
export type CoverageProviderStatus = 'contributed' | 'no_match' | 'not_configured' | 'error';

export interface CoverageProvider {
  name: string;
  category: 'reputation' | 'context' | 'analysis';
  status: CoverageProviderStatus;
  detail: string;
}

export interface EvidenceCoverage {
  status: EvidenceCoverageStatus;
  confidence: EvidenceConfidence;
  meaningfulEvidence: boolean;
  sourcesQueried: number;
  sourcesExpected: number;
  summary: string;
  providers: CoverageProvider[];
}

export type ThreatEvidenceValue = string | number | boolean | null;

export interface NvdDetail {
  id: string;
  published: string;
  lastModified: string;
  description: string;
  cvssScore: number | null;
  severity: string;
  vector: string;
  references: string[];
}

export interface ThreatFoxDetail {
  configured: boolean;
  matches: Record<string, unknown>[];
  status: string;
}

export interface IndicatorDetails {
  cisaKEV?: KevVulnerability;
  nvd?: NvdDetail | null;
  threatFox?: ThreatFoxDetail;
  dns?: { resolves: boolean; addresses: string[] };
  urlFeatures?: Record<string, ThreatEvidenceValue>;
  mlProbability?: number | null;
}

export interface IndicatorResult {
  id?: number;
  indicator: string;
  indicatorType: IndicatorType;
  riskScore: number;
  verdict: ThreatVerdict;
  reasons: string[];
  checkedAt: string;
  evidence: Record<string, ThreatEvidenceValue>;
  details: IndicatorDetails;
  providerErrors: string[];
  coverage: EvidenceCoverage;
  model: { loaded: boolean; used: boolean };
}

export interface ThreatFeedStatus {
  cisaKEV: {
    status: 'live' | 'cache' | 'error' | 'not_loaded' | string;
    count: number;
    fetchedAt: string;
    lastKnownGood: boolean;
    error?: string;
  };
  nvd: { configured: boolean };
  threatFox: { configured: boolean };
}

export type DueStatus = 'overdue' | 'due-soon' | 'scheduled';

export class ThreatIntelligenceError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ThreatIntelligenceError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(value: unknown) {
  return value === true || value === 'true' || value === 1;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

function normalizeVulnerability(value: unknown): KevVulnerability | null {
  if (!isRecord(value)) return null;

  const cveID = readString(value.cveID).toUpperCase();
  const dateAdded = readString(value.dateAdded);
  const vulnerability: KevVulnerability = {
    cveID,
    vendorProject: readString(value.vendorProject),
    product: readString(value.product),
    vulnerabilityName: readString(value.vulnerabilityName),
    dateAdded,
    shortDescription: readString(value.shortDescription),
    requiredAction: readString(value.requiredAction),
    dueDate: readString(value.dueDate),
    knownRansomwareCampaignUse: readString(value.knownRansomwareCampaignUse),
    notes: readString(value.notes),
    cwes: Array.isArray(value.cwes) ? value.cwes.map(readString).filter(Boolean) : [],
  };

  return /^CVE-\d{4}-\d{4,}$/.test(cveID) && parseCatalogDate(dateAdded) ? vulnerability : null;
}

export function normalizeKevCatalog(
  payload: unknown,
  fetchedAt = new Date().toISOString()
): KevCatalog {
  if (!isRecord(payload) || !Array.isArray(payload.vulnerabilities)) {
    throw new ThreatIntelligenceError('CISA returned an unexpected catalog format.');
  }

  const vulnerabilities = payload.vulnerabilities
    .map(normalizeVulnerability)
    .filter((item): item is KevVulnerability => item !== null);

  if (!vulnerabilities.length) {
    throw new ThreatIntelligenceError(
      'CISA returned a catalog with no valid vulnerability records.'
    );
  }

  const count = Number(payload.declaredCount ?? payload.count);
  return {
    title: readString(payload.title) || 'CISA Known Exploited Vulnerabilities Catalog',
    catalogVersion: readString(payload.catalogVersion),
    dateReleased: readString(payload.dateReleased),
    declaredCount: Number.isFinite(count) ? count : null,
    vulnerabilities,
    fetchedAt: readString(payload.fetchedAt) || fetchedAt,
    sourceStatus:
      payload.sourceStatus === 'cache' || payload.sourceStatus === 'stale'
        ? payload.sourceStatus
        : 'live',
    cacheAgeSeconds:
      typeof payload.cacheAgeSeconds === 'number' && payload.cacheAgeSeconds >= 0
        ? payload.cacheAgeSeconds
        : 0,
    warning: readString(payload.warning) || undefined,
  };
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: unknown; message?: unknown };
    return (
      readString(payload.error) ||
      readString(payload.message) ||
      `Threat intelligence service returned HTTP ${response.status}.`
    );
  } catch {
    return `Threat intelligence service returned HTTP ${response.status}.`;
  }
}

async function requestJson(
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal,
  timeoutMs = 20_000
) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort('timeout'), timeoutMs);
  const abortFromCaller = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetch(`${threatIntelligenceBaseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json', ...options.headers },
    });
    if (!response.ok) {
      throw new ThreatIntelligenceError(await readError(response), response.status);
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof ThreatIntelligenceError) throw error;
    if (signal?.aborted) {
      throw new ThreatIntelligenceError('The threat intelligence request was cancelled.');
    }
    if (controller.signal.aborted) {
      throw new ThreatIntelligenceError(
        `The threat intelligence request timed out after ${Math.round(timeoutMs / 1000)} seconds.`
      );
    }
    throw new ThreatIntelligenceError(
      'The local threat intelligence service is unavailable on port 5005. Start it and retry.'
    );
  } finally {
    globalThis.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

export async function fetchKevCatalog(
  signal?: AbortSignal,
  forceRefresh = false
): Promise<KevCatalog> {
  return normalizeKevCatalog(
    await requestJson(`/api/kev${forceRefresh ? '?refresh=1' : ''}`, {}, signal)
  );
}

export function normalizeIndicatorInput(value: string) {
  const indicator = value.trim();
  if (!indicator) throw new ThreatIntelligenceError('Enter an indicator to investigate.');
  if (indicator.length > 4096) throw new ThreatIntelligenceError('Indicator is too long.');

  if (/^CVE-\d{4}-\d{4,}$/i.test(indicator)) return indicator.toUpperCase();
  if (/^(?:[a-f\d]{32}|[a-f\d]{40}|[a-f\d]{64})$/i.test(indicator)) {
    return indicator.toLowerCase();
  }
  if (/^https?:\/\/[^\s]+$/i.test(indicator)) return indicator;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(indicator) || indicator.includes(':')) return indicator;
  if (/^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i.test(indicator)) {
    return indicator.toLowerCase();
  }
  throw new ThreatIntelligenceError(
    'Unsupported indicator. Use CVE, IPv4/IPv6, domain, URL, MD5, SHA-1 or SHA-256.'
  );
}

function normalizeNvdDetail(value: unknown): NvdDetail | null {
  if (!isRecord(value)) return null;
  return {
    id: readString(value.id),
    published: readString(value.published),
    lastModified: readString(value.lastModified),
    description: readString(value.description),
    cvssScore: value.cvssScore === null ? null : readNumber(value.cvssScore),
    severity: readString(value.severity),
    vector: readString(value.vector),
    references: readStringArray(value.references),
  };
}

function normalizeEvidenceCoverage(
  value: unknown,
  evidence: Record<string, ThreatEvidenceValue>
): EvidenceCoverage {
  if (isRecord(value)) {
    const rawStatus = readString(value.status).toLowerCase();
    const status: EvidenceCoverageStatus = [
      'supported',
      'partial',
      'degraded',
      'inconclusive',
    ].includes(rawStatus)
      ? (rawStatus as EvidenceCoverageStatus)
      : 'inconclusive';
    const rawConfidence = readString(value.confidence).toLowerCase();
    const confidence: EvidenceConfidence = ['high', 'moderate', 'low', 'none'].includes(
      rawConfidence
    )
      ? (rawConfidence as EvidenceConfidence)
      : 'none';
    const providers: CoverageProvider[] = Array.isArray(value.providers)
      ? value.providers.flatMap(provider => {
          if (!isRecord(provider)) return [];
          const name = readString(provider.name);
          const rawCategory = readString(provider.category).toLowerCase();
          const rawProviderStatus = readString(provider.status).toLowerCase();
          if (
            !name ||
            !['reputation', 'context', 'analysis'].includes(rawCategory) ||
            !['contributed', 'no_match', 'not_configured', 'error'].includes(rawProviderStatus)
          ) {
            return [];
          }
          return [
            {
              name,
              category: rawCategory as CoverageProvider['category'],
              status: rawProviderStatus as CoverageProviderStatus,
              detail: readString(provider.detail),
            },
          ];
        })
      : [];
    return {
      status,
      confidence,
      meaningfulEvidence: readBoolean(value.meaningfulEvidence),
      sourcesQueried: Math.max(0, Math.trunc(readNumber(value.sourcesQueried))),
      sourcesExpected: Math.max(0, Math.trunc(readNumber(value.sourcesExpected))),
      summary:
        readString(value.summary) ||
        'The service did not provide an evidence coverage explanation.',
      providers,
    };
  }

  const hasLegacyEvidence = Object.keys(evidence).length > 0;
  return {
    status: hasLegacyEvidence ? 'partial' : 'inconclusive',
    confidence: hasLegacyEvidence ? 'low' : 'none',
    meaningfulEvidence: hasLegacyEvidence,
    sourcesQueried: 0,
    sourcesExpected: 0,
    summary: hasLegacyEvidence
      ? 'This stored result predates provider coverage reporting; review its evidence directly.'
      : 'No provider coverage was recorded. Do not interpret the score as proof of safety.',
    providers: [],
  };
}

export function normalizeIndicatorResult(payload: unknown): IndicatorResult {
  if (!isRecord(payload)) {
    throw new ThreatIntelligenceError('The service returned an invalid indicator result.');
  }

  let expanded = payload;
  if (typeof payload.result_json === 'string') {
    try {
      const decoded = JSON.parse(payload.result_json) as unknown;
      if (isRecord(decoded)) expanded = { ...payload, ...decoded };
    } catch {
      // Keep the indexed row fields so history remains useful when stored JSON is damaged.
    }
  } else if (isRecord(payload.result_json)) {
    expanded = { ...payload, ...payload.result_json };
  }

  const indicator = readString(expanded.indicator);
  if (!indicator) {
    throw new ThreatIntelligenceError('The service returned a result without an indicator.');
  }
  const rawType = readString(expanded.indicatorType || expanded.indicator_type).toLowerCase();
  const indicatorType: IndicatorType = ['cve', 'ip', 'domain', 'url', 'hash'].includes(rawType)
    ? (rawType as IndicatorType)
    : 'unknown';
  const rawVerdict = readString(expanded.verdict).toLowerCase();
  const verdict: ThreatVerdict = ['critical', 'high', 'medium', 'low', 'inconclusive'].includes(
    rawVerdict
  )
    ? (rawVerdict as ThreatVerdict)
    : 'low';
  const rawDetails = isRecord(expanded.details) ? expanded.details : {};
  const rawThreatFox = isRecord(rawDetails.threatFox) ? rawDetails.threatFox : undefined;
  const rawDns = isRecord(rawDetails.dns) ? rawDetails.dns : undefined;
  const rawEvidence = isRecord(expanded.evidence) ? expanded.evidence : {};
  const evidence = Object.fromEntries(
    Object.entries(rawEvidence).filter(
      ([, item]) => ['string', 'number', 'boolean'].includes(typeof item) || item === null
    )
  ) as Record<string, ThreatEvidenceValue>;
  const rawModel = isRecord(expanded.model) ? expanded.model : {};
  const rawKev = isRecord(rawDetails.cisaKEV) ? normalizeVulnerability(rawDetails.cisaKEV) : null;
  const id = readNumber(expanded.id, Number.NaN);

  return {
    ...(Number.isFinite(id) ? { id } : {}),
    indicator,
    indicatorType,
    riskScore: Math.max(
      0,
      Math.min(100, Math.round(readNumber(expanded.riskScore ?? expanded.score)))
    ),
    verdict,
    reasons: readStringArray(expanded.reasons),
    checkedAt: readString(expanded.checkedAt || expanded.created_at),
    evidence,
    details: {
      ...(rawKev ? { cisaKEV: rawKev } : {}),
      ...(Object.prototype.hasOwnProperty.call(rawDetails, 'nvd')
        ? { nvd: normalizeNvdDetail(rawDetails.nvd) }
        : {}),
      ...(rawThreatFox
        ? {
            threatFox: {
              configured: readBoolean(rawThreatFox.configured),
              matches: Array.isArray(rawThreatFox.matches)
                ? rawThreatFox.matches.filter(isRecord)
                : [],
              status: readString(rawThreatFox.status),
            },
          }
        : {}),
      ...(rawDns
        ? {
            dns: {
              resolves: readBoolean(rawDns.resolves),
              addresses: readStringArray(rawDns.addresses),
            },
          }
        : {}),
      ...(isRecord(rawDetails.urlFeatures)
        ? {
            urlFeatures: Object.fromEntries(
              Object.entries(rawDetails.urlFeatures).filter(
                ([, item]) => ['string', 'number', 'boolean'].includes(typeof item) || item === null
              )
            ) as Record<string, ThreatEvidenceValue>,
          }
        : {}),
      ...(typeof rawDetails.mlProbability === 'number'
        ? { mlProbability: rawDetails.mlProbability }
        : {}),
    },
    providerErrors: readStringArray(expanded.providerErrors || expanded.provider_errors),
    coverage: normalizeEvidenceCoverage(expanded.coverage, evidence),
    model: { loaded: readBoolean(rawModel.loaded), used: readBoolean(rawModel.used) },
  };
}

export async function checkThreatIndicator(indicator: string, signal?: AbortSignal) {
  const normalized = normalizeIndicatorInput(indicator);
  const payload = await requestJson(
    '/api/indicator/check',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ indicator: normalized }),
    },
    signal,
    40_000
  );
  return normalizeIndicatorResult(payload);
}

export async function fetchThreatHistory(limit = 25, signal?: AbortSignal) {
  const boundedLimit = Math.max(1, Math.min(200, Math.trunc(limit) || 25));
  const payload = await requestJson(`/api/history?limit=${boundedLimit}`, {}, signal);
  const values = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.observations)
      ? payload.observations
      : null;
  if (!values) throw new ThreatIntelligenceError('The service returned an invalid history list.');
  return values.flatMap(value => {
    try {
      return [normalizeIndicatorResult(value)];
    } catch {
      return [];
    }
  });
}

export async function fetchThreatIntelligenceHealth(
  signal?: AbortSignal
): Promise<ThreatIntelligenceHealth> {
  const payload = await requestJson('/api/health', {}, signal, 8_000);
  if (!isRecord(payload))
    throw new ThreatIntelligenceError('The service returned invalid health data.');
  const providers = isRecord(payload.providers) ? payload.providers : {};
  return {
    status: readString(payload.status) || 'unknown',
    service: readString(payload.service),
    source: readString(payload.source),
    cached: readBoolean(payload.cached),
    cache_age_seconds:
      payload.cache_age_seconds === null ? null : readNumber(payload.cache_age_seconds),
    time: readString(payload.time),
    modelLoaded: readBoolean(payload.modelLoaded),
    providers: {
      NVD: readBoolean(providers.NVD),
      ThreatFox: readBoolean(providers.ThreatFox),
    },
  } satisfies ThreatIntelligenceHealth;
}

export async function fetchThreatFeedStatus(signal?: AbortSignal): Promise<ThreatFeedStatus> {
  const payload = await requestJson('/api/feeds', {}, signal, 8_000);
  if (!isRecord(payload))
    throw new ThreatIntelligenceError('The service returned invalid feed data.');
  const cisa = isRecord(payload.cisaKEV) ? payload.cisaKEV : {};
  const nvd = isRecord(payload.nvd) ? payload.nvd : {};
  const threatFox = isRecord(payload.threatFox) ? payload.threatFox : {};
  return {
    cisaKEV: {
      status: readString(cisa.status) || 'not_loaded',
      count: Math.max(0, readNumber(cisa.count)),
      fetchedAt: readString(cisa.fetchedAt),
      lastKnownGood: readBoolean(cisa.lastKnownGood),
      error: readString(cisa.error) || undefined,
    },
    nvd: { configured: readBoolean(nvd.configured) },
    threatFox: { configured: readBoolean(threatFox.configured) },
  } satisfies ThreatFeedStatus;
}

export function isKnownRansomwareUse(value: string) {
  return value.trim().toLowerCase() === 'known';
}

export function parseCatalogDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function getDueStatus(dueDate: string, now = new Date()): DueStatus {
  const date = parseCatalogDate(dueDate);
  if (!date) return 'scheduled';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return 'overdue';
  if (days <= 14) return 'due-soon';
  return 'scheduled';
}

export function extractHttpLinks(value: string) {
  const matches = value.match(/https?:\/\/[^\s,;]+/gi) ?? [];
  return matches
    .map(link => link.replace(/[.)\]]+$/, ''))
    .filter(link => {
      try {
        const url = new URL(link);
        return url.protocol === 'https:' || url.protocol === 'http:';
      } catch {
        return false;
      }
    });
}
