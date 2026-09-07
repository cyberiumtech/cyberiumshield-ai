export const CISA_KEV_SOURCE_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

export const CISA_KEV_INFORMATION_URL =
  'https://www.cisa.gov/known-exploited-vulnerabilities-catalog';

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

function normalizeVulnerability(value: unknown): KevVulnerability | null {
  if (!isRecord(value)) return null;

  const vulnerability: KevVulnerability = {
    cveID: readString(value.cveID),
    vendorProject: readString(value.vendorProject),
    product: readString(value.product),
    vulnerabilityName: readString(value.vulnerabilityName),
    dateAdded: readString(value.dateAdded),
    shortDescription: readString(value.shortDescription),
    requiredAction: readString(value.requiredAction),
    dueDate: readString(value.dueDate),
    knownRansomwareCampaignUse: readString(value.knownRansomwareCampaignUse),
    notes: readString(value.notes),
    cwes: Array.isArray(value.cwes) ? value.cwes.map(readString).filter(Boolean) : [],
  };

  return vulnerability.cveID && vulnerability.dateAdded ? vulnerability : null;
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

  const count = Number(payload.count);
  return {
    title: readString(payload.title) || 'CISA Known Exploited Vulnerabilities Catalog',
    catalogVersion: readString(payload.catalogVersion),
    dateReleased: readString(payload.dateReleased),
    declaredCount: Number.isFinite(count) ? count : null,
    vulnerabilities,
    fetchedAt,
  };
}

export async function fetchKevCatalog(signal?: AbortSignal): Promise<KevCatalog> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort('timeout'), 15_000);
  const abortFromCaller = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetch(CISA_KEV_SOURCE_URL, {
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new ThreatIntelligenceError(
        `CISA KEV returned HTTP ${response.status}. Please retry shortly.`,
        response.status
      );
    }

    return normalizeKevCatalog(await response.json());
  } catch (error) {
    if (error instanceof ThreatIntelligenceError) throw error;
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) {
      throw new ThreatIntelligenceError('The CISA KEV request timed out after 15 seconds.');
    }
    throw new ThreatIntelligenceError(
      'The CISA KEV feed could not be reached from this browser. This may be a network or cross-origin access issue.'
    );
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

export function isKnownRansomwareUse(value: string) {
  return value.trim().toLowerCase() === 'known';
}

export function parseCatalogDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
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
