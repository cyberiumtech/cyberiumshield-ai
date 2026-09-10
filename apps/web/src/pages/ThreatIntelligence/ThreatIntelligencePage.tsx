import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Activity,
  ArrowDownUp,
  Ban,
  BrainCircuit,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FileWarning,
  Filter,
  Globe2,
  History,
  ListChecks,
  Network,
  Radar,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Clock3,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CISA_KEV_INFORMATION_URL,
  CISA_KEV_SOURCE_URL,
  checkThreatIndicator,
  DueStatus,
  extractHttpLinks,
  fetchThreatFeedStatus,
  fetchThreatHistory,
  fetchThreatIntelligenceHealth,
  fetchKevCatalog,
  getDueStatus,
  IndicatorResult,
  isKnownRansomwareUse,
  KevVulnerability,
  parseCatalogDate,
  ThreatFeedStatus,
  ThreatIntelligenceHealth,
} from '../../services/threat-intelligence.service';

/* ─────────────────────────────────────────────────────────────
   FONT STACK
   ───────────────────────────────────────────────────────────── */
const FONT_SANS = "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

type RansomwareFilter = 'all' | 'known' | 'not-known';
type UrgencyFilter = 'all' | DueStatus;
type SortMode = 'newest' | 'deadline' | 'vendor';
type WorkspaceTab = 'investigations' | 'catalog';

/* ─────────────────────────────────────────────────────────────
   SHARED STYLE STRINGS
   ───────────────────────────────────────────────────────────── */
const BTN =
  'inline-flex h-9 items-center justify-center gap-2 border border-white/[0.08] bg-[#0b1424] px-3.5 text-xs font-medium text-slate-300 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_PRIMARY =
  'inline-flex h-9 items-center justify-center gap-2 border border-cyan-500/40 bg-cyan-500/[0.08] px-3.5 text-xs font-medium text-cyan-400 transition hover:border-cyan-400 hover:bg-cyan-500/[0.14] hover:text-cyan-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const FIELD =
  'w-full border border-white/[0.08] bg-[#07101e] px-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16] disabled:opacity-50';

const INPUT = `${FIELD} h-9`;
const LABEL =
  'mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500';

const pageSize = 12;
const numberFormatter = new Intl.NumberFormat();
const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */
function dateValue(value: string) {
  return parseCatalogDate(value)?.getTime() ?? 0;
}

function formatDate(value: string) {
  const date = parseCatalogDate(value);
  return date ? shortDateFormatter.format(date) : 'Not supplied';
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The CISA KEV feed could not be loaded.';
}

function formatCacheAge(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

function formatTimestamp(value: string) {
  if (!value) return 'Timestamp unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : timeFormatter.format(date);
}

function readableLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^\w/, character => character.toUpperCase());
}

function readableValue(value: string | number | boolean | null) {
  if (value === null) return 'Not supplied';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
  return value || 'Not supplied';
}

function dueTone(status: DueStatus) {
  if (status === 'overdue')
    return {
      label: 'Past CISA due date',
      compact: 'Overdue',
      className: 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400',
    };
  if (status === 'due-soon')
    return {
      label: 'Due within 14 days',
      compact: 'Due soon',
      className: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400',
    };
  return {
    label: 'Scheduled later',
    compact: 'Scheduled',
    className: 'border-slate-700 bg-slate-800/60 text-slate-400',
  };
}

function verdictTone(verdict: IndicatorResult['verdict']) {
  if (verdict === 'critical' || verdict === 'high') {
    return {
      stroke: verdict === 'critical' ? '#f43f5e' : '#f97316',
      text: 'text-rose-400',
      pill: 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400',
    };
  }
  if (verdict === 'medium' || verdict === 'inconclusive') {
    return {
      stroke: '#f59e0b',
      text: 'text-amber-400',
      pill: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400',
    };
  }
  return {
    stroke: '#10b981',
    text: 'text-emerald-400',
    pill: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400',
  };
}

function coverageTone(status: IndicatorResult['coverage']['status']) {
  if (status === 'supported') {
    return {
      icon: ShieldCheck,
      className: 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300',
      label: 'Supported coverage',
    };
  }
  if (status === 'partial') {
    return {
      icon: Radar,
      className: 'border-cyan-500/30 bg-cyan-500/[0.06] text-cyan-300',
      label: 'Partial coverage',
    };
  }
  if (status === 'degraded') {
    return {
      icon: AlertTriangle,
      className: 'border-amber-500/30 bg-amber-500/[0.06] text-amber-300',
      label: 'Degraded coverage',
    };
  }
  return {
    icon: CircleAlert,
    className: 'border-amber-500/30 bg-amber-500/[0.08] text-amber-300',
    label: 'Inconclusive evidence',
  };
}

function coverageProviderTone(status: IndicatorResult['coverage']['providers'][number]['status']) {
  if (status === 'contributed') return 'border-emerald-500/40 text-emerald-400';
  if (status === 'no_match') return 'border-slate-700 text-slate-400';
  if (status === 'error') return 'border-amber-500/40 text-amber-400';
  return 'border-slate-700 text-slate-500';
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVES
   ───────────────────────────────────────────────────────────── */
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`border border-white/[0.08] bg-[#0b1424] ${className}`}>{children}</section>
  );
}

function PanelHeader({
  kicker,
  kickerTone = 'slate',
  title,
  hint,
  right,
}: {
  kicker: string;
  kickerTone?: 'slate' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  const tone = {
    slate: 'text-slate-500',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    violet: 'text-violet-400',
  }[kickerTone];

  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className={`font-mono text-[10px] font-medium uppercase tracking-[0.18em] ${tone}`}>
          {kicker}
        </p>
        <h2 className="mt-1 text-[15px] font-semibold text-slate-100">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  copy,
  action,
}: {
  icon: typeof Search;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <Icon className="mx-auto h-6 w-6 text-slate-600" />
      <p className="mt-3 text-sm font-medium text-slate-300">{title}</p>
      <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-slate-500">{copy}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DETAIL DRAWER
   ───────────────────────────────────────────────────────────── */
function DetailPanel({ item, onClose }: { item: KevVulnerability; onClose: () => void }) {
  const ransomware = isKnownRansomwareUse(item.knownRansomwareCampaignUse);
  const due = dueTone(getDueStatus(item.dueDate));
  const links = extractHttpLinks(item.notes);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/80"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="kev-detail-title"
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/[0.08] bg-[#0b1424]"
        onMouseDown={event => event.stopPropagation()}
        style={{ fontFamily: FONT_SANS }}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-white/[0.08] bg-[#0b1424] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-400">
              CISA KEV record
            </p>
            <h2
              id="kev-detail-title"
              className="mt-1 font-mono text-lg font-semibold text-slate-100"
            >
              {item.cveID}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {item.vendorProject || 'Vendor not supplied'} /{' '}
              {item.product || 'Product not supplied'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center border border-white/[0.08] bg-[#0b1424] text-slate-400 transition hover:border-white/[0.16] hover:text-slate-200"
            aria-label="Close details"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-6 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${due.className}`}
            >
              <CalendarClock className="mr-1.5 h-3 w-3" /> {due.label}
            </span>
            <span
              className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${
                ransomware
                  ? 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400'
                  : 'border-slate-700 bg-slate-800/60 text-slate-400'
              }`}
            >
              <Siren className="mr-1.5 h-3 w-3" />
              Ransomware use: {ransomware ? 'known' : item.knownRansomwareCampaignUse || 'not known'}
            </span>
          </div>

          <section>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Vulnerability
            </p>
            <h3 className="mt-1.5 text-base font-semibold leading-6 text-slate-100">
              {item.vulnerabilityName}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {item.shortDescription || 'No description supplied by CISA.'}
            </p>
          </section>

          <section className="border-l-2 border-amber-500 bg-amber-500/[0.04] px-4 py-3">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-amber-400">
              Required action
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {item.requiredAction || 'No action text supplied by CISA.'}
            </p>
          </section>

          <dl className="grid grid-cols-2 gap-px border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3">
            {[
              ['Added to KEV', formatDate(item.dateAdded)],
              ['CISA due date', formatDate(item.dueDate)],
              ['Vendor / project', item.vendorProject || 'Not supplied'],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#07101e] p-3.5">
                <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 text-xs font-medium text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>

          <section>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              CWE classifications
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.cwes.length ? (
                item.cwes.map(cwe => (
                  <span
                    key={cwe}
                    className="border border-cyan-500/30 bg-cyan-500/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-cyan-400"
                  >
                    {cwe}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">None supplied</span>
              )}
            </div>
          </section>

          {item.notes && (
            <section>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                CISA notes
              </p>
              <p className="mt-2 break-words text-xs leading-relaxed text-slate-400">
                {item.notes}
              </p>
              {links.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {links.map((link, index) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-2 border-l border-cyan-500/40 pl-3 text-xs text-cyan-400 hover:text-cyan-300 focus:outline-none focus-visible:text-cyan-300"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" /> Advisory reference {index + 1}
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="flex flex-col gap-2 border-t border-white/[0.08] pt-4 sm:flex-row">
            <a
              href={`https://nvd.nist.gov/vuln/detail/${encodeURIComponent(item.cveID)}`}
              target="_blank"
              rel="noreferrer noopener"
              className={BTN}
            >
              Open NVD record <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={CISA_KEV_INFORMATION_URL}
              target="_blank"
              rel="noreferrer noopener"
              className={BTN}
            >
              Open CISA catalog <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOADING SKELETON
   ───────────────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div className="space-y-5" aria-label="Loading CISA Known Exploited Vulnerabilities">
      <div className="grid grid-cols-2 gap-px border border-white/[0.08] bg-white/[0.06] lg:grid-cols-4">
        {[1, 2, 3, 4].map(item => (
          <div key={item} className="h-24 animate-pulse bg-[#0b1424] p-4">
            <div className="h-3 w-24 bg-white/[0.04]" />
            <div className="mt-4 h-6 w-16 bg-white/[0.04]" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,.7fr)]">
        <div className="space-y-px border border-white/[0.08] bg-[#0b1424] p-5">
          {[1, 2, 3, 4, 5].map(item => (
            <div key={item} className="h-12 animate-pulse bg-white/[0.03]" />
          ))}
        </div>
        <div className="h-64 animate-pulse border border-white/[0.08] bg-[#0b1424]" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SERVICE VISIBILITY
   ───────────────────────────────────────────────────────────── */
function ServiceVisibility({
  health,
  feeds,
  isLoading,
  isError,
}: {
  health?: ThreatIntelligenceHealth;
  feeds?: ThreatFeedStatus;
  isLoading: boolean;
  isError: boolean;
}) {
  const items = [
    {
      label: 'NVD enrichment',
      value: feeds?.nvd.configured || health?.providers.NVD ? 'Available' : 'Unavailable',
      note: 'CVE description and CVSS',
      available: Boolean(feeds?.nvd.configured || health?.providers.NVD),
      icon: Globe2,
    },
    {
      label: 'ThreatFox',
      value:
        feeds?.threatFox.configured || health?.providers.ThreatFox
          ? 'Configured'
          : 'Not configured',
      note: 'IOC match enrichment',
      available: Boolean(feeds?.threatFox.configured || health?.providers.ThreatFox),
      icon: Radar,
    },
    {
      label: 'CISA KEV',
      value: feeds
        ? `${readableLabel(feeds.cisaKEV.status)} / ${numberFormatter.format(feeds.cisaKEV.count)}`
        : 'Checking',
      note: feeds?.cisaKEV.fetchedAt
        ? `Fetched ${formatTimestamp(feeds.cisaKEV.fetchedAt)}`
        : 'Live feed and cache',
      available: Boolean(feeds?.cisaKEV.lastKnownGood || feeds?.cisaKEV.status === 'live'),
      icon: ShieldCheck,
    },
    {
      label: 'URL risk model',
      value: health?.modelLoaded ? 'Loaded' : 'Not loaded',
      note: 'Local URL probability',
      available: Boolean(health?.modelLoaded),
      icon: BrainCircuit,
    },
  ];

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        kicker="Service status"
        kickerTone="slate"
        title="Intelligence providers"
        hint="Provider availability affects what evidence is returned."
        right={<Server className={`h-4 w-4 ${isError ? 'text-rose-400' : 'text-cyan-400'}`} />}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-px bg-white/[0.06] lg:grid-cols-4">
          {[1, 2, 3, 4].map(item => (
            <div key={item} className="h-20 animate-pulse bg-[#0b1424]" />
          ))}
        </div>
      ) : isError && !health && !feeds ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-rose-400">
            Provider status is unavailable while the local service is offline.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-white/[0.06] lg:grid-cols-4">
          {items.map(({ label, value, note, available, icon: Icon }) => (
            <article key={label} className="min-w-0 bg-[#0b1424] px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </p>
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${available ? 'text-emerald-400' : 'text-slate-600'}`}
                />
              </div>
              <p
                className={`mt-2 text-xs font-medium ${available ? 'text-slate-200' : 'text-slate-500'}`}
              >
                {value}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-slate-600" title={note}>
                {note}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5">
        <span className="font-mono text-[9px] font-medium uppercase tracking-wider text-slate-500">
          Coverage key
        </span>
        {(['supported', 'partial', 'degraded', 'inconclusive'] as const).map(status => {
          const tone = coverageTone(status);
          return (
            <span
              key={status}
              className={`border px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider ${tone.className}`}
            >
              {status}
            </span>
          );
        })}
        <span className="text-[10px] text-slate-500">
          Missing evidence is inconclusive — never proof of safety.
        </span>
      </div>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────
   RISK GAUGE — flat SVG ring
   ───────────────────────────────────────────────────────────── */
function RiskGauge({ score, tone }: { score: number; tone: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} className="fill-none stroke-white/[0.06]" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span className="font-mono text-2xl font-semibold leading-none text-slate-100">{score}</span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-slate-500">
          / 100
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   RESULT WORKSPACE
   ───────────────────────────────────────────────────────────── */
function ResultWorkspace({ result }: { result: IndicatorResult }) {
  const tone = verdictTone(result.verdict);
  const coverage = coverageTone(result.coverage.status);
  const CoverageIcon = coverage.icon;
  const { cisaKEV, nvd, threatFox, dns, urlFeatures, mlProbability } = result.details;
  const matches = threatFox?.matches ?? [];

  return (
    <Panel className="overflow-hidden">
      {/* Header: gauge + verdict */}
      <div className="grid gap-5 border-b border-white/[0.08] px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:px-6">
        <RiskGauge score={result.riskScore} tone={tone.stroke} />
        <div className="min-w-0 self-center">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${tone.pill}`}
            >
              {result.verdict === 'inconclusive' ? 'inconclusive' : `${result.verdict} risk`}
            </span>
            <span className="border border-slate-700 bg-slate-800/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {result.indicatorType}
            </span>
          </div>
          <h2
            id="investigation-result-title"
            className="mt-2.5 break-all font-mono text-sm font-semibold leading-6 text-slate-100"
            title={result.indicator}
          >
            {result.indicator}
          </h2>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            Checked {formatTimestamp(result.checkedAt)}
          </p>
        </div>
      </div>

      {/* Coverage banner */}
      <div className={`border-b px-5 py-3.5 sm:px-6 ${coverage.className}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <CoverageIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-semibold">{coverage.label}</h3>
                <span className="border border-current/30 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider">
                  {result.coverage.confidence} confidence
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider opacity-75">
                  {result.coverage.sourcesQueried}/{result.coverage.sourcesExpected} sources
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed opacity-85">
                {result.coverage.summary}
              </p>
            </div>
          </div>
          {result.coverage.providers.length > 0 && (
            <ul className="flex max-w-2xl flex-wrap gap-1.5">
              {result.coverage.providers.map(provider => (
                <li
                  key={`${provider.category}-${provider.name}`}
                  className={`border bg-black/20 px-2 py-1 ${coverageProviderTone(provider.status)}`}
                  title={provider.detail}
                >
                  <span className="block text-[9px] font-medium uppercase tracking-wider">
                    {provider.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] uppercase opacity-75">
                    {readableLabel(provider.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Partial data warnings */}
      {result.providerErrors.length > 0 && (
        <div className="flex items-start gap-2.5 border-b border-amber-500/25 bg-amber-500/[0.04] px-5 py-3 text-xs leading-relaxed text-amber-300 sm:px-6">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Partial data returned</p>
            <ul className="mt-1 space-y-0.5 text-amber-300/80">
              {result.providerErrors.map(error => (
                <li key={error} className="text-[11px]">
                  · {error}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Two column body */}
      <div className="grid gap-px bg-white/[0.06] xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-6 bg-[#0b1424] px-5 py-5 sm:px-6">
          <section>
            <div className="flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-slate-100">Why this score</h3>
            </div>
            {result.reasons.length ? (
              <ol className="mt-3 space-y-2.5">
                {result.reasons.map((reason, index) => (
                  <li key={`${reason}-${index}`} className="flex gap-3 text-xs leading-relaxed text-slate-300">
                    <span className="mt-0.5 font-mono text-[10px] text-cyan-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                No score-changing signals were returned. Review evidence coverage before drawing a
                conclusion.
              </p>
            )}
          </section>

          <section>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Evidence facts
            </p>
            {Object.keys(result.evidence).length ? (
              <dl className="mt-3 grid gap-px border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2">
                {Object.entries(result.evidence).map(([label, value]) => (
                  <div key={label} className="min-w-0 bg-[#07101e] px-3 py-2.5">
                    <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                      {readableLabel(label)}
                    </dt>
                    <dd className="mt-1 break-words font-mono text-[11px] text-slate-200">
                      {readableValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-xs text-slate-500">No provider evidence facts were available.</p>
            )}
          </section>
        </div>

        <div className="space-y-3 bg-[#0b1424] px-5 py-5 sm:px-6">
          <h3 className="text-xs font-semibold text-slate-100">Provider detail</h3>

          {cisaKEV && (
            <section className="border-l-2 border-rose-500 bg-rose-500/[0.04] px-4 py-3">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-rose-400">
                CISA Known Exploited Vulnerability
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-100">
                {cisaKEV.vulnerabilityName}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                {cisaKEV.shortDescription}
              </p>
              <p className="mt-2.5 font-mono text-[10px] font-medium uppercase tracking-wider text-amber-400">
                Required action
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                {cisaKEV.requiredAction || 'No required action supplied.'}
              </p>
            </section>
          )}

          {nvd && (
            <section className="border border-white/[0.08] bg-[#07101e] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-400">
                  NVD
                </p>
                <p className="font-mono text-[11px] text-slate-300">
                  CVSS {nvd.cvssScore ?? 'N/A'} / {nvd.severity || 'unrated'}
                </p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                {nvd.description || 'NVD did not return a description.'}
              </p>
              {nvd.vector && (
                <p className="mt-2 break-all border-l border-slate-700 pl-2.5 font-mono text-[10px] leading-relaxed text-slate-500">
                  {nvd.vector}
                </p>
              )}
              {nvd.references.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                  {nvd.references.slice(0, 4).map((reference, index) => {
                    const href = safeExternalUrl(reference);
                    return href ? (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 focus:outline-none focus-visible:text-cyan-300"
                      >
                        Reference {index + 1}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null;
                  })}
                </div>
              )}
            </section>
          )}

          {threatFox && (
            <section className="border border-white/[0.08] bg-[#07101e] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-400">
                  ThreatFox
                </p>
                <span className="font-mono text-[11px] text-slate-300">
                  {matches.length} match{matches.length === 1 ? '' : 'es'}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                {threatFox.configured
                  ? `Status: ${threatFox.status || 'queried'}`
                  : 'ThreatFox is not configured on this service.'}
              </p>
              {matches.slice(0, 3).map((match, index) => (
                <dl
                  key={index}
                  className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/[0.06] pt-2.5 text-[10px]"
                >
                  {Object.entries(match)
                    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
                    .slice(0, 6)
                    .map(([key, value]) => (
                      <div key={key} className="min-w-0">
                        <dt className="uppercase text-slate-600">{readableLabel(key)}</dt>
                        <dd className="truncate font-mono text-slate-300" title={String(value)}>
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                </dl>
              ))}
            </section>
          )}

          {dns && (
            <section className="border border-white/[0.08] bg-[#07101e] px-4 py-3">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-400">
                DNS / {dns.resolves ? 'resolves' : 'no answer'}
              </p>
              {dns.addresses.length > 0 ? (
                <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-slate-300">
                  {dns.addresses.map(address => (
                    <li key={address} className="break-all">
                      {address}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">
                  No addresses were returned by the resolver.
                </p>
              )}
            </section>
          )}

          {urlFeatures && (
            <section className="border border-white/[0.08] bg-[#07101e] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-400">
                  URL features
                </p>
                <span className="font-mono text-[11px] text-slate-300">
                  {typeof mlProbability === 'number'
                    ? `${(mlProbability * 100).toFixed(1)}% probability`
                    : 'No probability'}
                </span>
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
                {Object.entries(urlFeatures).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[9px] uppercase text-slate-600">{readableLabel(key)}</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-slate-300">
                      {readableValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {!cisaKEV && !nvd && !threatFox && !dns && !urlFeatures && (
            <p className="border border-dashed border-white/[0.08] px-4 py-6 text-center text-[11px] leading-relaxed text-slate-500">
              No provider-specific detail was returned. The score may still reflect deterministic
              indicator checks.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-3xl leading-relaxed">
          The numeric score reflects only observed signals. Coverage and confidence determine
          whether a verdict is supported — no-match evidence is never proof of safety.
        </p>
        <span
          className={`shrink-0 font-mono uppercase tracking-wider ${
            result.model.loaded ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          Model {result.model.loaded ? 'loaded' : 'not loaded'} /{' '}
          {result.model.used ? 'used' : 'not used'}
        </span>
      </div>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────
   INVESTIGATION HISTORY
   ───────────────────────────────────────────────────────────── */
function InvestigationHistory({
  records,
  isLoading,
  error,
  isRefreshing,
  onRefresh,
  onSelect,
}: {
  records: IndicatorResult[];
  isLoading: boolean;
  error: unknown;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSelect: (result: IndicatorResult) => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        kicker="Recent investigations"
        kickerTone="slate"
        title="History"
        hint="Select a stored result to inspect without querying providers again."
        right={
          <button
            type="button"
            className={BTN}
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh history"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {isLoading ? (
        <div className="space-y-px bg-white/[0.06]" aria-label="Loading history">
          {[1, 2, 3].map(item => (
            <div key={item} className="h-12 animate-pulse bg-[#0b1424]" />
          ))}
        </div>
      ) : error ? (
        <div className="px-6 py-10 text-center">
          <FileWarning className="mx-auto h-5 w-5 text-rose-400" />
          <p className="mt-2 text-sm font-medium text-slate-300">History could not be loaded</p>
          <p className="mt-1 text-xs text-slate-500">{errorMessage(error)}</p>
        </div>
      ) : records.length === 0 ? (
        <EmptyBlock
          icon={History}
          title="No stored investigations yet"
          copy="Completed checks will appear here, newest first."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col />
                <col className="w-[80px]" />
                <col className="w-[130px]" />
                <col className="w-[180px]" />
                <col className="w-[140px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.015] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Indicator</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Verdict</th>
                  <th className="px-4 py-2.5 font-medium">Coverage</th>
                  <th className="px-5 py-2.5 font-medium">Checked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {records.map((record, index) => {
                  const tone = verdictTone(record.verdict);
                  const coverage = coverageTone(record.coverage.status);
                  return (
                    <tr
                      key={record.id ?? `${record.indicator}-${record.checkedAt}-${index}`}
                      className="cursor-pointer transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => onSelect(record)}
                          className="block w-full text-left focus:outline-none focus-visible:text-cyan-300"
                        >
                          <span className="block font-mono text-[10px] uppercase tracking-wider text-cyan-400">
                            {record.indicatorType}
                          </span>
                          <span
                            className="mt-0.5 block truncate font-mono text-[11px] text-slate-200"
                            title={record.indicator}
                          >
                            {record.indicator}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-100">
                        {record.riskScore}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${tone.pill}`}
                        >
                          {record.verdict}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${coverage.className}`}
                        >
                          {record.coverage.status} / {record.coverage.confidence}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-[10px] text-slate-500">
                        {formatTimestamp(record.checkedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-white/[0.06] lg:hidden">
            {records.map((record, index) => {
              const tone = verdictTone(record.verdict);
              const coverage = coverageTone(record.coverage.status);
              return (
                <button
                  key={record.id ?? `${record.indicator}-${record.checkedAt}-${index}`}
                  type="button"
                  onClick={() => onSelect(record)}
                  className="block w-full px-5 py-3.5 text-left transition hover:bg-white/[0.02] focus:outline-none focus-visible:bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400">
                      {record.indicatorType}
                    </span>
                    <span
                      className={`border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${tone.pill}`}
                    >
                      {record.riskScore} / {record.verdict}
                    </span>
                  </div>
                  <p
                    className="mt-1.5 truncate font-mono text-xs text-slate-200"
                    title={record.indicator}
                  >
                    {record.indicator}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      {formatTimestamp(record.checkedAt)}
                    </span>
                    <span
                      className={`border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${coverage.className}`}
                    >
                      {record.coverage.status} / {record.coverage.confidence}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ═════════════════════════════════════════════════════════════
   MAIN PAGE
   ═════════════════════════════════════════════════════════════ */
export function ThreatIntelligencePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('investigations');
  const [indicator, setIndicator] = useState('');
  const [inputError, setInputError] = useState('');
  const [activeResult, setActiveResult] = useState<IndicatorResult | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);
  const [search, setSearch] = useState('');
  const [ransomwareFilter, setRansomwareFilter] = useState<RansomwareFilter>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<KevVulnerability | null>(null);

  /* Queries */
  const healthQuery = useQuery({
    queryKey: ['threat-intelligence', 'health'],
    queryFn: ({ signal }) => fetchThreatIntelligenceHealth(signal),
    retry: 1,
    refetchInterval: 30_000,
  });
  const feedsQuery = useQuery({
    queryKey: ['threat-intelligence', 'feeds'],
    queryFn: ({ signal }) => fetchThreatFeedStatus(signal),
    retry: 1,
    refetchInterval: 60_000,
  });
  const historyQuery = useQuery({
    queryKey: ['threat-intelligence', 'history'],
    queryFn: ({ signal }) => fetchThreatHistory(25, signal),
    retry: 1,
  });

  const lookup = useMutation({
    mutationFn: (value: string) => checkThreatIndicator(value, lookupAbortRef.current?.signal),
    onSuccess: result => {
      setActiveResult(result);
      setInputError('');
      void queryClient.invalidateQueries({ queryKey: ['threat-intelligence', 'history'] });
      void queryClient.invalidateQueries({ queryKey: ['threat-intelligence', 'feeds'] });
    },
  });

  const query = useQuery({
    queryKey: ['threat-intelligence', 'cisa-kev'],
    queryFn: ({ signal }) => fetchKevCatalog(signal),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const refresh = useMutation({
    mutationFn: () => fetchKevCatalog(undefined, true),
    onSuccess: catalog => queryClient.setQueryData(['threat-intelligence', 'cisa-kev'], catalog),
  });

  const records = query.data?.vulnerabilities ?? [];
  const now = useMemo(() => new Date(), [query.dataUpdatedAt]);

  /* Catalog metrics */
  const metrics = useMemo(() => {
    const thirtyDaysAgo = now.getTime() - 30 * 86_400_000;
    let addedLast30 = 0;
    let ransomware = 0;
    let overdue = 0;
    let dueSoon = 0;
    records.forEach(item => {
      if (dateValue(item.dateAdded) >= thirtyDaysAgo) addedLast30 += 1;
      if (isKnownRansomwareUse(item.knownRansomwareCampaignUse)) ransomware += 1;
      const status = getDueStatus(item.dueDate, now);
      if (status === 'overdue') overdue += 1;
      if (status === 'due-soon') dueSoon += 1;
    });
    return { total: records.length, addedLast30, ransomware, overdue, dueSoon };
  }, [now, records]);

  /* Trend */
  const trendData = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach(item => {
      const date = parseCatalogDate(item.dateAdded);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, additions]) => ({
        month,
        label: new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' }).format(
          new Date(`${month}-01T00:00:00`)
        ),
        additions,
      }));
  }, [records]);

  /* Top vendors */
  const topVendors = useMemo(() => {
    const vendors = new Map<string, number>();
    records.forEach(item => {
      const vendor = item.vendorProject || 'Not supplied';
      vendors.set(vendor, (vendors.get(vendor) ?? 0) + 1);
    });
    return [...vendors.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 7)
      .map(([vendor, count]) => ({ vendor, count }));
  }, [records]);

  /* Filtering */
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return records
      .filter(item => {
        const ransomware = isKnownRansomwareUse(item.knownRansomwareCampaignUse);
        if (ransomwareFilter === 'known' && !ransomware) return false;
        if (ransomwareFilter === 'not-known' && ransomware) return false;
        if (urgencyFilter !== 'all' && getDueStatus(item.dueDate, now) !== urgencyFilter)
          return false;
        return (
          !needle ||
          [
            item.cveID,
            item.vendorProject,
            item.product,
            item.vulnerabilityName,
            item.shortDescription,
            item.requiredAction,
            ...item.cwes,
          ].some(value => value.toLowerCase().includes(needle))
        );
      })
      .sort((a, b) => {
        if (sortMode === 'deadline')
          return (
            (dateValue(a.dueDate) || Number.MAX_SAFE_INTEGER) -
            (dateValue(b.dueDate) || Number.MAX_SAFE_INTEGER)
          );
        if (sortMode === 'vendor')
          return a.vendorProject.localeCompare(b.vendorProject) || b.cveID.localeCompare(a.cveID);
        return dateValue(b.dateAdded) - dateValue(a.dateAdded) || b.cveID.localeCompare(a.cveID);
      });
  }, [now, ransomwareFilter, records, search, sortMode, urgencyFilter]);

  useEffect(() => setPage(1), [search, ransomwareFilter, urgencyFilter, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const isRefreshing = query.isFetching || refresh.isPending;
  const hasCachedRefreshError = Boolean(
    query.data && (query.isRefetchError || refresh.isError || query.data.sourceStatus === 'stale')
  );

  const sourceState = isRefreshing
    ? {
        label: 'Refreshing',
        className: 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-400',
        dot: 'bg-cyan-500',
      }
    : hasCachedRefreshError
      ? {
          label: 'Cached / refresh failed',
          className: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400',
          dot: 'bg-amber-500',
        }
      : query.data?.sourceStatus === 'cache'
        ? {
            label: 'Validated cache',
            className: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400',
            dot: 'bg-emerald-500',
          }
        : query.data
          ? {
              label: 'Live CISA source',
              className: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400',
              dot: 'bg-emerald-500',
            }
          : {
              label: 'Source unavailable',
              className: 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400',
              dot: 'bg-rose-500',
            };

  const serviceState = healthQuery.isLoading
    ? {
        label: 'Checking service',
        className: 'border-slate-700 bg-slate-800/60 text-slate-400',
        dot: 'bg-slate-500',
      }
    : healthQuery.data?.status === 'ok' && !feedsQuery.isError
      ? {
          label: 'Service live',
          className: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400',
          dot: 'bg-emerald-500',
        }
      : healthQuery.data
        ? {
            label: 'Service degraded',
            className: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400',
            dot: 'bg-amber-500',
          }
        : {
            label: 'Service offline',
            className: 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400',
            dot: 'bg-rose-500',
          };

  /* Lookup submit */
  function submitIndicator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lookup.isPending) return;
    if (!indicator.trim()) {
      setInputError('Enter a CVE, IP, domain, URL, MD5, SHA-1 or SHA-256 indicator.');
      return;
    }
    setInputError('');
    lookup.reset();
    lookupAbortRef.current = new AbortController();
    lookup.mutate(indicator);
  }

  function cancelLookup() {
    lookupAbortRef.current?.abort();
  }

  const lookupError =
    lookup.error instanceof Error
      ? lookup.error.name === 'AbortError'
        ? 'Investigation cancelled.'
        : lookup.error.message
      : lookup.isError
        ? 'The indicator could not be investigated.'
        : '';

  /* ─── RENDER ───────────────────────────────────────────── */
  return (
    <div
      style={{ fontFamily: FONT_SANS }}
      className="relative mx-auto w-full min-w-0 max-w-[1640px] space-y-5 pb-10 text-slate-200"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center border border-white/[0.08] bg-[#0b1424]">
            <ShieldAlert className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Intelligence operations
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Threat Intelligence
            </h1>
            <p className="mt-1 hidden max-w-2xl text-xs leading-relaxed text-slate-500 sm:block">
              Investigate indicators against live providers, local analysis, and the CISA KEV catalog.
            </p>
          </div>
        </div>

        <div
          className={`inline-flex h-9 items-center gap-2 self-start border px-3 font-mono text-[10px] font-medium uppercase tracking-wider ${serviceState.className}`}
          aria-live="polite"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${serviceState.dot}`} /> {serviceState.label}
        </div>
      </header>

      {/* ═══════════════ TABS ═══════════════ */}
      <nav
        className="flex gap-1 overflow-x-auto border-b border-white/[0.08]"
        aria-label="Threat intelligence workspace"
      >
        {(
          [
            ['investigations', 'IOC investigations', Search],
            ['catalog', 'CISA KEV catalog', ShieldAlert],
          ] as const
        ).map(([value, label, Icon]) => {
          const active = activeTab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={`relative inline-flex h-11 shrink-0 items-center gap-2 px-4 text-xs font-medium transition focus:outline-none focus-visible:bg-white/[0.03] ${
                active
                  ? 'text-cyan-400 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-cyan-500'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          );
        })}
      </nav>

      {/* ═══════════════ INVESTIGATIONS TAB ═══════════════ */}
      {activeTab === 'investigations' && (
        <div className="space-y-5">
          <Panel className="overflow-hidden">
            <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="bg-[#0b1424] px-5 py-5 sm:px-6">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-slate-100">Investigate an indicator</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  CVE, IPv4/IPv6, domain, URL, MD5, SHA-1 or SHA-256. Results are persisted locally.
                </p>

                <form className="mt-4" onSubmit={submitIndicator} noValidate>
                  <label htmlFor="threat-indicator" className={LABEL}>
                    Indicator value
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Network className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <input
                        id="threat-indicator"
                        value={indicator}
                        onChange={event => {
                          setIndicator(event.target.value);
                          if (inputError) setInputError('');
                        }}
                        placeholder="CVE-2024-3094 or suspicious.example"
                        className={`${INPUT} h-11 pl-9 font-mono`}
                        disabled={lookup.isPending}
                        aria-invalid={Boolean(inputError || lookupError)}
                        aria-describedby="indicator-help indicator-error"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <button
                      type="submit"
                      className={`${BTN_PRIMARY} h-11 px-5`}
                      disabled={lookup.isPending || !indicator.trim()}
                    >
                      {lookup.isPending ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Checking…
                        </>
                      ) : (
                        <>
                          <Search className="h-3.5 w-3.5" /> Investigate
                        </>
                      )}
                    </button>
                    {lookup.isPending && (
                      <button type="button" className={`${BTN} h-11 px-4`} onClick={cancelLookup}>
                        <Ban className="h-3.5 w-3.5" /> Cancel
                      </button>
                    )}
                  </div>

                  <div
                    id="indicator-help"
                    className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500"
                  >
                    <span className="mr-1 font-mono uppercase tracking-wider">Examples</span>
                    {['CVE-2024-3094', '8.8.8.8', 'example.com', 'https://example.com/login'].map(
                      example => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => {
                            setIndicator(example);
                            setInputError('');
                            lookup.reset();
                          }}
                          disabled={lookup.isPending}
                          className="border border-white/[0.08] bg-[#07101e] px-1.5 py-0.5 font-mono text-slate-400 transition hover:border-cyan-500/40 hover:text-cyan-400 disabled:opacity-50"
                        >
                          {example}
                        </button>
                      )
                    )}
                  </div>

                  <div id="indicator-error" className="mt-3 min-h-4 text-xs" aria-live="assertive">
                    {(inputError || lookupError) && (
                      <p className="flex items-start gap-2 text-rose-400">
                        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {inputError || lookupError}
                      </p>
                    )}
                    {lookup.isPending && (
                      <p className="text-cyan-400">
                        Querying providers. Slow upstream services may take up to 40 seconds.
                      </p>
                    )}
                  </div>
                </form>
              </div>

              <aside className="flex flex-col justify-between bg-[#07101e] px-4 py-5">
                <div>
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                    Analysis path
                  </p>
                  <ol className="mt-3 space-y-2.5 text-xs text-slate-400">
                    <li className="flex gap-2">
                      <span className="font-mono text-cyan-400">01</span> Classify indicator
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-cyan-400">02</span> Collect provider evidence
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-cyan-400">03</span> Score deterministic signals
                    </li>
                  </ol>
                </div>
                <p className="mt-5 border-t border-white/[0.08] pt-3 text-[10px] leading-relaxed text-slate-500">
                  Provider failures are reported as partial-data warnings and do not erase successful
                  evidence.
                </p>
              </aside>
            </div>
          </Panel>

          <div aria-live="polite">
            {activeResult ? (
              <ResultWorkspace result={activeResult} />
            ) : (
              <Panel className="border-dashed bg-[#0b1424]/50 px-5 py-12 text-center">
                <Search className="mx-auto h-6 w-6 text-slate-600" />
                <h2 className="mt-3 text-sm font-medium text-slate-300">Ready to investigate</h2>
                <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-slate-500">
                  Submit an indicator or select a recent investigation to inspect score drivers and
                  provider-specific context.
                </p>
              </Panel>
            )}
          </div>

          <ServiceVisibility
            health={healthQuery.data}
            feeds={feedsQuery.data}
            isLoading={healthQuery.isLoading || feedsQuery.isLoading}
            isError={healthQuery.isError || feedsQuery.isError}
          />

          <InvestigationHistory
            records={historyQuery.data ?? []}
            isLoading={historyQuery.isLoading}
            error={historyQuery.error}
            isRefreshing={historyQuery.isFetching}
            onRefresh={() => void historyQuery.refetch()}
            onSelect={result => {
              setActiveResult(result);
              window.requestAnimationFrame(() =>
                document
                  .getElementById('investigation-result-title')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              );
            }}
          />
        </div>
      )}

      {/* ═══════════════ CATALOG TAB ═══════════════ */}
      {activeTab === 'catalog' && (
        <div className="space-y-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-400">
                CISA KEV evidence
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">
                Known exploitation, prioritized
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Browse confirmed exploitation records, remediation actions, and due dates.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div
                className={`inline-flex h-9 items-center gap-2 border px-3 font-mono text-[10px] font-medium uppercase tracking-wider ${sourceState.className}`}
                aria-live="polite"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${sourceState.dot}`} />{' '}
                {sourceState.label}
              </div>
              <button
                type="button"
                className={BTN}
                onClick={() => refresh.mutate()}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing' : 'Refresh'}
              </button>
            </div>
          </header>

          {/* Catalog metadata strip */}
          {query.data && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
              <span>Catalog {query.data.catalogVersion || 'not supplied'}</span>
              <span>
                Released{' '}
                {query.data.dateReleased ? formatDate(query.data.dateReleased) : 'not supplied'}
              </span>
              <span>Fetched {timeFormatter.format(new Date(query.data.fetchedAt))}</span>
              {query.data.sourceStatus !== 'live' && (
                <span>Cache age {formatCacheAge(query.data.cacheAgeSeconds)}</span>
              )}
              {query.data.declaredCount !== null && query.data.declaredCount !== records.length && (
                <span className="text-amber-400">
                  Source {numberFormatter.format(query.data.declaredCount)} / parsed{' '}
                  {numberFormatter.format(records.length)}
                </span>
              )}
            </div>
          )}

          {/* Warning */}
          {query.data && (query.data.warning || refresh.isError) && (
            <div className="flex items-start gap-2.5 border-l-2 border-amber-500 bg-amber-500/[0.04] px-4 py-3 text-xs leading-relaxed text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>{query.data.warning || `Refresh failed: ${errorMessage(refresh.error)}`}</p>
            </div>
          )}

          {query.isLoading ? (
            <LoadingState />
          ) : query.isError && !query.data ? (
            <Panel className="px-6 py-12 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center border border-rose-500/40 bg-rose-500/[0.08] text-rose-400">
                <FileWarning className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-100">
                CISA KEV is unavailable
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-slate-400">
                {errorMessage(query.error)}
              </p>
              <p className="mx-auto mt-2 max-w-xl text-[11px] leading-relaxed text-slate-500">
                No fabricated records are shown. Access the official catalog directly or retry when
                the source is reachable.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  className={BTN}
                  onClick={() => void query.refetch()}
                  disabled={query.isFetching}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
                <a
                  href={CISA_KEV_INFORMATION_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={BTN}
                >
                  Open CISA catalog <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Panel>
          ) : query.data ? (
            <>
              {hasCachedRefreshError && (
                <div className="flex flex-col gap-3 border border-amber-500/30 bg-amber-500/[0.04] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <p className="text-slate-300">
                      <strong className="font-medium text-amber-400">Showing cached catalog.</strong>{' '}
                      Latest refresh failed: {errorMessage(query.error)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`${BTN} shrink-0`}
                    onClick={() => void query.refetch()}
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-px border border-white/[0.08] bg-white/[0.06] lg:grid-cols-4">
                {[
                  {
                    label: 'Cataloged KEVs',
                    value: metrics.total,
                    note: 'Valid records in current feed',
                    icon: ShieldAlert,
                    tone: 'text-cyan-400',
                  },
                  {
                    label: 'Added / 30 days',
                    value: metrics.addedLast30,
                    note: 'By CISA date added',
                    icon: Clock3,
                    tone: 'text-sky-400',
                  },
                  {
                    label: 'Ransomware use',
                    value: metrics.ransomware,
                    note: 'Marked "Known" by CISA',
                    icon: Siren,
                    tone: 'text-rose-400',
                  },
                  {
                    label: 'Remediation timing',
                    value: metrics.overdue + metrics.dueSoon,
                    note: `${metrics.overdue} past due / ${metrics.dueSoon} due in 14d`,
                    icon: CalendarClock,
                    tone: 'text-amber-400',
                  },
                ].map(({ label, value, note, icon: Icon, tone }) => (
                  <article
                    key={label}
                    className="bg-[#0b1424] px-5 py-4 transition hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        {label}
                      </p>
                      <Icon className={`h-3.5 w-3.5 ${tone}`} />
                    </div>
                    <p className="mt-2.5 font-mono text-2xl font-semibold leading-none tracking-tight text-slate-100">
                      {numberFormatter.format(value)}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-4 text-slate-500">{note}</p>
                  </article>
                ))}
              </div>

              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,.72fr)]">
                {/* Table panel */}
                <Panel className="min-w-0 overflow-hidden">
                  <div className="border-b border-white/[0.08] px-5 py-4">
                    <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                          <h2 className="text-sm font-semibold text-slate-100">
                            Exploitation pulse
                          </h2>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Newest additions to the KEV catalog
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <label className="relative min-w-0 flex-1 sm:min-w-64">
                          <span className="sr-only">Search CISA KEV records</span>
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                          <input
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Search CVE, vendor, product…"
                            className={`${INPUT} pl-9`}
                          />
                        </label>
                        <select
                          value={ransomwareFilter}
                          onChange={event =>
                            setRansomwareFilter(event.target.value as RansomwareFilter)
                          }
                          aria-label="Filter ransomware"
                          className={`${INPUT} w-full cursor-pointer appearance-none pr-8 sm:w-40`}
                        >
                          <option value="all">All ransomware</option>
                          <option value="known">Known use</option>
                          <option value="not-known">Not known</option>
                        </select>
                        <select
                          value={urgencyFilter}
                          onChange={event => setUrgencyFilter(event.target.value as UrgencyFilter)}
                          aria-label="Filter due date"
                          className={`${INPUT} w-full cursor-pointer appearance-none pr-8 sm:w-40`}
                        >
                          <option value="all">All due dates</option>
                          <option value="overdue">Past due</option>
                          <option value="due-soon">Due in 14 days</option>
                          <option value="scheduled">Scheduled later</option>
                        </select>
                        <select
                          value={sortMode}
                          onChange={event => setSortMode(event.target.value as SortMode)}
                          aria-label="Sort vulnerabilities"
                          className={`${INPUT} w-full cursor-pointer appearance-none pr-8 sm:w-36`}
                        >
                          <option value="newest">Newest added</option>
                          <option value="deadline">Due date</option>
                          <option value="vendor">Vendor A-Z</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                      <span>
                        {numberFormatter.format(filtered.length)} visible of{' '}
                        {numberFormatter.format(records.length)}
                      </span>
                      <span className="hidden items-center gap-1 font-mono uppercase tracking-wider sm:flex">
                        <Filter className="h-3 w-3" /> filters
                      </span>
                    </div>
                  </div>

                  {visibleRecords.length ? (
                    <>
                      {/* Desktop table */}
                      <div className="hidden md:block">
                        <table className="w-full table-fixed border-collapse text-left">
                          <colgroup>
                            <col className="w-[140px]" />
                            <col className="w-[180px]" />
                            <col />
                            <col className="w-[140px]" />
                          </colgroup>
                          <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.015] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                              <th className="px-5 py-2.5 font-medium">Added / CVE</th>
                              <th className="px-4 py-2.5 font-medium">Vendor &amp; product</th>
                              <th className="px-4 py-2.5 font-medium">Vulnerability</th>
                              <th className="px-5 py-2.5 font-medium">CISA due</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.05]">
                            {visibleRecords.map(item => {
                              const ransomware = isKnownRansomwareUse(
                                item.knownRansomwareCampaignUse
                              );
                              const due = dueTone(getDueStatus(item.dueDate, now));
                              return (
                                <tr
                                  key={item.cveID}
                                  className="cursor-pointer transition hover:bg-white/[0.025]"
                                  onClick={() => setSelected(item)}
                                >
                                  <td className="px-5 py-3 align-top">
                                    <p className="font-mono text-[10px] text-slate-500">
                                      {formatDate(item.dateAdded)}
                                    </p>
                                    <p className="mt-0.5 font-mono text-[11px] font-medium text-cyan-400">
                                      {item.cveID}
                                    </p>
                                    {ransomware && (
                                      <span className="mt-1.5 inline-block border border-rose-500/40 bg-rose-500/[0.08] px-1 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-rose-400">
                                        Ransomware
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <p
                                      className="truncate text-xs font-medium text-slate-200"
                                      title={item.vendorProject}
                                    >
                                      {item.vendorProject || 'Not supplied'}
                                    </p>
                                    <p
                                      className="mt-0.5 truncate text-[11px] text-slate-500"
                                      title={item.product}
                                    >
                                      {item.product || 'Product not supplied'}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-300">
                                      {item.vulnerabilityName}
                                    </p>
                                  </td>
                                  <td className="px-5 py-3 align-top">
                                    <span
                                      className={`inline-flex border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${due.className}`}
                                    >
                                      {due.compact}
                                    </span>
                                    <p className="mt-1 font-mono text-[10px] text-slate-500">
                                      {formatDate(item.dueDate)}
                                    </p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="divide-y divide-white/[0.06] md:hidden">
                        {visibleRecords.map(item => {
                          const ransomware = isKnownRansomwareUse(item.knownRansomwareCampaignUse);
                          const due = dueTone(getDueStatus(item.dueDate, now));
                          return (
                            <button
                              key={item.cveID}
                              type="button"
                              onClick={() => setSelected(item)}
                              className="block w-full px-5 py-4 text-left transition hover:bg-white/[0.02] focus:outline-none focus-visible:bg-white/[0.03]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-mono text-[10px] text-slate-500">
                                    {formatDate(item.dateAdded)}
                                  </p>
                                  <p className="mt-0.5 font-mono text-[11px] font-medium text-cyan-400">
                                    {item.cveID}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${due.className}`}
                                >
                                  {due.compact}
                                </span>
                              </div>
                              <p className="mt-2 truncate text-[11px] uppercase tracking-wider text-slate-500">
                                {item.vendorProject} / {item.product}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-200">
                                {item.vulnerabilityName}
                              </p>
                              {ransomware && (
                                <span className="mt-2 inline-block border border-rose-500/40 bg-rose-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-rose-400">
                                  Ransomware known
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <EmptyBlock
                      icon={Search}
                      title="No KEV records match these filters"
                      copy="Clear the search or broaden the ransomware and due-date filters."
                      action={
                        <button
                          type="button"
                          className={BTN}
                          onClick={() => {
                            setSearch('');
                            setRansomwareFilter('all');
                            setUrgencyFilter('all');
                          }}
                        >
                          Clear filters
                        </button>
                      }
                    />
                  )}

                  {/* Footer / pagination */}
                  <div className="flex flex-col gap-3 border-t border-white/[0.08] bg-white/[0.015] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {filtered.length
                        ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${numberFormatter.format(filtered.length)}`
                        : '0 results'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-[#0b1424] text-slate-400 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => setPage(value => Math.max(1, value - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[64px] px-2 text-center">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-[#0b1424] text-slate-400 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => setPage(value => Math.min(totalPages, value + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Panel>

                {/* Sidebar */}
                <aside className="space-y-5">
                  <Panel className="overflow-hidden">
                    <PanelHeader
                      kicker="Trend"
                      kickerTone="cyan"
                      title="Catalog additions"
                      hint="Trailing 12 active months"
                      right={<ArrowDownUp className="h-3.5 w-3.5 text-slate-500" />}
                    />
                    <div
                      className="h-56 px-3 pb-4 pt-4"
                      role="img"
                      aria-label="Monthly additions to the CISA KEV catalog"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={trendData}
                          margin={{ top: 5, right: 8, left: -25, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="kev-area" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.2} />
                              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#1e293b" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="#475569"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            stroke="#475569"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip
                            cursor={{ stroke: '#334155' }}
                            contentStyle={{
                              background: '#0b1424',
                              border: '1px solid rgba(148,163,184,0.15)',
                              borderRadius: 0,
                              fontSize: 11,
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="additions"
                            name="KEV additions"
                            stroke="#22d3ee"
                            strokeWidth={1.5}
                            fill="url(#kev-area)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel className="overflow-hidden">
                    <PanelHeader
                      kicker="Vendors"
                      kickerTone="violet"
                      title="Most represented"
                      hint="Count of current catalog records"
                    />
                    <ol className="divide-y divide-white/[0.05]">
                      {topVendors.map((item, index) => {
                        const maximum = topVendors[0]?.count || 1;
                        return (
                          <li key={item.vendor} className="relative overflow-hidden px-5 py-2.5">
                            <span
                              className="absolute inset-y-0 left-0 bg-cyan-500/[0.06]"
                              style={{ width: `${(item.count / maximum) * 100}%` }}
                            />
                            <div className="relative flex items-center gap-3">
                              <span className="w-5 font-mono text-[10px] text-slate-600">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <span
                                className="min-w-0 flex-1 truncate text-xs font-medium text-slate-300"
                                title={item.vendor}
                              >
                                {item.vendor}
                              </span>
                              <span className="font-mono text-xs font-semibold text-cyan-400">
                                {numberFormatter.format(item.count)}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </Panel>
                </aside>
              </div>

              {/* Footer note */}
              <aside className="flex flex-col gap-4 border-t border-white/[0.08] pt-4 text-[11px] leading-relaxed text-slate-500 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex max-w-4xl items-start gap-2.5">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <p>
                    <strong className="font-medium text-slate-300">Methodology.</strong> CISA KEV
                    identifies vulnerabilities with evidence of exploitation in the wild. Counts
                    describe the catalog, not attacks in your environment. "Past due" and "due soon"
                    compare CISA's due date with today; they do not reflect your organization's patch
                    status.
                  </p>
                </div>
                <a
                  href={CISA_KEV_SOURCE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex shrink-0 items-center gap-2 font-medium text-cyan-400 hover:text-cyan-300 focus:outline-none focus-visible:text-cyan-300"
                >
                  Official JSON source <ExternalLink className="h-3 w-3" />
                </a>
              </aside>
            </>
          ) : null}
        </div>
      )}

      {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default ThreatIntelligencePage;