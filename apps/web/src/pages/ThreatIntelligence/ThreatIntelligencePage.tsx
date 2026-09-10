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

type RansomwareFilter = 'all' | 'known' | 'not-known';
type UrgencyFilter = 'all' | DueStatus;
type SortMode = 'newest' | 'deadline' | 'vendor';
type WorkspaceTab = 'investigations' | 'catalog';

const panel = 'border border-white/10 bg-[#0F1729] shadow-[0_24px_70px_-48px_rgba(34,211,238,.45)]';
const control =
  'min-h-10 rounded-[9px] border border-slate-700 bg-[#0B1120] px-3 text-sm text-slate-200 outline-none transition hover:border-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/15';
const button =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-slate-700 bg-[#0B1120] px-3.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/[.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50';
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

function dueTone(status: DueStatus) {
  if (status === 'overdue')
    return {
      label: 'CISA due date passed',
      compact: 'Overdue',
      className: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
    };
  if (status === 'due-soon')
    return {
      label: 'CISA due within 14 days',
      compact: 'Due soon',
      className: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    };
  return {
    label: 'CISA due date scheduled',
    compact: 'Scheduled',
    className: 'border-slate-600 bg-slate-800/60 text-slate-300',
  };
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

function verdictTone(verdict: IndicatorResult['verdict']) {
  if (verdict === 'critical' || verdict === 'high') {
    return {
      ring: verdict === 'critical' ? '#fb7185' : '#f43f5e',
      className: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    };
  }
  if (verdict === 'medium') {
    return { ring: '#fbbf24', className: 'border-amber-400/30 bg-amber-400/10 text-amber-200' };
  }
  return { ring: '#34d399', className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' };
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

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
      className="fixed inset-0 z-50 flex justify-end bg-black/70"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="kev-detail-title"
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-700 bg-[#0B1120] shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-slate-800 bg-[#0B1120]/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
              CISA KEV record
            </p>
            <h2 id="kev-detail-title" className="mt-2 font-mono text-xl font-bold text-slate-100">
              {item.cveID}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {item.vendorProject || 'Vendor not supplied'} /{' '}
              {item.product || 'Product not supplied'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${button} min-w-10 px-0`}
            aria-label="Close vulnerability details"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-7 px-5 py-6 sm:px-7">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${due.className}`}
            >
              <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> {due.label}
            </span>
            <span
              className={`inline-flex items-center border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${ransomware ? 'border-rose-400/30 bg-rose-400/10 text-rose-300' : 'border-slate-700 bg-slate-800/60 text-slate-400'}`}
            >
              <Siren className="mr-1.5 h-3.5 w-3.5" />
              Ransomware use:{' '}
              {ransomware ? 'known' : item.knownRansomwareCampaignUse || 'not known'}
            </span>
          </div>
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Vulnerability
            </p>
            <h3 className="mt-2 text-lg font-semibold leading-7 text-slate-100">
              {item.vulnerabilityName}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {item.shortDescription || 'No description supplied by CISA.'}
            </p>
          </section>
          <section className="border-l-2 border-amber-300 bg-amber-300/[.05] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
              Required action
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-200">
              {item.requiredAction || 'No action text supplied by CISA.'}
            </p>
          </section>
          <dl className="grid grid-cols-2 gap-px overflow-hidden border border-slate-800 bg-slate-800 sm:grid-cols-3">
            {[
              ['Added to KEV', formatDate(item.dateAdded)],
              ['CISA due date', formatDate(item.dueDate)],
              ['Vendor / project', item.vendorProject || 'Not supplied'],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#0F1729] p-4">
                <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="mt-1.5 text-sm font-medium text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              CWE classifications
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.cwes.length ? (
                item.cwes.map(cwe => (
                  <span
                    key={cwe}
                    className="border border-cyan-400/20 bg-cyan-400/[.07] px-2 py-1 font-mono text-[11px] text-cyan-200"
                  >
                    {cwe}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">None supplied</span>
              )}
            </div>
          </section>
          {item.notes && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                CISA notes
              </p>
              <p className="mt-2 break-words text-sm leading-6 text-slate-300">{item.notes}</p>
              {links.length > 0 && (
                <div className="mt-3 space-y-2">
                  {links.map((link, index) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex min-h-10 items-center gap-2 break-all border-l border-cyan-400/40 pl-3 text-xs text-cyan-300 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" /> Advisory reference{' '}
                      {index + 1}
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}
          <div className="flex flex-col gap-2 border-t border-slate-800 pt-5 sm:flex-row">
            <a
              href={`https://nvd.nist.gov/vuln/detail/${encodeURIComponent(item.cveID)}`}
              target="_blank"
              rel="noreferrer noopener"
              className={`${button} border-cyan-400/30 text-cyan-200`}
            >
              Open NVD record <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={CISA_KEV_INFORMATION_URL}
              target="_blank"
              rel="noreferrer noopener"
              className={button}
            >
              Open CISA catalog <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-5" aria-label="Loading CISA Known Exploited Vulnerabilities">
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-slate-800 bg-slate-800 lg:grid-cols-4">
        {[1, 2, 3, 4].map(item => (
          <div key={item} className="h-28 animate-pulse bg-[#0F1729] p-4">
            <div className="h-3 w-24 bg-slate-800" />
            <div className="mt-5 h-7 w-16 bg-slate-800" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,.7fr)]">
        <div className={`${panel} space-y-px p-5`}>
          {[1, 2, 3, 4, 5].map(item => (
            <div key={item} className="h-16 animate-pulse bg-slate-800/50" />
          ))}
        </div>
        <div className={`${panel} h-80 animate-pulse rounded-[14px]`} />
      </div>
    </div>
  );
}

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
      value: feeds?.threatFox.configured || health?.providers.ThreatFox ? 'Configured' : 'Not configured',
      note: 'IOC match enrichment',
      available: Boolean(feeds?.threatFox.configured || health?.providers.ThreatFox),
      icon: Radar,
    },
    {
      label: 'CISA KEV',
      value: feeds ? `${readableLabel(feeds.cisaKEV.status)} · ${numberFormatter.format(feeds.cisaKEV.count)}` : 'Checking',
      note: feeds?.cisaKEV.fetchedAt ? `Fetched ${formatTimestamp(feeds.cisaKEV.fetchedAt)}` : 'Live feed and cache',
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
    <section className={`${panel} overflow-hidden rounded-[14px]`} aria-labelledby="service-visibility-title">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
        <div>
          <h2 id="service-visibility-title" className="text-sm font-semibold text-slate-100">
            Intelligence service visibility
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Provider availability can change the evidence returned.</p>
        </div>
        <Server className={`h-4 w-4 ${isError ? 'text-rose-300' : 'text-cyan-300'}`} />
      </header>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-px bg-slate-800 lg:grid-cols-4" aria-label="Loading provider status">
          {[1, 2, 3, 4].map(item => <div key={item} className="h-24 animate-pulse bg-[#0F1729]" />)}
        </div>
      ) : isError && !health && !feeds ? (
        <p className="px-5 py-5 text-sm text-rose-200">Provider status is unavailable while the local service is offline.</p>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-slate-800 lg:grid-cols-4">
          {items.map(({ label, value, note, available, icon: Icon }) => (
            <article key={label} className="min-w-0 bg-[#0F1729] px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</p>
                <Icon className={`h-3.5 w-3.5 shrink-0 ${available ? 'text-emerald-300' : 'text-amber-300'}`} />
              </div>
              <p className={`mt-2 text-xs font-semibold ${available ? 'text-slate-200' : 'text-amber-200'}`}>{value}</p>
              <p className="mt-1 truncate text-[10px] text-slate-500" title={note}>{note}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ResultWorkspace({ result }: { result: IndicatorResult }) {
  const tone = verdictTone(result.verdict);
  const { cisaKEV, nvd, threatFox, dns, urlFeatures, mlProbability } = result.details;
  const matches = threatFox?.matches ?? [];

  return (
    <section className={`${panel} overflow-hidden rounded-[14px]`} aria-labelledby="investigation-result-title">
      <header className="grid gap-5 border-b border-slate-800 px-4 py-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:px-6">
        <div
          className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${tone.ring} ${result.riskScore}%, #1e293b ${result.riskScore}% 100%)` }}
          aria-label={`Risk score ${result.riskScore} out of 100`}
        >
          <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-[#0F1729]">
            <span className="font-mono text-3xl font-bold text-slate-100">{result.riskScore}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">of 100</span>
          </div>
        </div>
        <div className="min-w-0 self-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone.className}`}>
              {result.verdict} risk
            </span>
            <span className="border border-slate-700 bg-slate-900/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {result.indicatorType}
            </span>
          </div>
          <h2 id="investigation-result-title" className="mt-3 break-all font-mono text-base font-bold leading-6 text-slate-100" title={result.indicator}>
            {result.indicator}
          </h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">Checked {formatTimestamp(result.checkedAt)}</p>
        </div>
      </header>

      {result.providerErrors.length > 0 && (
        <aside className="flex items-start gap-2.5 border-b border-amber-400/20 bg-amber-400/[.06] px-4 py-3 text-xs leading-5 text-amber-100 sm:px-6" aria-label="Partial provider warnings">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <p className="font-semibold">Partial data returned</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-100/80">
              {result.providerErrors.map(error => <li key={error}>{error}</li>)}
            </ul>
          </div>
        </aside>
      )}

      <div className="grid gap-px bg-slate-800 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-6 bg-[#0F1729] px-4 py-5 sm:px-6">
          <section aria-labelledby="reasons-title">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-cyan-300" />
              <h3 id="reasons-title" className="text-sm font-semibold text-slate-100">Assessment reasons</h3>
            </div>
            {result.reasons.length ? (
              <ol className="mt-3 space-y-3">
                {result.reasons.map((reason, index) => (
                  <li key={`${reason}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-300">
                    <span className="mt-0.5 font-mono text-[10px] text-cyan-300">{String(index + 1).padStart(2, '0')}</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-3 text-sm leading-6 text-slate-500">No score-changing signals were returned for this indicator.</p>}
          </section>
          <section aria-labelledby="evidence-title">
            <h3 id="evidence-title" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Evidence facts</h3>
            {Object.keys(result.evidence).length ? (
              <dl className="mt-3 grid gap-px overflow-hidden border border-slate-800 bg-slate-800 sm:grid-cols-2">
                {Object.entries(result.evidence).map(([label, value]) => (
                  <div key={label} className="min-w-0 bg-[#0B1120] px-3 py-3">
                    <dt className="text-[9px] uppercase tracking-wider text-slate-500">{readableLabel(label)}</dt>
                    <dd className="mt-1 break-words font-mono text-xs text-slate-200">{readableValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="mt-2 text-sm text-slate-500">No provider evidence facts were available.</p>}
          </section>
        </div>

        <div className="space-y-4 bg-[#0B1120] px-4 py-5 sm:px-6">
          <h3 className="text-sm font-semibold text-slate-100">Provider detail</h3>
          {cisaKEV && (
            <section className="border-l-2 border-rose-400 bg-rose-400/[.055] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-rose-300">CISA Known Exploited Vulnerability</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{cisaKEV.vulnerabilityName}</p>
              <p className="mt-2 text-xs leading-5 text-slate-300">{cisaKEV.shortDescription}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-amber-300">Required action</p>
              <p className="mt-1 text-xs leading-5 text-slate-200">{cisaKEV.requiredAction || 'No required action supplied.'}</p>
            </section>
          )}
          {nvd && (
            <section className="border border-slate-800 bg-[#0F1729] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300">NVD</p>
                <p className="font-mono text-xs text-slate-300">CVSS {nvd.cvssScore ?? 'N/A'} · {nvd.severity || 'unrated'}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">{nvd.description || 'NVD did not return a description.'}</p>
              {nvd.vector && <p className="mt-3 break-all border-l border-slate-700 pl-3 font-mono text-[10px] leading-5 text-slate-400">{nvd.vector}</p>}
              {nvd.references.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {nvd.references.slice(0, 4).map((reference, index) => {
                    const href = safeExternalUrl(reference);
                    return href ? <a key={href} href={href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Reference {index + 1}<ExternalLink className="h-3 w-3" /></a> : null;
                  })}
                </div>
              )}
            </section>
          )}
          {threatFox && (
            <section className="border border-slate-800 bg-[#0F1729] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300">ThreatFox</p>
                <span className="font-mono text-xs text-slate-300">{matches.length} match{matches.length === 1 ? '' : 'es'}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{threatFox.configured ? `Provider status: ${threatFox.status || 'queried'}` : 'ThreatFox is not configured on this service.'}</p>
              {matches.slice(0, 3).map((match, index) => (
                <dl key={index} className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-800 pt-3 text-[10px]">
                  {Object.entries(match).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="min-w-0"><dt className="uppercase text-slate-600">{readableLabel(key)}</dt><dd className="truncate font-mono text-slate-300" title={String(value)}>{String(value)}</dd></div>
                  ))}
                </dl>
              ))}
            </section>
          )}
          {dns && (
            <section className="border border-slate-800 bg-[#0F1729] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300">DNS resolution · {dns.resolves ? 'resolves' : 'no answer'}</p>
              {dns.addresses.length > 0 ? <ul className="mt-2 space-y-1 font-mono text-xs text-slate-300">{dns.addresses.map(address => <li key={address} className="break-all">{address}</li>)}</ul> : <p className="mt-2 text-xs text-slate-500">No addresses were returned by the service resolver.</p>}
            </section>
          )}
          {urlFeatures && (
            <section className="border border-slate-800 bg-[#0F1729] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300">URL feature analysis</p>
                <span className="font-mono text-xs text-slate-300">{typeof mlProbability === 'number' ? `${(mlProbability * 100).toFixed(1)}% model probability` : 'No probability'}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                {Object.entries(urlFeatures).map(([key, value]) => <div key={key}><dt className="text-[9px] uppercase text-slate-600">{readableLabel(key)}</dt><dd className="mt-0.5 font-mono text-xs text-slate-300">{readableValue(value)}</dd></div>)}
              </dl>
            </section>
          )}
          {!cisaKEV && !nvd && !threatFox && !dns && !urlFeatures && (
            <p className="border border-dashed border-slate-700 px-4 py-6 text-sm leading-6 text-slate-500">No provider-specific detail was returned. The score may still reflect deterministic indicator checks.</p>
          )}
        </div>
      </div>
      <footer className="flex flex-col gap-2 border-t border-slate-800 bg-[#0F1729] px-4 py-3 text-xs leading-5 text-slate-500 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <p className="max-w-3xl">This evidence-weighted score supports analyst triage; it is not a guarantee that an indicator is malicious or safe.</p>
        <span className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${result.model.loaded ? 'text-emerald-300' : 'text-amber-300'}`}>Model {result.model.loaded ? 'loaded' : 'not loaded'} · {result.model.used ? 'used' : 'not used'}</span>
      </footer>
    </section>
  );
}

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
    <section className={`${panel} overflow-hidden rounded-[14px]`} aria-labelledby="investigation-history-title">
      <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-4 py-4 sm:px-5">
        <div>
          <div className="flex items-center gap-2"><History className="h-4 w-4 text-cyan-300" /><h2 id="investigation-history-title" className="text-sm font-semibold text-slate-100">Recent investigations</h2></div>
          <p className="mt-1 text-xs text-slate-500">Select a stored result to inspect it without querying providers again.</p>
        </div>
        <button type="button" className={`${button} min-h-9 shrink-0 px-2.5`} onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh investigation history"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span></button>
      </header>
      {isLoading ? (
        <div className="space-y-px bg-slate-800" aria-label="Loading recent investigations">{[1, 2, 3].map(item => <div key={item} className="h-14 animate-pulse bg-[#0F1729]" />)}</div>
      ) : error ? (
        <div className="px-5 py-8 text-center"><FileWarning className="mx-auto h-5 w-5 text-rose-300" /><p className="mt-2 text-sm font-semibold text-slate-200">History could not be loaded</p><p className="mt-1 text-xs text-slate-500">{errorMessage(error)}</p></div>
      ) : records.length === 0 ? (
        <div className="px-5 py-9 text-center"><History className="mx-auto h-6 w-6 text-slate-600" /><p className="mt-3 text-sm font-semibold text-slate-300">No stored investigations yet</p><p className="mt-1 text-xs text-slate-500">Completed checks will appear here, newest first.</p></div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead className="bg-[#0B1120] font-mono text-[9px] uppercase tracking-[0.13em] text-slate-500"><tr><th className="px-4 py-3 font-medium">Type / indicator</th><th className="px-4 py-3 font-medium">Score</th><th className="px-4 py-3 font-medium">Verdict</th><th className="px-4 py-3 font-medium">Checked</th></tr></thead>
              <tbody className="divide-y divide-slate-800">{records.map((record, index) => { const tone = verdictTone(record.verdict); return <tr key={record.id ?? `${record.indicator}-${record.checkedAt}-${index}`} className="hover:bg-cyan-300/[.025]"><td className="max-w-md px-4 py-3"><button type="button" onClick={() => onSelect(record)} className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><span className="block text-[9px] font-bold uppercase tracking-wider text-cyan-300">{record.indicatorType}</span><span className="mt-1 block truncate font-mono text-xs text-slate-200" title={record.indicator}>{record.indicator}</span></button></td><td className="px-4 py-3 font-mono text-sm font-bold text-slate-100">{record.riskScore}</td><td className="px-4 py-3"><span className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${tone.className}`}>{record.verdict}</span></td><td className="px-4 py-3 font-mono text-[10px] text-slate-500">{formatTimestamp(record.checkedAt)}</td></tr>; })}</tbody>
            </table>
          </div>
          <div className="divide-y divide-slate-800 md:hidden">{records.map((record, index) => { const tone = verdictTone(record.verdict); return <button key={record.id ?? `${record.indicator}-${record.checkedAt}-${index}`} type="button" onClick={() => onSelect(record)} className="block w-full px-4 py-4 text-left hover:bg-cyan-300/[.025] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"><span className="flex items-center justify-between gap-3"><span className="text-[9px] font-bold uppercase tracking-wider text-cyan-300">{record.indicatorType}</span><span className={`border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tone.className}`}>{record.riskScore} · {record.verdict}</span></span><span className="mt-2 block truncate font-mono text-xs text-slate-200" title={record.indicator}>{record.indicator}</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-slate-600">{formatTimestamp(record.checkedAt)}</span></button>; })}</div>
        </>
      )}
    </section>
  );
}

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

  const metrics = useMemo(() => {
    const thirtyDaysAgo = now.getTime() - 30 * 86_400_000;
    let addedLast30 = 0,
      ransomware = 0,
      overdue = 0,
      dueSoon = 0;
    records.forEach(item => {
      if (dateValue(item.dateAdded) >= thirtyDaysAgo) addedLast30 += 1;
      if (isKnownRansomwareUse(item.knownRansomwareCampaignUse)) ransomware += 1;
      const status = getDueStatus(item.dueDate, now);
      if (status === 'overdue') overdue += 1;
      if (status === 'due-soon') dueSoon += 1;
    });
    return { total: records.length, addedLast30, ransomware, overdue, dueSoon };
  }, [now, records]);

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
        label: 'Refreshing source',
        className: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300',
        dot: 'bg-cyan-300 motion-safe:animate-pulse',
      }
    : hasCachedRefreshError
      ? {
          label: 'Cached · refresh failed',
          className: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
          dot: 'bg-amber-300',
        }
      : query.data?.sourceStatus === 'cache'
        ? {
            label: 'Validated cache',
            className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
            dot: 'bg-emerald-300',
          }
        : query.data
          ? {
              label: 'Live CISA source',
              className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
              dot: 'bg-emerald-300',
            }
          : {
              label: 'Source unavailable',
              className: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
              dot: 'bg-rose-300',
            };

  const serviceState = healthQuery.isLoading
    ? { label: 'Checking service', className: 'border-slate-700 bg-slate-800/70 text-slate-300', dot: 'bg-slate-400 animate-pulse' }
    : healthQuery.data?.status === 'ok' && !feedsQuery.isError
      ? { label: 'Service live', className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200', dot: 'bg-emerald-300' }
      : healthQuery.data
        ? { label: 'Service degraded', className: 'border-amber-400/25 bg-amber-400/10 text-amber-200', dot: 'bg-amber-300' }
        : { label: 'Service offline', className: 'border-rose-400/25 bg-rose-400/10 text-rose-200', dot: 'bg-rose-300' };

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

  const lookupError = lookup.error instanceof Error
    ? lookup.error.name === 'AbortError'
      ? 'Investigation cancelled.'
      : lookup.error.message
    : lookup.isError
      ? 'The indicator could not be investigated.'
      : '';

  return (
    <div className="relative space-y-5">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-64 opacity-50 [background-image:linear-gradient(rgba(34,211,238,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.025)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <header className="relative flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Intelligence operations / Evidence workbench
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            Threat Intelligence
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Investigate indicators against live providers, local analysis, persisted evidence, and
            the CISA Known Exploited Vulnerabilities catalog.
          </p>
        </div>
        <div className={`inline-flex min-h-10 items-center gap-2 self-start border px-3 text-xs font-semibold lg:self-auto ${serviceState.className}`} aria-live="polite">
          <span className={`h-2 w-2 rounded-full ${serviceState.dot}`} /> {serviceState.label}
        </div>
      </header>

      <nav className="relative flex w-full border-b border-slate-800" aria-label="Threat intelligence workspace">
        {([
          ['investigations', 'IOC investigations', Search],
          ['catalog', 'CISA KEV catalog', ShieldAlert],
        ] as const).map(([value, label, Icon]) => (
          <button key={value} type="button" onClick={() => setActiveTab(value)} className={`relative inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-3 text-xs font-semibold transition sm:flex-none sm:justify-start ${activeTab === value ? 'text-cyan-200' : 'text-slate-500 hover:text-slate-300'} focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300`} aria-current={activeTab === value ? 'page' : undefined}>
            <Icon className="h-4 w-4" /> {label}
            {activeTab === value && <span className="absolute inset-x-0 -bottom-px h-px bg-cyan-300" />}
          </button>
        ))}
      </nav>

      {activeTab === 'investigations' && (
        <div className="relative space-y-5">
          <section className={`${panel} overflow-hidden rounded-[14px]`} aria-labelledby="indicator-composer-title">
            <div className="grid gap-px bg-slate-800 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="bg-[#0F1729] px-4 py-5 sm:px-6">
                <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-300" /><h2 id="indicator-composer-title" className="text-base font-semibold text-slate-100">Investigate an indicator</h2></div>
                <p className="mt-1 text-xs leading-5 text-slate-500">CVE, IPv4/IPv6, domain, URL, MD5, SHA-1 or SHA-256. Results are persisted locally.</p>
                <form className="mt-4" onSubmit={submitIndicator} noValidate>
                  <label htmlFor="threat-indicator" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Indicator value</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Network className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                      <input id="threat-indicator" value={indicator} onChange={event => { setIndicator(event.target.value); if (inputError) setInputError(''); }} placeholder="CVE-2024-3094 or suspicious.example" className={`${control} h-12 w-full pl-10 font-mono`} disabled={lookup.isPending} aria-invalid={Boolean(inputError || lookupError)} aria-describedby="indicator-help indicator-error" autoComplete="off" spellCheck={false} />
                    </div>
                    <button type="submit" className={`${button} h-12 border-cyan-400/35 bg-cyan-400/[.08] px-5 text-cyan-100`} disabled={lookup.isPending || !indicator.trim()}>
                      {lookup.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" /> Checking providers</> : <><Search className="h-4 w-4" /> Run investigation</>}
                    </button>
                    {lookup.isPending && <button type="button" className={`${button} h-12 px-4`} onClick={cancelLookup}><Ban className="h-4 w-4" /> Cancel</button>}
                  </div>
                  <div id="indicator-help" className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    <span className="mr-1 font-mono uppercase tracking-wider">Examples</span>
                    {['CVE-2024-3094', '8.8.8.8', 'example.com', 'https://example.com/login'].map(example => <button key={example} type="button" onClick={() => { setIndicator(example); setInputError(''); lookup.reset(); }} disabled={lookup.isPending} className="border border-slate-700 bg-[#0B1120] px-2 py-1 font-mono text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50">{example}</button>)}
                  </div>
                  <div id="indicator-error" className="mt-3 min-h-5 text-xs" aria-live="assertive">
                    {(inputError || lookupError) && <p className="flex items-start gap-2 text-rose-300"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{inputError || lookupError}</p>}
                    {lookup.isPending && <p className="text-cyan-300">Querying applicable providers. Slow upstream services may take up to 20 seconds.</p>}
                  </div>
                </form>
              </div>
              <aside className="flex flex-col justify-between bg-[#0B1120] px-4 py-5">
                <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Analysis path</p><ol className="mt-3 space-y-3 text-xs text-slate-400"><li className="flex gap-2"><span className="font-mono text-cyan-300">01</span>Classify indicator</li><li className="flex gap-2"><span className="font-mono text-cyan-300">02</span>Collect provider evidence</li><li className="flex gap-2"><span className="font-mono text-cyan-300">03</span>Score deterministic signals</li></ol></div>
                <p className="mt-5 border-t border-slate-800 pt-3 text-[10px] leading-4 text-slate-600">Provider failures are reported as partial-data warnings and do not erase successful evidence.</p>
              </aside>
            </div>
          </section>

          <div aria-live="polite">{activeResult ? <ResultWorkspace result={activeResult} /> : <section className="border border-dashed border-slate-700 bg-[#0F1729]/50 px-5 py-8 text-center"><Search className="mx-auto h-6 w-6 text-slate-600" /><h2 className="mt-3 text-sm font-semibold text-slate-300">Evidence workspace ready</h2><p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500">Submit an indicator or select a recent investigation to inspect score drivers and provider-specific context.</p></section>}</div>

          <ServiceVisibility health={healthQuery.data} feeds={feedsQuery.data} isLoading={healthQuery.isLoading || feedsQuery.isLoading} isError={healthQuery.isError || feedsQuery.isError} />
          <InvestigationHistory records={historyQuery.data ?? []} isLoading={historyQuery.isLoading} error={historyQuery.error} isRefreshing={historyQuery.isFetching} onRefresh={() => void historyQuery.refetch()} onSelect={result => { setActiveResult(result); window.requestAnimationFrame(() => document.getElementById('investigation-result-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }} />
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="relative space-y-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">CISA KEV evidence</p><h2 className="mt-1 text-xl font-bold text-slate-100">Known exploitation, prioritized.</h2><p className="mt-1 text-sm text-slate-500">Browse confirmed exploitation records, remediation actions, and due dates.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className={`inline-flex min-h-10 items-center gap-2 border px-3 text-xs font-semibold ${sourceState.className}`} aria-live="polite"><span className={`h-2 w-2 rounded-full ${sourceState.dot}`} /> {sourceState.label}</div><button type="button" className={button} onClick={() => refresh.mutate()} disabled={isRefreshing} aria-label="Refresh CISA KEV data"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />{isRefreshing ? 'Refreshing' : 'Refresh feed'}</button></div>
          </header>

      {query.data && (
        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
          <span>Catalog {query.data.catalogVersion || 'version not supplied'}</span>
          <span>
            Released{' '}
            {query.data.dateReleased ? formatDate(query.data.dateReleased) : 'not supplied'}
          </span>
          <span>Fetched by service {timeFormatter.format(new Date(query.data.fetchedAt))}</span>
          {query.data.sourceStatus !== 'live' && (
            <span>Cache age {formatCacheAge(query.data.cacheAgeSeconds)}</span>
          )}
          {query.data.declaredCount !== null && query.data.declaredCount !== records.length && (
            <span className="text-amber-300">
              Source count {numberFormatter.format(query.data.declaredCount)} · parsed{' '}
              {numberFormatter.format(records.length)}
            </span>
          )}
        </div>
      )}

      {query.data && (query.data.warning || refresh.isError) && (
        <div className="relative flex items-start gap-2.5 border-l-2 border-amber-400 bg-amber-400/[.06] px-4 py-3 text-xs leading-5 text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{query.data.warning || `Refresh failed: ${errorMessage(refresh.error)}`}</p>
        </div>
      )}

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError && !query.data ? (
        <section
          className={`${panel} relative overflow-hidden rounded-[14px] px-5 py-12 text-center sm:px-8`}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center border border-rose-400/25 bg-rose-400/10 text-rose-300">
            <FileWarning className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-slate-100">CISA KEV is unavailable</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
            {errorMessage(query.error)}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500">
            No fabricated or bundled vulnerability records are shown. Access the official catalog
            directly or retry when the source is reachable.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              className={button}
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className="h-4 w-4" /> Retry source
            </button>
            <a
              href={CISA_KEV_INFORMATION_URL}
              target="_blank"
              rel="noreferrer noopener"
              className={button}
            >
              Open CISA catalog <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>
      ) : query.data ? (
        <>
          {hasCachedRefreshError && (
            <section className="flex flex-col gap-3 border border-amber-400/25 bg-amber-400/[.06] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <p className="text-slate-300">
                  <strong className="font-semibold text-amber-200">Showing cached catalog.</strong>{' '}
                  The latest refresh failed: {errorMessage(query.error)}
                </p>
              </div>
              <button
                type="button"
                className={`${button} shrink-0`}
                onClick={() => void query.refetch()}
              >
                Try again
              </button>
            </section>
          )}

          <section
            className="grid grid-cols-2 gap-px overflow-hidden border border-slate-800 bg-slate-800 lg:grid-cols-4"
            aria-label="CISA KEV evidence summary"
          >
            {[
              {
                label: 'Cataloged KEVs',
                value: metrics.total,
                note: 'Valid records in current feed',
                icon: ShieldAlert,
                tone: 'text-cyan-300',
              },
              {
                label: 'Added · 30 days',
                value: metrics.addedLast30,
                note: 'By CISA date added',
                icon: Clock3,
                tone: 'text-sky-300',
              },
              {
                label: 'Ransomware use',
                value: metrics.ransomware,
                note: 'Marked “Known” by CISA',
                icon: Siren,
                tone: 'text-rose-300',
              },
              {
                label: 'Remediation timing',
                value: metrics.overdue + metrics.dueSoon,
                note: `${numberFormatter.format(metrics.overdue)} past due · ${numberFormatter.format(metrics.dueSoon)} due in 14d`,
                icon: CalendarClock,
                tone: 'text-amber-300',
              },
            ].map(({ label, value, note, icon: Icon, tone }) => (
              <article
                key={label}
                className="group bg-[#0F1729] px-4 py-4 transition hover:bg-cyan-400/[.025] sm:px-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                    {label}
                  </p>
                  <Icon className={`h-4 w-4 ${tone}`} />
                </div>
                <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-slate-100">
                  {numberFormatter.format(value)}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{note}</p>
              </article>
            ))}
          </section>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,.72fr)]">
            <section className={`${panel} min-w-0 overflow-hidden rounded-[14px]`}>
              <div className="border-b border-slate-800 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,.9)] motion-safe:animate-pulse" />
                      <h2 className="text-base font-semibold text-slate-100">Exploitation pulse</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Dated additions to the public KEV catalog · newest first
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <label className="relative min-w-0 flex-1 sm:min-w-64">
                      <span className="sr-only">Search CISA KEV records</span>
                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <input
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Search CVE, vendor, product…"
                        className={`${control} w-full pl-9`}
                      />
                    </label>
                    <label>
                      <span className="sr-only">Filter ransomware campaign use</span>
                      <select
                        value={ransomwareFilter}
                        onChange={event =>
                          setRansomwareFilter(event.target.value as RansomwareFilter)
                        }
                        className={`${control} w-full sm:w-40`}
                      >
                        <option value="all">All ransomware</option>
                        <option value="known">Known use</option>
                        <option value="not-known">Not known</option>
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Filter by CISA due date</span>
                      <select
                        value={urgencyFilter}
                        onChange={event => setUrgencyFilter(event.target.value as UrgencyFilter)}
                        className={`${control} w-full sm:w-40`}
                      >
                        <option value="all">All due dates</option>
                        <option value="overdue">Past due</option>
                        <option value="due-soon">Due in 14 days</option>
                        <option value="scheduled">Scheduled later</option>
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Sort vulnerabilities</span>
                      <select
                        value={sortMode}
                        onChange={event => setSortMode(event.target.value as SortMode)}
                        className={`${control} w-full sm:w-36`}
                      >
                        <option value="newest">Newest added</option>
                        <option value="deadline">Due date</option>
                        <option value="vendor">Vendor A–Z</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                  <span>
                    {numberFormatter.format(filtered.length)} visible of{' '}
                    {numberFormatter.format(records.length)}
                  </span>
                  <span className="hidden items-center gap-1 font-mono uppercase tracking-wider sm:flex">
                    <Filter className="h-3 w-3" /> analyst filters
                  </span>
                </div>
              </div>

              {visibleRecords.length ? (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[840px] border-collapse text-left">
                      <thead className="bg-[#0B1120] font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                        <tr>
                          <th className="w-8 border-b border-slate-800 py-3" />
                          <th className="border-b border-slate-800 px-3 py-3 font-medium">
                            Added / CVE
                          </th>
                          <th className="border-b border-slate-800 px-3 py-3 font-medium">
                            Vendor &amp; product
                          </th>
                          <th className="border-b border-slate-800 px-3 py-3 font-medium">
                            Vulnerability
                          </th>
                          <th className="border-b border-slate-800 px-3 py-3 font-medium">
                            CISA due
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRecords.map((item, index) => {
                          const ransomware = isKnownRansomwareUse(item.knownRansomwareCampaignUse);
                          const due = dueTone(getDueStatus(item.dueDate, now));
                          return (
                            <tr
                              key={item.cveID}
                              className="group border-b border-slate-800/80 align-top transition last:border-0 hover:bg-cyan-300/[.025]"
                            >
                              <td className="relative w-8">
                                <span
                                  className={`absolute left-[15px] top-0 h-full w-px ${ransomware ? 'bg-rose-400/30' : 'bg-cyan-400/20'}`}
                                />
                                <span
                                  className={`absolute left-[11px] top-6 h-[9px] w-[9px] rounded-full border-2 border-[#0F1729] ${ransomware ? 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,.7)]' : index < 3 ? 'bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.7)]' : 'bg-slate-500'}`}
                                />
                              </td>
                              <td className="px-3 py-4">
                                <p className="font-mono text-[10px] text-slate-500">
                                  {formatDate(item.dateAdded)}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setSelected(item)}
                                  className="mt-1 font-mono text-xs font-bold text-cyan-300 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                >
                                  {item.cveID}
                                </button>
                                {ransomware && (
                                  <span className="mt-2 block w-fit border border-rose-400/25 bg-rose-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300">
                                    Ransomware known
                                  </span>
                                )}
                              </td>
                              <td className="max-w-44 px-3 py-4">
                                <p
                                  className="truncate text-sm font-semibold text-slate-200"
                                  title={item.vendorProject}
                                >
                                  {item.vendorProject || 'Not supplied'}
                                </p>
                                <p
                                  className="mt-1 truncate text-xs text-slate-500"
                                  title={item.product}
                                >
                                  {item.product || 'Product not supplied'}
                                </p>
                              </td>
                              <td className="max-w-xs px-3 py-4">
                                <button
                                  type="button"
                                  onClick={() => setSelected(item)}
                                  className="line-clamp-2 text-left text-sm font-medium leading-5 text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                >
                                  {item.vulnerabilityName}
                                </button>
                              </td>
                              <td className="px-3 py-4">
                                <span
                                  className={`inline-flex border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${due.className}`}
                                >
                                  {due.compact}
                                </span>
                                <p className="mt-2 font-mono text-[10px] text-slate-500">
                                  {formatDate(item.dueDate)}
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y divide-slate-800 md:hidden">
                    {visibleRecords.map((item, index) => {
                      const ransomware = isKnownRansomwareUse(item.knownRansomwareCampaignUse);
                      const due = dueTone(getDueStatus(item.dueDate, now));
                      return (
                        <article
                          key={item.cveID}
                          className="relative ml-5 border-l border-cyan-400/25 px-5 py-5"
                        >
                          <span
                            className={`absolute -left-[5px] top-7 h-[9px] w-[9px] rounded-full ${ransomware ? 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,.7)]' : index < 3 ? 'bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.7)]' : 'bg-slate-500'}`}
                          />
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-[10px] text-slate-500">
                                {formatDate(item.dateAdded)}
                              </p>
                              <p className="mt-1 font-mono text-xs font-bold text-cyan-300">
                                {item.cveID}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${due.className}`}
                            >
                              {due.compact}
                            </span>
                          </div>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {item.vendorProject} / {item.product}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold leading-5 text-slate-200">
                            {item.vulnerabilityName}
                          </h3>
                          {ransomware && (
                            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                              Known ransomware campaign use
                            </p>
                          )}
                          <button
                            type="button"
                            className={`${button} mt-4 w-full`}
                            onClick={() => setSelected(item)}
                          >
                            Inspect record
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="px-6 py-14 text-center">
                  <Search className="mx-auto h-7 w-7 text-slate-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-300">
                    No KEV records match these filters
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Clear the search or broaden the ransomware and due-date filters.
                  </p>
                  <button
                    type="button"
                    className={`${button} mt-5`}
                    onClick={() => {
                      setSearch('');
                      setRansomwareFilter('all');
                      setUrgencyFilter('all');
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}

              <footer className="flex flex-col gap-3 border-t border-slate-800 bg-[#0B1120] px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span>
                  {filtered.length
                    ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${numberFormatter.format(filtered.length)}`
                    : '0 results'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`${button} min-h-9 px-2.5`}
                    onClick={() => setPage(value => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-16 text-center font-mono text-[10px] uppercase tracking-wider">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className={`${button} min-h-9 px-2.5`}
                    onClick={() => setPage(value => Math.min(totalPages, value + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </footer>
            </section>

            <aside className="space-y-5">
              <section className={`${panel} overflow-hidden rounded-[14px]`}>
                <header className="border-b border-slate-800 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-100">Catalog additions</h2>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        Trailing 12 active months
                      </p>
                    </div>
                    <ArrowDownUp className="h-4 w-4 text-cyan-300" />
                  </div>
                </header>
                <div
                  className="h-60 px-2 pb-3 pt-5"
                  role="img"
                  aria-label="Monthly additions to the CISA KEV catalog over the trailing twelve active months"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendData}
                      margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="kev-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#334155" strokeOpacity={0.45} vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#64748b"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ stroke: '#475569' }}
                        contentStyle={{
                          background: '#0b1120',
                          border: '1px solid #334155',
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="additions"
                        name="KEV additions"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        fill="url(#kev-area)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className={`${panel} overflow-hidden rounded-[14px]`}>
                <header className="border-b border-slate-800 px-4 py-4">
                  <h2 className="text-sm font-semibold text-slate-100">Most represented vendors</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Count of current KEV catalog records
                  </p>
                </header>
                <ol className="divide-y divide-slate-800/80">
                  {topVendors.map((item, index) => {
                    const maximum = topVendors[0]?.count || 1;
                    return (
                      <li key={item.vendor} className="relative overflow-hidden px-4 py-3">
                        <span
                          className="absolute inset-y-0 left-0 bg-cyan-400/[.055]"
                          style={{ width: `${(item.count / maximum) * 100}%` }}
                        />
                        <div className="relative flex items-center gap-3">
                          <span className="w-5 font-mono text-[10px] text-slate-600">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span
                            className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-300"
                            title={item.vendor}
                          >
                            {item.vendor}
                          </span>
                          <span className="font-mono text-xs font-bold text-cyan-300">
                            {numberFormatter.format(item.count)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </aside>
          </div>

          <aside className="flex flex-col gap-4 border-t border-slate-800 pt-5 text-xs leading-5 text-slate-500 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex max-w-4xl items-start gap-2.5">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p>
                <strong className="font-semibold text-slate-300">Methodology.</strong> CISA KEV
                identifies vulnerabilities with evidence of exploitation in the wild. Counts
                describe the catalog, not attacks observed in your environment. “Past due” and “due
                soon” compare CISA’s remediation due date with today; they do not indicate your
                organization’s patch status.
              </p>
            </div>
            <a
              href={CISA_KEV_SOURCE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 font-semibold text-cyan-300 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Official JSON source <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </aside>
        </>
      ) : null}

      {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default ThreatIntelligencePage;
