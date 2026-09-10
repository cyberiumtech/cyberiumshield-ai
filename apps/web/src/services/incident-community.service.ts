export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'investigating' | 'monitoring' | 'resolved';

export const INCIDENT_CATEGORIES = [
  'Malware',
  'Phishing',
  'Data breach',
  'Unauthorized access',
  'Cloud security',
  'Network intrusion',
  'Other',
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export interface IncidentSolution {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  helpfulCount: number;
  helpfulByBrowser: boolean;
  demo?: boolean;
}

export interface CommunityIncident {
  id: string;
  title: string;
  description: string;
  author: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: IncidentCategory;
  tags: string[];
  affectedSystems: string[];
  createdAt: string;
  updatedAt: string;
  solutions: IncidentSolution[];
  demo?: boolean;
}

export interface PublishIncidentInput {
  title: string;
  description: string;
  author: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: IncidentCategory;
  tags: string[];
  affectedSystems: string[];
}

export interface IncidentFilters {
  query?: string;
  severity?: IncidentSeverity | 'all';
  status?: IncidentStatus | 'all';
  category?: IncidentCategory | 'all';
}

export interface IncidentAnalytics {
  total: number;
  active: number;
  resolved: number;
  resolutionRate: number;
  totalSolutions: number;
  contributors: number;
  severity: Array<{ name: IncidentSeverity; value: number }>;
  status: Array<{ name: IncidentStatus; value: number }>;
  categories: Array<{ name: string; value: number }>;
  activity: Array<{ date: string; incidents: number; resolved: number; solutions: number }>;
  mostDiscussed: CommunityIncident[];
  leadingContributors: Array<{ name: string; solutions: number; helpful: number }>;
  latestResolutions: CommunityIncident[];
  responseGaps: CommunityIncident[];
}

interface IncidentStore {
  version: 1;
  incidents: CommunityIncident[];
}

const STORE_VERSION = 1 as const;
export const INCIDENT_STORAGE_KEY = 'cyberiumshield.incident-community.v1';
const STORE_EVENT = 'cyberiumshield:incident-community-change';

const SEEDED_INCIDENTS: CommunityIncident[] = [
  {
    id: 'INC-2026-0417',
    title: 'OAuth refresh tokens replayed after CI runner exposure',
    description:
      'A self-hosted build runner retained a diagnostic archive containing masked-but-recoverable refresh tokens. The tokens were replayed from a residential proxy against two engineering accounts. Access was contained before production deployment credentials were reached.',
    author: 'Amina K. · Demo responder',
    severity: 'critical',
    status: 'monitoring',
    category: 'Unauthorized access',
    tags: ['oauth', 'ci-cd', 'credential-theft'],
    affectedSystems: ['build-runner-07', 'engineering-sso', 'artifact-registry'],
    createdAt: '2026-08-18T08:20:00.000Z',
    updatedAt: '2026-08-20T14:05:00.000Z',
    demo: true,
    solutions: [
      {
        id: 'SOL-2026-1001',
        author: 'Jon Bell · Demo contributor',
        body: 'Revoke the full token family, not only the observed refresh token. Rotate the runner identity, rebuild it from a known-good image, and add an egress rule that blocks interactive identity endpoints from build workers.',
        createdAt: '2026-08-18T11:15:00.000Z',
        helpfulCount: 14,
        helpfulByBrowser: false,
        demo: true,
      },
      {
        id: 'SOL-2026-1002',
        author: 'Priya Shah · Demo contributor',
        body: 'Search identity logs for the token family ID and impossible-travel events. Shorten refresh-token lifetime for privileged engineering roles and move package publishing to workload identity federation.',
        createdAt: '2026-08-19T06:40:00.000Z',
        helpfulCount: 9,
        helpfulByBrowser: false,
        demo: true,
      },
    ],
  },
  {
    id: 'INC-2026-0398',
    title: 'Signed invoice lure bypassed mail gateway controls',
    description:
      'A vendor account was compromised and used to send a legitimate-looking invoice thread with a link to a cloned identity portal. One mailbox submitted credentials before the campaign was blocked. No second-factor approval was completed.',
    author: 'Diego M. · Demo responder',
    severity: 'high',
    status: 'resolved',
    category: 'Phishing',
    tags: ['bec', 'identity', 'vendor-risk'],
    affectedSystems: ['mail-gateway', 'finance-mailboxes', 'identity-provider'],
    createdAt: '2026-08-11T12:10:00.000Z',
    updatedAt: '2026-08-13T15:30:00.000Z',
    demo: true,
    solutions: [
      {
        id: 'SOL-2026-0995',
        author: 'Leena Rai · Demo contributor',
        body: 'Quarantine the full conversation cluster using the original message ID, revoke active sessions for recipients, and add the landing domain plus favicon hash to web filtering. Validate payment instructions out of band.',
        createdAt: '2026-08-11T15:50:00.000Z',
        helpfulCount: 21,
        helpfulByBrowser: false,
        demo: true,
      },
    ],
  },
  {
    id: 'INC-2026-0372',
    title: 'Public object store exposed redacted support exports',
    description:
      'A lifecycle migration created a read policy on an archive prefix used for support exports. Redaction had removed payment details, but customer email addresses and internal case identifiers were exposed for approximately six hours.',
    author: 'Morgan Lee · Demo responder',
    severity: 'high',
    status: 'investigating',
    category: 'Data breach',
    tags: ['cloud', 'storage', 'data-exposure'],
    affectedSystems: ['support-export-bucket', 'case-management'],
    createdAt: '2026-08-04T03:45:00.000Z',
    updatedAt: '2026-08-04T10:12:00.000Z',
    demo: true,
    solutions: [],
  },
  {
    id: 'INC-2026-0344',
    title: 'Beaconing traced to an unmanaged browser extension',
    description:
      'Periodic encrypted traffic to a newly registered domain was traced to a sideloaded productivity extension on three analyst workstations. The extension collected browsing metadata but showed no evidence of credential access.',
    author: 'Nadia Torres · Demo responder',
    severity: 'medium',
    status: 'resolved',
    category: 'Malware',
    tags: ['browser', 'endpoint', 'supply-chain'],
    affectedSystems: ['soc-ws-14', 'soc-ws-22', 'soc-ws-31'],
    createdAt: '2026-07-26T17:25:00.000Z',
    updatedAt: '2026-07-28T09:05:00.000Z',
    demo: true,
    solutions: [
      {
        id: 'SOL-2026-0974',
        author: 'Amina K. · Demo responder',
        body: 'Remove the extension by policy, capture its package and network indicators, then enforce an allowlist for browser extensions. Review synchronized browser profiles so the package cannot be restored automatically.',
        createdAt: '2026-07-27T07:20:00.000Z',
        helpfulCount: 11,
        helpfulByBrowser: false,
        demo: true,
      },
    ],
  },
  {
    id: 'INC-2026-0301',
    title: 'DNS tunneling alert caused by misconfigured telemetry agent',
    description:
      'High-entropy DNS queries from a monitoring subnet matched a tunneling signature. Packet review showed an unsigned telemetry agent encoding health checks in labels. The agent was disabled and its deployment pipeline corrected.',
    author: 'Eli Chen · Demo responder',
    severity: 'low',
    status: 'resolved',
    category: 'Network intrusion',
    tags: ['dns', 'false-positive', 'telemetry'],
    affectedSystems: ['monitoring-subnet', 'resolver-cluster'],
    createdAt: '2026-07-10T10:00:00.000Z',
    updatedAt: '2026-07-10T16:40:00.000Z',
    demo: true,
    solutions: [
      {
        id: 'SOL-2026-0921',
        author: 'Jon Bell · Demo contributor',
        body: 'Preserve the detection but suppress only the verified agent binary and destination pair. Add a deployment gate that rejects unsigned monitoring agents and document the expected DNS shape.',
        createdAt: '2026-07-10T13:35:00.000Z',
        helpfulCount: 8,
        helpfulByBrowser: false,
        demo: true,
      },
    ],
  },
];

let lastNotice: string | null = null;

const cloneSeeds = () => SEEDED_INCIDENTS.map(incident => ({
  ...incident,
  tags: [...incident.tags],
  affectedSystems: [...incident.affectedSystems],
  solutions: incident.solutions.map(solution => ({ ...solution })),
}));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function validDate(value: unknown, fallback: string) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function normalizeSolution(value: unknown, index: number, fallbackDate: string): IncidentSolution | null {
  if (!isRecord(value)) return null;
  const body = cleanText(value.body);
  const author = cleanText(value.author);
  if (!body || !author) return null;
  return {
    id: cleanText(value.id, `SOL-RECOVERED-${index + 1}`),
    author,
    body,
    createdAt: validDate(value.createdAt, fallbackDate),
    helpfulCount: typeof value.helpfulCount === 'number' && value.helpfulCount >= 0
      ? Math.floor(value.helpfulCount)
      : 0,
    helpfulByBrowser: value.helpfulByBrowser === true,
    demo: value.demo === true,
  };
}

function normalizeIncident(value: unknown, index: number): CommunityIncident | null {
  if (!isRecord(value)) return null;
  const title = cleanText(value.title);
  const description = cleanText(value.description);
  const author = cleanText(value.author);
  if (!title || !description || !author) return null;
  const createdAt = validDate(value.createdAt, '2026-01-01T00:00:00.000Z');
  const severity: IncidentSeverity = ['critical', 'high', 'medium', 'low'].includes(String(value.severity))
    ? value.severity as IncidentSeverity
    : 'medium';
  const status: IncidentStatus = ['investigating', 'monitoring', 'resolved'].includes(String(value.status))
    ? value.status as IncidentStatus
    : 'investigating';
  const category = INCIDENT_CATEGORIES.includes(value.category as IncidentCategory)
    ? value.category as IncidentCategory
    : 'Other';
  return {
    id: cleanText(value.id, `INC-RECOVERED-${index + 1}`),
    title,
    description,
    author,
    severity,
    status,
    category,
    tags: Array.isArray(value.tags) ? value.tags.map(item => cleanText(item)).filter(Boolean).slice(0, 12) : [],
    affectedSystems: Array.isArray(value.affectedSystems)
      ? value.affectedSystems.map(item => cleanText(item)).filter(Boolean).slice(0, 20)
      : [],
    createdAt,
    updatedAt: validDate(value.updatedAt, createdAt),
    solutions: Array.isArray(value.solutions)
      ? value.solutions.map((solution, solutionIndex) => normalizeSolution(solution, solutionIndex, createdAt)).filter((solution): solution is IncidentSolution => Boolean(solution))
      : [],
    demo: value.demo === true,
  };
}

let incidentCache: CommunityIncident[] = [];
let loading: Promise<CommunityIncident[]> | null = null;

function publishCache(incidents: CommunityIncident[]) {
  incidentCache = incidents.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  lastNotice = null;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(STORE_EVENT));
  return incidentCache;
}

export function getStorageNotice() {
  return lastNotice;
}

export function getIncidents(): CommunityIncident[] {
  return incidentCache;
}

export async function loadIncidents(): Promise<CommunityIncident[]> {
  if (loading) return loading;
  loading = (async () => {
    try {
      let response = await api.get<CommunityIncident[]>('/v1/storage/incidents');
      if (response.data.length === 0) {
        for (const incident of cloneSeeds()) {
          await api.post('/v1/storage/incidents', incident);
          for (const solution of incident.solutions) {
            await api.post(`/v1/storage/incidents/${incident.id}/solutions`, solution);
          }
        }
        response = await api.get<CommunityIncident[]>('/v1/storage/incidents');
      }
      return publishCache(response.data);
    } catch (error) {
      lastNotice = 'The shared incident database is unavailable.';
      throw error;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

function uniqueId(prefix: 'INC' | 'SOL') {
  const stamp = Date.now().toString(36).toUpperCase();
  const entropy = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${entropy}`;
}

function cleanList(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

export async function publishIncident(input: PublishIncidentInput): Promise<CommunityIncident> {
  const title = input.title.trim();
  const description = input.description.trim();
  const author = input.author.trim();
  if (!title || !description || !author) throw new Error('Title, description, and author are required.');
  const now = new Date().toISOString();
  const incident: CommunityIncident = {
    id: uniqueId('INC'),
    title,
    description,
    author,
    severity: input.severity,
    status: input.status,
    category: input.category,
    tags: cleanList(input.tags).slice(0, 12),
    affectedSystems: cleanList(input.affectedSystems).slice(0, 20),
    createdAt: now,
    updatedAt: now,
    solutions: [],
  };
  const response = await api.post<CommunityIncident>('/v1/storage/incidents', incident);
  publishCache([response.data, ...incidentCache]);
  return response.data;
}

export async function updateIncident(id: string, patch: Partial<Pick<CommunityIncident, 'status' | 'severity' | 'tags' | 'affectedSystems'>>): Promise<CommunityIncident> {
  const response = await api.patch<CommunityIncident>(`/v1/storage/incidents/${id}`, patch);
  publishCache(incidentCache.map(item => item.id === id ? response.data : item));
  return response.data;
}

export async function addSolution(incidentId: string, input: { author: string; body: string }): Promise<IncidentSolution> {
  const author = input.author.trim();
  const body = input.body.trim();
  if (!author || !body) throw new Error('Solution and author are required.');
  const solution: IncidentSolution = {
    id: uniqueId('SOL'),
    author,
    body,
    createdAt: new Date().toISOString(),
    helpfulCount: 0,
    helpfulByBrowser: false,
  };
  const response = await api.post<IncidentSolution>(`/v1/storage/incidents/${incidentId}/solutions`, solution);
  publishCache(incidentCache.map(incident => incident.id === incidentId
    ? { ...incident, updatedAt: response.data.createdAt, solutions: [...incident.solutions, response.data] }
    : incident));
  return response.data;
}

export async function markSolutionHelpful(incidentId: string, solutionId: string): Promise<boolean> {
  const incident = incidentCache.find(item => item.id === incidentId);
  const current = incident?.solutions.find(item => item.id === solutionId);
  if (!current || current.helpfulByBrowser) return false;
  const response = await api.post<{ helpfulCount: number }>(`/v1/storage/incidents/${incidentId}/solutions/${solutionId}/helpful`);
  const next = incidentCache.map(item => {
    if (item.id !== incidentId) return item;
    const solutions = item.solutions.map(solution => {
      if (solution.id !== solutionId) return solution;
      return { ...solution, helpfulCount: response.data.helpfulCount, helpfulByBrowser: true };
    });
    return { ...item, solutions, updatedAt: new Date().toISOString() };
  });
  publishCache(next);
  return true;
}

export function filterIncidents(incidents: CommunityIncident[], filters: IncidentFilters) {
  const query = filters.query?.trim().toLowerCase() ?? '';
  return incidents.filter(incident => {
    if (filters.severity && filters.severity !== 'all' && incident.severity !== filters.severity) return false;
    if (filters.status && filters.status !== 'all' && incident.status !== filters.status) return false;
    if (filters.category && filters.category !== 'all' && incident.category !== filters.category) return false;
    if (!query) return true;
    return [incident.id, incident.title, incident.description, incident.author, incident.category, ...incident.tags, ...incident.affectedSystems]
      .some(value => value.toLowerCase().includes(query));
  });
}

export function deriveIncidentAnalytics(incidents: CommunityIncident[]): IncidentAnalytics {
  const resolved = incidents.filter(incident => incident.status === 'resolved').length;
  const solutions = incidents.flatMap(incident => incident.solutions);
  const contributors = new Set([...incidents.map(incident => incident.author), ...solutions.map(solution => solution.author)]);
  const severity = (['critical', 'high', 'medium', 'low'] as IncidentSeverity[]).map(name => ({
    name,
    value: incidents.filter(incident => incident.severity === name).length,
  }));
  const status = (['investigating', 'monitoring', 'resolved'] as IncidentStatus[]).map(name => ({
    name,
    value: incidents.filter(incident => incident.status === name).length,
  }));
  const categoryMap = new Map<string, number>();
  incidents.forEach(incident => categoryMap.set(incident.category, (categoryMap.get(incident.category) ?? 0) + 1));
  const categories = [...categoryMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const activityMap = new Map<string, { incidents: number; resolved: number; solutions: number }>();
  const add = (iso: string, key: 'incidents' | 'resolved' | 'solutions') => {
    const date = iso.slice(0, 10);
    const value = activityMap.get(date) ?? { incidents: 0, resolved: 0, solutions: 0 };
    value[key] += 1;
    activityMap.set(date, value);
  };
  incidents.forEach(incident => {
    add(incident.createdAt, 'incidents');
    if (incident.status === 'resolved') add(incident.updatedAt, 'resolved');
    incident.solutions.forEach(solution => add(solution.createdAt, 'solutions'));
  });
  const activity = [...activityMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, ...value }));
  const contributorMap = new Map<string, { solutions: number; helpful: number }>();
  solutions.forEach(solution => {
    const value = contributorMap.get(solution.author) ?? { solutions: 0, helpful: 0 };
    value.solutions += 1;
    value.helpful += solution.helpfulCount;
    contributorMap.set(solution.author, value);
  });
  return {
    total: incidents.length,
    active: incidents.length - resolved,
    resolved,
    resolutionRate: incidents.length ? Math.round((resolved / incidents.length) * 100) : 0,
    totalSolutions: solutions.length,
    contributors: contributors.size,
    severity,
    status,
    categories,
    activity,
    mostDiscussed: [...incidents].sort((a, b) => b.solutions.length - a.solutions.length || Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 4),
    leadingContributors: [...contributorMap.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.helpful - a.helpful || b.solutions - a.solutions).slice(0, 5),
    latestResolutions: incidents.filter(incident => incident.status === 'resolved').sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 4),
    responseGaps: incidents.filter(incident => incident.status !== 'resolved' && incident.solutions.length === 0).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).slice(0, 4),
  };
}

export function subscribeToIncidents(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(STORE_EVENT, listener);
  return () => {
    window.removeEventListener(STORE_EVENT, listener);
  };
}
import api from './api';
