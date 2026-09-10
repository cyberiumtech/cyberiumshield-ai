import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle, Archive, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Database, Download, FileCheck2, FileText, Filter,
  RefreshCw, Search, ShieldCheck, SlidersHorizontal, Activity, Lock, Eye, Zap,
  BarChart3, Globe, Server, Info, Wifi, WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSecurityDashboard, type SourceKey } from '../../hooks/useSecurityDashboard';
import {
  ReportModal,
  type ReportFinding,
  type ReportSource,
  type SecurityReportData,
} from '../../components/modals/ReportModal';

/* ─────────────────────────────────────────────────────────────
   FONT STACK
   Swap `FONT_SANS` / `FONT_MONO` to change the whole page.
   Load via <link> in index.html, or Next.js next/font, or the
   @import approach shown at the top of this file's notes.
   ───────────────────────────────────────────────────────────── */
const FONT_SANS = "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

/* ─────────────────────────────────────────────────────────────
   SOURCE METADATA
   ───────────────────────────────────────────────────────────── */
const sourceMeta: Record<SourceKey, {
  label: string; code: string; provenance: string; icon: React.ReactNode;
}> = {
  email:         { label: 'Email Security',         code: 'EMAIL', provenance: 'Scans incoming email for spam, phishing, and suspicious content.',   icon: <Globe className="h-4 w-4" /> },
  phishing:      { label: 'Phishing Detection',     code: 'URL',   provenance: 'Checks URLs against known phishing patterns and risky domains.',      icon: <Eye className="h-4 w-4" /> },
  malware:       { label: 'Malware Scanner',        code: 'FILE',  provenance: 'Analyses files for malicious signatures and known malware families.',  icon: <Lock className="h-4 w-4" /> },
  network:       { label: 'Network Monitor',        code: 'NET',   provenance: 'Tracks active connections and flags unusual network behaviour.',       icon: <Server className="h-4 w-4" /> },
  vulnerability: { label: 'Vulnerability Register', code: 'VULN',  provenance: 'Lists known weaknesses in your systems that need patching.',           icon: <AlertTriangle className="h-4 w-4" /> },
  intel:         { label: 'Threat Intelligence',    code: 'KEV',   provenance: 'External feed of actively exploited vulnerabilities (CISA).',         icon: <Zap className="h-4 w-4" /> },
};

const severityRank: Record<string, number> = { critical: 5, high: 4, medium: 3, warning: 3, low: 2, info: 1, clear: 0 };

/* ─────────────────────────────────────────────────────────────
   UTILITIES
   ───────────────────────────────────────────────────────────── */
function dateLabel(value: string | null, includeDate = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString(undefined, includeDate
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function relativeTime(value: string | null) {
  if (!value) return '—';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function severityLabel(sev: string) {
  const s = sev.toLowerCase();
  if (s === 'critical') return 'Critical';
  if (s === 'high') return 'High';
  if (s === 'medium' || s === 'warning') return 'Medium';
  if (s === 'low') return 'Low';
  if (s === 'clear') return 'Clean';
  return 'Info';
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVES
   ───────────────────────────────────────────────────────────── */
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-slate-800 bg-slate-900 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ kicker, title, hint, right }: {
  kicker: string; title: string; hint?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">{kicker}</p>
        <h2 className="mt-1 text-base font-semibold text-slate-100">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

function StatusDot({ status }: { status: 'loading' | 'online' | 'error' }) {
  const tone = status === 'online' ? 'bg-emerald-500' : status === 'loading' ? 'bg-amber-500' : 'bg-rose-500';
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${tone}`} aria-hidden="true" />;
}

function SeverityPill({ severity }: { severity: string }) {
  const s = severity.toLowerCase();
  const tone = s === 'critical'
    ? 'border-rose-900 bg-rose-950/60 text-rose-300'
    : s === 'high'
      ? 'border-orange-900 bg-orange-950/60 text-orange-300'
      : s === 'medium' || s === 'warning'
        ? 'border-amber-900 bg-amber-950/60 text-amber-300'
        : s === 'clear'
          ? 'border-emerald-900 bg-emerald-950/60 text-emerald-300'
          : 'border-slate-700 bg-slate-800/60 text-slate-300';
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${tone}`}>
      {severityLabel(severity)}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone = s === 'cleared' || s === 'resolved' || s === 'closed'
    ? 'border-emerald-900 bg-emerald-950/60 text-emerald-300'
    : s === 'open' || s === 'attention'
      ? 'border-rose-900 bg-rose-950/60 text-rose-300'
      : 'border-slate-700 bg-slate-800/60 text-slate-400';
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${tone}`}>
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   HEALTH GAUGE — flat ring
   ───────────────────────────────────────────────────────────── */
function HealthGauge({ score, tone }: { score: number | null; tone: 'emerald' | 'amber' | 'rose' | 'slate' }) {
  const stroke = {
    emerald: 'stroke-emerald-500',
    amber:   'stroke-amber-500',
    rose:    'stroke-rose-500',
    slate:   'stroke-slate-700',
  }[tone];

  const text = {
    emerald: 'text-emerald-400',
    amber:   'text-amber-400',
    rose:    'text-rose-400',
    slate:   'text-slate-500',
  }[tone];

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const pct = score ?? 0;
  const dash = (pct / 100) * circumference;

  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} className="fill-none stroke-slate-800" strokeWidth="6" />
        {score !== null && (
          <circle
            cx="50" cy="50" r={radius}
            className={`fill-none ${stroke}`}
            strokeWidth="6" strokeLinecap="butt"
            strokeDasharray={`${dash} ${circumference}`}
          />
        )}
      </svg>
      <div className="relative flex flex-col items-center">
        <span className={`font-mono text-2xl font-bold leading-none ${text}`}>{score ?? '—'}</span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
export function SecurityCenterPage() {
  const data = useSecurityDashboard();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [artifacts, setArtifacts] = useState<Array<{ name: string; format: string; generatedAt: string }>>([]);
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);

  /* ── Findings ─────────────────────────────────────────────── */
  const findings = useMemo<ReportFinding[]>(() => {
    const items: ReportFinding[] = [];
    data.email.forEach((item, index) => items.push({
      id: `email-${item.id || index}`, source: 'Email Security',
      title: item.verdict === 'legitimate' ? 'Email cleared by detector' : `${item.verdict} email identified`,
      detail: [item.subject, item.sender].filter(Boolean).join(' · ') || 'Message scan',
      severity: item.verdict === 'spam' ? 'high' : item.verdict === 'suspicious' ? 'medium' : 'clear',
      status: item.verdict === 'legitimate' ? 'cleared' : 'open', timestamp: item.scannedAt || null,
    }));
    data.phishing.forEach((item, index) => items.push({
      id: `phishing-${item.id || index}`, source: 'Phishing Analysis',
      title: item.prediction === 'legitimate' ? 'URL cleared by detector' : `${item.prediction} URL identified`,
      detail: item.url, severity: item.prediction === 'phishing' ? item.risk_level : item.prediction === 'suspicious' ? 'medium' : 'clear',
      status: item.prediction === 'legitimate' ? 'cleared' : 'open', timestamp: item.scannedAt || null,
    }));
    data.malware.forEach((item, index) => items.push({
      id: `malware-${item.id || index}`, source: 'Malware Analysis',
      title: item.classification === 'Malware' ? 'Malware detected' : item.classification === 'Legitimate' ? 'File cleared by scanner' : 'File classification inconclusive',
      detail: [item.filename, item.family].filter(Boolean).join(' · '),
      severity: item.classification === 'Malware' ? (item.threat_score >= 80 ? 'critical' : 'high') : item.classification === 'Unknown' ? 'medium' : 'clear',
      status: item.classification === 'Legitimate' ? 'cleared' : 'open', timestamp: item.timestamp || null,
    }));
    data.vulnerability?.recent.forEach(item => items.push({
      id: `vulnerability-${item.id}`, source: 'Vulnerability Register', title: item.title || item.cve || 'Vulnerability finding',
      detail: [item.cve, item.asset_name].filter(Boolean).join(' · '),
      severity: item.severity.toLowerCase(), status: item.status.toLowerCase(),
      timestamp: item.updated_at || item.created_at || null,
    }));
    data.intel?.vulnerabilities.slice(0, 40).forEach(item => items.push({
      id: `intel-${item.cveID}`, source: 'Threat Intelligence', title: item.vulnerabilityName,
      detail: [item.cveID, item.vendorProject, item.product].filter(Boolean).join(' · '),
      severity: 'high', status: 'cataloged', timestamp: item.dateAdded || null,
    }));
    if (data.network) items.push({
      id: 'network-snapshot', source: 'Network Telemetry',
      title: data.network.monitoring ? 'Network monitor active' : 'Network monitor stopped',
      detail: `${data.network.connection_count} connections · ${data.network.established} established`,
      severity: data.network.monitoring ? 'info' : 'high',
      status: data.network.monitoring ? 'observed' : 'attention',
      timestamp: data.network.updated || null,
    });
    return items.sort((a, b) => {
      const bySeverity = (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0);
      return bySeverity || (new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    });
  }, [data.email, data.intel, data.malware, data.network, data.phishing, data.vulnerability]);

  /* ── Sources ──────────────────────────────────────────────── */
  const sources = useMemo<ReportSource[]>(() => {
    const counts: Record<SourceKey, number | null> = {
      email: data.email.length, phishing: data.phishing.length, malware: data.malware.length,
      network: data.network?.connection_count ?? null,
      vulnerability: data.vulnerability?.counts.total ?? null,
      intel: data.intel?.declaredCount ?? data.intel?.vulnerabilities.length ?? null,
    };
    return (Object.keys(sourceMeta) as SourceKey[]).map(key => ({
      key, label: sourceMeta[key].label, status: data.sources[key].status,
      updatedAt: data.sources[key].updatedAt, recordCount: counts[key],
      provenance: sourceMeta[key].provenance,
    }));
  }, [data.email.length, data.intel, data.malware.length, data.network, data.phishing.length, data.sources, data.vulnerability]);

  /* ── Filtering ────────────────────────────────────────────── */
  const filteredFindings = useMemo(() => findings.filter(item => {
    const search = query.trim().toLowerCase();
    return (sourceFilter === 'all' || item.source === sourceFilter)
      && (severityFilter === 'all' || item.severity === severityFilter)
      && (statusFilter === 'all' || item.status === statusFilter)
      && (!search || `${item.title} ${item.detail} ${item.id}`.toLowerCase().includes(search));
  }), [findings, query, severityFilter, sourceFilter, statusFilter]);

  useEffect(() => { setCurrentPage(1); }, [query, sourceFilter, severityFilter, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredFindings.length / pageSize));
  const paginatedFindings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFindings.slice(start, start + pageSize);
  }, [filteredFindings, currentPage, pageSize]);

  /* ── Derived metrics ─────────────────────────────────────── */
  const riskyFindings = findings.filter(item => (severityRank[item.severity] ?? 0) >= 3 && item.status !== 'resolved').length;
  const evidenceVolume = sources.reduce((sum, source) => sum + (source.recordCount ?? 0), 0);
  const availableForScore = data.summary.online + data.summary.offline;
  const postureScore = availableForScore
    ? Math.max(0, Math.round((data.summary.online / 6) * 70 + Math.max(0, 30 - Math.min(30, riskyFindings * 3))))
    : null;

  const tone: 'emerald' | 'amber' | 'rose' | 'slate' =
    postureScore === null ? 'slate'
    : postureScore >= 85 ? 'emerald'
    : postureScore >= 65 ? 'amber'
    : 'rose';

  const statusLabel =
    postureScore === null ? 'Checking sources'
    : postureScore >= 85 ? 'Operational'
    : postureScore >= 65 ? 'Degraded'
    : 'At risk';

  const statusTone =
    tone === 'emerald' ? 'text-emerald-400'
    : tone === 'amber' ? 'text-amber-400'
    : tone === 'rose' ? 'text-rose-400'
    : 'text-slate-400';

  const onlineCount = data.summary.online;
  const offlineCount = data.summary.offline;

  /* ── Readiness ───────────────────────────────────────────── */
  const readiness = [
    { label: 'Detection tools', detail: 'Email, phishing, malware', ready: ['email', 'phishing', 'malware'].filter(k => data.sources[k as SourceKey].status === 'online').length, total: 3 },
    { label: 'Infrastructure',  detail: 'Network, vulnerabilities', ready: ['network', 'vulnerability'].filter(k => data.sources[k as SourceKey].status === 'online').length, total: 2 },
    { label: 'Threat intel',    detail: 'External CISA feed',        ready: data.sources.intel.status === 'online' ? 1 : 0, total: 1 },
  ];

  /* ── Report data ─────────────────────────────────────────── */
  const reportData: SecurityReportData = {
    sources, findings,
    metrics: [
      { label: 'Overall health',           value: postureScore === null ? 'Unavailable' : `${postureScore}/100 (${statusLabel})` },
      { label: 'Sources online',           value: `${data.summary.online}/6` },
      { label: 'Evidence records exposed', value: evidenceVolume.toLocaleString() },
      { label: 'Attention findings',       value: riskyFindings.toLocaleString() },
      { label: 'Network monitoring',       value: data.network ? (data.network.monitoring ? 'Active' : 'Stopped') : 'Unavailable' },
      { label: 'Open vulnerabilities',     value: data.vulnerability ? String(data.vulnerability.counts.open) : 'Unavailable' },
    ],
    lastSync: data.lastSync,
  };

  const refresh = async () => {
    try {
      await data.refreshAll();
      toast.success('Data refreshed', { description: 'All sources are up to date.' });
    } catch {
      toast.error('Refresh had errors', { description: 'Some sources could not be reached.' });
    }
  };

  /* ── RENDER ───────────────────────────────────────────────── */
  return (
    <div
      style={{ fontFamily: FONT_SANS }}
      className="relative mx-auto min-w-0 max-w-[1400px] pb-12 text-slate-100"
    >
      {/* Subtle grid backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex flex-col gap-4 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md border border-slate-800 bg-slate-900">
            <ShieldCheck className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Security Operations</p>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Security Center</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={data.isRefreshing}
            aria-busy={data.isRefreshing}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${data.isRefreshing ? 'animate-spin' : ''}`} />
            {data.isRefreshing ? 'Syncing' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan-800 bg-cyan-950/60 px-3.5 text-xs font-medium text-cyan-200 transition hover:border-cyan-700 hover:bg-cyan-900/60 hover:text-cyan-100"
          >
            <FileText className="h-3.5 w-3.5" />
            Build report
          </button>
        </div>
      </header>

      {/* ═══════════════ OVERVIEW ═══════════════ */}
      <Panel className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">

          <div className="flex items-center gap-4 border-b border-slate-800 p-5 lg:border-b-0 lg:border-r">
            <HealthGauge score={postureScore} tone={tone} />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-500">System status</p>
              <p className={`text-lg font-semibold ${statusTone}`}>{statusLabel}</p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                {onlineCount}/6 sources online · {riskyFindings} open risk{riskyFindings === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-slate-800 sm:grid-cols-4 sm:divide-x">
            <MetricCell
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Sources online"
              value={`${onlineCount}/6`}
              sub={offlineCount > 0 ? `${offlineCount} offline` : 'All reachable'}
              tone={offlineCount === 0 ? 'emerald' : offlineCount <= 2 ? 'amber' : 'rose'}
            />
            <MetricCell
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              label="Open risks"
              value={String(riskyFindings)}
              sub={riskyFindings === 0 ? 'Nothing urgent' : 'Needs review'}
              tone={riskyFindings === 0 ? 'emerald' : riskyFindings < 5 ? 'amber' : 'rose'}
            />
            <MetricCell
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              label="Evidence logs"
              value={evidenceVolume.toLocaleString()}
              sub="Recorded events"
              tone="slate"
            />
            <MetricCell
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              label="Last sync"
              value={data.lastSync ? relativeTime(data.lastSync) : '—'}
              sub={data.lastSync ? dateLabel(data.lastSync) : 'Checking'}
              tone="slate"
            />
          </div>
        </div>
      </Panel>

      {/* ═══════════════ DATA SOURCES ═══════════════ */}
      <section className="mt-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Live data sources</p>
            <h2 className="mt-1 text-base font-semibold text-slate-100">Connected security tools</h2>
          </div>
          <span className="hidden font-mono text-[10px] text-slate-500 sm:block">
            {onlineCount} online · {offlineCount} offline
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map(source => {
            const meta = sourceMeta[source.key as SourceKey];
            const online = source.status === 'online';
            const loading = source.status === 'loading';
            return (
              <Panel key={source.key} className="p-4 transition hover:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-md border ${
                    online ? 'border-emerald-900 bg-emerald-950/50 text-emerald-400'
                    : loading ? 'border-amber-900 bg-amber-950/50 text-amber-400'
                    : 'border-rose-900 bg-rose-950/50 text-rose-400'
                  }`}>
                    {meta.icon}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={source.status as 'loading' | 'online' | 'error'} />
                    <span className={`font-mono text-[10px] font-medium uppercase tracking-wider ${
                      online ? 'text-emerald-400' : loading ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {online ? 'Online' : loading ? 'Loading' : 'Offline'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-100">{meta.label}</p>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">{meta.code}</span>
                </div>

                <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                  {meta.provenance}
                </p>

                <div className="mt-3 flex items-end justify-between border-t border-slate-800 pt-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Records</p>
                    <p className="font-mono text-sm font-semibold text-slate-200">
                      {source.recordCount === null ? '—' : source.recordCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Last sync</p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {loading ? 'Connecting…' : relativeTime(source.updatedAt)}
                    </p>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ FINDINGS ═══════════════ */}
      <Panel className="mt-5">
        <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Recent findings</p>
            <h2 className="mt-1 text-base font-semibold text-slate-100">Security events</h2>
            <p className="mt-0.5 text-xs text-slate-500">Sorted by severity. Use filters to narrow the list.</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[220px_150px_140px_140px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search events…"
                className="h-9 w-full rounded-md border border-slate-800 bg-slate-950 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 outline-none transition focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
              />
            </div>
            {[
              { value: sourceFilter,   set: setSourceFilter,   label: 'All sources',    values: Array.from(new Set(findings.map(i => i.source))) },
              { value: severityFilter, set: setSeverityFilter, label: 'All severities', values: Array.from(new Set(findings.map(i => i.severity))) },
              { value: statusFilter,   set: setStatusFilter,   label: 'All statuses',   values: Array.from(new Set(findings.map(i => i.status))) },
            ].map(filter => (
              <div key={filter.label} className="relative">
                <select
                  value={filter.value}
                  onChange={e => filter.set(e.target.value)}
                  className="h-9 w-full appearance-none rounded-md border border-slate-800 bg-slate-950 px-3 pr-8 text-xs text-slate-300 outline-none transition focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                >
                  <option value="all">{filter.label}</option>
                  {filter.values.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <Filter className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
              </div>
            ))}
          </div>
        </div>

        {data.summary.loading === 6 ? (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <RefreshCw className="mx-auto h-5 w-5 animate-spin text-slate-500" />
              <p className="mt-3 text-sm font-medium text-slate-300">Loading security data</p>
              <p className="mt-1 text-xs text-slate-500">Contacting all connected sources.</p>
            </div>
          </div>
        ) : paginatedFindings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Severity</th>
                  <th className="px-5 py-2.5 font-medium">Source</th>
                  <th className="px-5 py-2.5 font-medium">Event</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Observed</th>
                  <th className="px-5 py-2.5 text-right font-medium">Record ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {paginatedFindings.map(item => (
                  <tr key={item.id} className="transition hover:bg-slate-800/30">
                    <td className="whitespace-nowrap px-5 py-3">
                      <SeverityPill severity={item.severity} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] text-slate-400">
                      {item.source}
                    </td>
                    <td className="max-w-md px-5 py-3">
                      <p className="truncate font-medium text-slate-200" title={item.title}>{item.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500" title={item.detail || undefined}>
                        {item.detail || 'No additional details recorded'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <StatusPill status={item.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] text-slate-400" title={dateLabel(item.timestamp, true)}>
                      {relativeTime(item.timestamp)}
                    </td>
                    <td className="max-w-[140px] truncate whitespace-nowrap px-5 py-3 text-right font-mono text-[11px] text-slate-500" title={item.id}>
                      {item.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              {findings.length ? <SlidersHorizontal className="mx-auto h-5 w-5 text-slate-600" /> : <Archive className="mx-auto h-5 w-5 text-slate-600" />}
              <p className="mt-3 text-sm font-medium text-slate-300">
                {findings.length ? 'No events match your filters' : 'No events recorded yet'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {findings.length ? 'Try clearing filters or search.' : 'Run a scan to populate this list.'}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] text-slate-500">
            Showing <span className="text-slate-300">{filteredFindings.length ? (currentPage - 1) * pageSize + 1 : 0}</span>
            –<span className="text-slate-300">{Math.min(currentPage * pageSize, filteredFindings.length)}</span>
            {' '}of <span className="text-slate-300">{filteredFindings.length}</span>
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="h-7 rounded border border-slate-800 bg-slate-950 px-2 font-mono text-[11px] text-slate-300 outline-none focus:border-slate-700"
              >
                {[5, 10, 15, 20, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <PageBtn onClick={() => setCurrentPage(1)}                       disabled={currentPage === 1}          title="First"><ChevronsLeft className="h-3.5 w-3.5" /></PageBtn>
              <PageBtn onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}          title="Previous"><ChevronLeft className="h-3.5 w-3.5" /></PageBtn>
              <span className="px-2 font-mono text-[11px] text-slate-400">
                <span className="text-slate-100">{currentPage}</span> / <span className="text-slate-500">{totalPages}</span>
              </span>
              <PageBtn onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} title="Next"><ChevronRight className="h-3.5 w-3.5" /></PageBtn>
              <PageBtn onClick={() => setCurrentPage(totalPages)}              disabled={currentPage === totalPages} title="Last"><ChevronsRight className="h-3.5 w-3.5" /></PageBtn>
            </div>
          </div>
        </div>
      </Panel>

      {/* ═══════════════ COVERAGE + REPORTS ═══════════════ */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">

        <Panel>
          <SectionHeader kicker="Coverage check" title="Tool readiness" hint="Tools active in each functional group." />
          <ul className="divide-y divide-slate-800">
            {readiness.map(item => {
              const pct = Math.round((item.ready / item.total) * 100);
              const bar = pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <li key={item.label} className="grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(160px,.9fr)_1fr_60px] sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.label}</p>
                    <p className="text-[11px] text-slate-500">{item.detail}</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="font-mono text-xs font-medium text-slate-300 sm:text-right">{item.ready}/{item.total}</p>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <SectionHeader
            kicker="Downloads"
            title="Report history"
            right={<FileCheck2 className="h-4 w-4 text-slate-500" />}
          />
          {artifacts.length ? (
            <ul className="divide-y divide-slate-800">
              {artifacts.map((artifact, i) => (
                <li key={`${artifact.generatedAt}-${i}`} className="flex items-center gap-3 px-5 py-3">
                  <div className="grid h-8 w-8 place-items-center rounded border border-slate-800 bg-slate-950 text-slate-400">
                    <Download className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-200">{artifact.name}</p>
                    <p className="font-mono text-[10px] text-slate-500">{artifact.format} · {dateLabel(artifact.generatedAt, true)}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5">
              <div className="flex items-start gap-3 rounded border border-slate-800 bg-slate-950/60 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <p className="text-xs leading-relaxed text-slate-400">
                  No reports generated yet. Export a PDF, CSV, or JSON summary of your findings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
              >
                Open report builder <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </Panel>
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="mt-8 flex flex-col gap-2 border-t border-slate-800 pt-4 font-mono text-[10px] uppercase tracking-widest text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5" />
          CyberShield · Unified SOC Telemetry
        </span>
        <span className="flex items-center gap-1.5">
          {data.summary.offline ? (
            <><WifiOff className="h-3.5 w-3.5 text-amber-500" /><span className="text-amber-500">Partial feed</span></>
          ) : data.summary.loading ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" /><span className="text-slate-500">Syncing</span></>
          ) : (
            <><Wifi className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-500">All feeds online</span></>
          )}
        </span>
      </footer>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        data={reportData}
        onGenerated={artifact => setArtifacts(prev => [artifact, ...prev].slice(0, 4))}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SMALL COMPONENTS
   ───────────────────────────────────────────────────────────── */
function MetricCell({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  tone: 'emerald' | 'amber' | 'rose' | 'slate';
}) {
  const color = {
    emerald: 'text-emerald-400',
    amber:   'text-amber-400',
    rose:    'text-rose-400',
    slate:   'text-slate-300',
  }[tone];

  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <div className="flex items-center gap-1.5 text-slate-500">
        {icon}
        <p className="font-mono text-[10px] font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className={`font-mono text-lg font-semibold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}

function PageBtn({
  children, onClick, disabled, title,
}: { children: React.ReactNode; onClick: () => void; disabled: boolean; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="grid h-7 w-7 place-items-center rounded border border-slate-800 bg-slate-950 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-800 disabled:hover:bg-slate-950 disabled:hover:text-slate-400"
    >
      {children}
    </button>
  );
}