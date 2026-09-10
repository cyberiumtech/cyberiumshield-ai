import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle, Archive, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, CircleDot, Database, Download, FileCheck2, FileText, Filter,
  RefreshCw, Search, ShieldCheck, SlidersHorizontal, Activity, Lock, Eye, Zap,
  BarChart3, Globe, Server, Shield, XCircle, Wifi, WifiOff, Info,
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
   SOURCE METADATA (plain-English labels for students)
   ───────────────────────────────────────────────────────────── */
const sourceMeta: Record<SourceKey, {
  label: string; short: string; code: string; provenance: string; icon: React.ReactNode;
}> = {
  email:         { label: 'Email Security',        short: 'Email',   code: 'EMAIL',  provenance: 'Scans incoming email for spam, phishing, and suspicious content.',  icon: <Globe className="h-5 w-5" /> },
  phishing:      { label: 'Phishing Detection',    short: 'Phishing',code: 'URL',    provenance: 'Checks URLs for known phishing patterns and risky domains.',        icon: <Eye className="h-5 w-5" /> },
  malware:       { label: 'Malware Scanner',       short: 'Malware', code: 'FILE',   provenance: 'Analyses files for malicious signatures and known malware families.',icon: <Lock className="h-5 w-5" /> },
  network:       { label: 'Network Monitor',       short: 'Network', code: 'NET',    provenance: 'Tracks active connections and flags unusual network behaviour.',     icon: <Server className="h-5 w-5" /> },
  vulnerability: { label: 'Vulnerability Register',short: 'Vulns',   code: 'VULN',   provenance: 'Lists known weaknesses in your systems that need patching.',         icon: <AlertTriangle className="h-5 w-5" /> },
  intel:         { label: 'Threat Intelligence',   short: 'Intel',   code: 'KEV',    provenance: 'External feed of actively exploited vulnerabilities (CISA).',       icon: <Zap className="h-5 w-5" /> },
};

const severityRank: Record<string, number> = { critical: 5, high: 4, medium: 3, warning: 3, low: 2, info: 1, clear: 0 };

/* ─────────────────────────────────────────────────────────────
   UTILITIES
   ───────────────────────────────────────────────────────────── */
function dateLabel(value: string | null, includeDate = false) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString(undefined, includeDate
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function relativeTime(value: string | null) {
  if (!value) return 'Not recorded';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Time unavailable';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Plain-English severity label for students */
function severityLabel(sev: string) {
  if (sev === 'critical') return 'Critical';
  if (sev === 'high') return 'High';
  if (sev === 'medium' || sev === 'warning') return 'Medium';
  if (sev === 'low') return 'Low';
  if (sev === 'clear') return 'Clean';
  return 'Info';
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVE: HUD corner brackets
   ───────────────────────────────────────────────────────────── */
function Corners({ tone = 'cyan' }: { tone?: 'cyan' | 'emerald' | 'amber' | 'rose' }) {
  const map = {
    cyan:    'border-cyan-400/70',
    emerald: 'border-emerald-400/70',
    amber:   'border-amber-400/70',
    rose:    'border-rose-400/70',
  }[tone];
  return (
    <>
      <span className={`pointer-events-none absolute -top-px -left-px h-3 w-3 border-t-2 border-l-2 ${map}`} />
      <span className={`pointer-events-none absolute -top-px -right-px h-3 w-3 border-t-2 border-r-2 ${map}`} />
      <span className={`pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 ${map}`} />
      <span className={`pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 ${map}`} />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVE: Cyber card wrapper
   ───────────────────────────────────────────────────────────── */
function CyberCard({
  children, className = '', glow = 'cyan',
}: { children: React.ReactNode; className?: string; glow?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'none' }) {
  const glowMap = {
    cyan:    'shadow-[0_0_30px_-10px_rgba(34,211,238,0.35)]',
    emerald: 'shadow-[0_0_30px_-10px_rgba(52,211,153,0.35)]',
    amber:   'shadow-[0_0_30px_-10px_rgba(251,191,36,0.35)]',
    rose:    'shadow-[0_0_30px_-10px_rgba(244,63,94,0.35)]',
    none:    '',
  }[glow];
  return (
    <section className={`relative rounded-lg border border-cyan-500/25 bg-slate-950/70 backdrop-blur-sm ${glowMap} ${className}`}>
      <Corners tone={glow === 'none' ? 'cyan' : glow} />
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVE: Terminal-style section title
   ───────────────────────────────────────────────────────────── */
function SectionTitle({ kicker, title, hint }: { kicker: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400">
        <span className="text-cyan-500/60">&gt;</span> {kicker}
      </p>
      <h2 className="text-base font-bold text-slate-100 sm:text-lg">{title}</h2>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVE: Status dot
   ───────────────────────────────────────────────────────────── */
function StatusDot({ status }: { status: 'loading' | 'online' | 'error' }) {
  const tone = status === 'online' ? 'bg-emerald-400' : status === 'loading' ? 'bg-amber-300' : 'bg-rose-400';
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
      <span className={`absolute inline-flex h-full w-full ${status === 'loading' ? 'animate-ping' : ''} rounded-full opacity-40 ${tone}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${tone}`} />
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVE: Severity pill
   ───────────────────────────────────────────────────────────── */
function SeverityPill({ severity }: { severity: string }) {
  const s = severity.toLowerCase();
  const tone = s === 'critical'
    ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
    : s === 'high'
      ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
      : s === 'medium' || s === 'warning'
        ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
        : s === 'clear'
          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
          : 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300';
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${tone}`}>
      {severityLabel(severity)}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   HERO: Big overall health orb
   ───────────────────────────────────────────────────────────── */
function HealthOrb({ score, label, tone }: { score: number | null; label: string; tone: 'emerald' | 'amber' | 'rose' | 'slate' }) {
  const color = {
    emerald: { ring: 'stroke-emerald-400', text: 'text-emerald-400', glow: 'shadow-[0_0_40px_-5px_rgba(52,211,153,0.6)]', bg: 'from-emerald-500/20' },
    amber:   { ring: 'stroke-amber-400',   text: 'text-amber-400',   glow: 'shadow-[0_0_40px_-5px_rgba(251,191,36,0.6)]', bg: 'from-amber-500/20' },
    rose:    { ring: 'stroke-rose-400',    text: 'text-rose-400',    glow: 'shadow-[0_0_40px_-5px_rgba(244,63,94,0.6)]',  bg: 'from-rose-500/20' },
    slate:   { ring: 'stroke-slate-500',   text: 'text-slate-400',   glow: '', bg: 'from-slate-500/10' },
  }[tone];

  const pct = score ?? 0;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className={`relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br ${color.bg} to-transparent ${color.glow}`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} className="fill-none stroke-slate-800" strokeWidth="6" />
        {score !== null && (
          <circle
            cx="50" cy="50" r={radius}
            className={`fill-none ${color.ring} transition-all duration-1000`}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        )}
      </svg>
      <div className="relative flex flex-col items-center">
        <Shield className={`h-4 w-4 ${color.text}`} />
        <span className={`font-mono text-2xl font-black leading-none ${color.text}`}>{score ?? '—'}</span>
        <span className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-slate-500">{label}</span>
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

  // Simple tone + label for students
  const orbTone: 'emerald' | 'amber' | 'rose' | 'slate' =
    postureScore === null ? 'slate'
    : postureScore >= 85 ? 'emerald'
    : postureScore >= 65 ? 'amber'
    : 'rose';

  const plainStatus =
    postureScore === null ? 'Checking…'
    : postureScore >= 85 ? 'Looking Good'
    : postureScore >= 65 ? 'Some Issues'
    : 'Needs Attention';

  const bannerTone = {
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/30' },
    amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/5',   border: 'border-amber-500/30'   },
    rose:    { text: 'text-rose-400',    bg: 'bg-rose-500/5',    border: 'border-rose-500/30'    },
    slate:   { text: 'text-slate-400',   bg: 'bg-slate-500/5',   border: 'border-slate-500/30'   },
  }[orbTone];

  const onlineCount = data.summary.online;
  const offlineCount = data.summary.offline;

  /* ── Readiness ───────────────────────────────────────────── */
  const readiness = [
    { label: 'Detection Tools', detail: 'Email · Phishing · Malware', ready: ['email', 'phishing', 'malware'].filter(k => data.sources[k as SourceKey].status === 'online').length, total: 3 },
    { label: 'Infrastructure',  detail: 'Network · Vulnerabilities',   ready: ['network', 'vulnerability'].filter(k => data.sources[k as SourceKey].status === 'online').length, total: 2 },
    { label: 'Threat Intel',    detail: 'External CISA feed',          ready: data.sources.intel.status === 'online' ? 1 : 0, total: 1 },
  ];

  /* ── Report data ─────────────────────────────────────────── */
  const reportData: SecurityReportData = {
    sources, findings,
    metrics: [
      { label: 'Overall health', value: postureScore === null ? 'Unavailable' : `${postureScore}/100 (${plainStatus})` },
      { label: 'Sources online', value: `${data.summary.online}/6` },
      { label: 'Evidence records exposed', value: evidenceVolume.toLocaleString() },
      { label: 'Attention findings', value: riskyFindings.toLocaleString() },
      { label: 'Network monitoring', value: data.network ? (data.network.monitoring ? 'Active' : 'Stopped') : 'Unavailable' },
      { label: 'Open vulnerabilities', value: data.vulnerability ? String(data.vulnerability.counts.open) : 'Unavailable' },
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
    <div className="relative mx-auto min-w-0 max-w-[1400px] pb-12 font-sans text-slate-100">

      {/* Cyber background layers */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_60%,transparent_100%)]" />
        <div className="absolute -top-40 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-1/3 right-0 h-[300px] w-[400px] rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative grid h-12 w-12 place-items-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_20px_-5px_rgba(34,211,238,0.6)]">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          </div>
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400">
              <span className="text-cyan-500/60">&gt;</span> Security Operations
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Security Center
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={data.isRefreshing}
            aria-busy={data.isRefreshing}
            className="group inline-flex h-10 items-center gap-2 rounded-md border border-cyan-500/40 bg-slate-950/80 px-4 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_-3px_rgba(34,211,238,0.6)] disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${data.isRefreshing ? 'animate-spin' : ''}`} />
            {data.isRefreshing ? 'Syncing' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-500 px-4 font-mono text-xs font-bold uppercase tracking-wider text-slate-950 transition hover:bg-cyan-400 hover:shadow-[0_0_20px_-3px_rgba(34,211,238,0.9)]"
          >
            <FileText className="h-3.5 w-3.5" />
            Build Report
          </button>
        </div>
      </header>

      {/* ═══════════════ HERO: Health + Stats ═══════════════ */}
      <CyberCard className="mt-6 p-5 sm:p-6" glow={orbTone === 'slate' ? 'cyan' : orbTone}>
        <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">

          {/* Health orb */}
          <div className="flex items-center gap-5">
            <HealthOrb score={postureScore} label="Health" tone={orbTone} />
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">System Status</p>
              <p className={`text-2xl font-black tracking-tight ${bannerTone.text}`}>{plainStatus}</p>
              <p className="max-w-xs text-[11px] leading-relaxed text-slate-400">
                Based on <span className="font-mono text-slate-200">{onlineCount}/6</span> active data sources and{' '}
                <span className="font-mono text-slate-200">{riskyFindings}</span> open risk items.
              </p>
            </div>
          </div>

          {/* Stat blocks */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:border-l lg:border-cyan-500/15 lg:pl-6">
            <StatBlock
              icon={<Activity className="h-4 w-4" />}
              label="Sources Online"
              value={`${onlineCount}/6`}
              sub={offlineCount > 0 ? `${offlineCount} offline` : 'All reachable'}
              tone={offlineCount === 0 ? 'emerald' : offlineCount <= 2 ? 'amber' : 'rose'}
            />
            <StatBlock
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Open Risks"
              value={String(riskyFindings)}
              sub={riskyFindings === 0 ? 'Nothing urgent' : 'Needs review'}
              tone={riskyFindings === 0 ? 'emerald' : riskyFindings < 5 ? 'amber' : 'rose'}
            />
            <StatBlock
              icon={<BarChart3 className="h-4 w-4" />}
              label="Evidence Logs"
              value={evidenceVolume.toLocaleString()}
              sub="Recorded events"
              tone="cyan"
            />
            <StatBlock
              icon={<RefreshCw className="h-4 w-4" />}
              label="Last Sync"
              value={data.lastSync ? relativeTime(data.lastSync) : '…'}
              sub={data.lastSync ? dateLabel(data.lastSync) : 'Checking'}
              tone="cyan"
            />
          </div>

          {/* Verified badge */}
          <div className={`hidden flex-col items-end gap-1 lg:flex ${bannerTone.text}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Verified</span>
            </div>
            <p className="max-w-[160px] text-right text-[10px] leading-relaxed text-slate-500">
              All metrics cryptographically signed.
            </p>
          </div>
        </div>
      </CyberCard>

      {/* ═══════════════ DATA SOURCES ═══════════════ */}
      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <SectionTitle
            kicker="Live Data Sources"
            title="Connected Security Tools"
            hint="Each tile shows one tool feeding data into the dashboard."
          />
          <span className="hidden font-mono text-[10px] text-slate-500 sm:block">
            [{onlineCount} ONLINE / {offlineCount} OFFLINE]
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map(source => {
            const meta = sourceMeta[source.key as SourceKey];
            const online = source.status === 'online';
            const loading = source.status === 'loading';
            const tone: 'emerald' | 'amber' | 'rose' = online ? 'emerald' : loading ? 'amber' : 'rose';
            return (
              <CyberCard key={source.key} glow={tone} className="group p-4 transition hover:bg-slate-950/90">
                <div className="flex items-start justify-between gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-md border ${
                    online ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : loading ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                  }`}>
                    {meta.icon}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={source.status as 'loading' | 'online' | 'error'} />
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                      online ? 'text-emerald-400' : loading ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {online ? 'Online' : loading ? 'Loading' : 'Offline'}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-sm font-bold text-slate-100">{meta.label}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-500/80">[{meta.code}]</p>
                </div>

                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                  {meta.provenance}
                </p>

                <div className="mt-3 flex items-end justify-between border-t border-cyan-500/10 pt-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Records</p>
                    <p className="font-mono text-lg font-bold text-slate-100">
                      {source.recordCount === null ? '—' : source.recordCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Last Sync</p>
                    <p className="font-mono text-[10px] text-slate-300">
                      {loading ? 'Connecting…' : relativeTime(source.updatedAt)}
                    </p>
                  </div>
                </div>
              </CyberCard>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ FINDINGS ═══════════════ */}
      <CyberCard className="mt-6" glow="cyan">
        <div className="flex flex-col gap-4 border-b border-cyan-500/20 p-5 lg:flex-row lg:items-center lg:justify-between">
          <SectionTitle
            kicker="Recent Findings"
            title="Security Events"
            hint="Sorted by severity. Use the filters to narrow the list."
          />

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[220px_150px_140px_140px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search events…"
                className="h-9 w-full rounded-md border border-cyan-500/20 bg-slate-950 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
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
                  className="h-9 w-full appearance-none rounded-md border border-cyan-500/20 bg-slate-950 px-3 pr-8 text-xs text-slate-300 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
                >
                  <option value="all">{filter.label}</option>
                  {filter.values.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <Filter className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        {data.summary.loading === 6 ? (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-400" />
              <p className="mt-3 text-sm font-semibold text-slate-200">Loading security data…</p>
              <p className="mt-1 text-xs text-slate-500">Contacting all connected sources.</p>
            </div>
          </div>
        ) : paginatedFindings.length ? (
          <ul className="divide-y divide-cyan-500/10">
            {paginatedFindings.map(item => {
              const sev = item.severity.toLowerCase();
              const bar =
                sev === 'critical' ? 'bg-rose-500'
                : sev === 'high' ? 'bg-orange-500'
                : sev === 'medium' || sev === 'warning' ? 'bg-amber-400'
                : sev === 'clear' ? 'bg-emerald-400'
                : 'bg-cyan-400';
              return (
                <li key={item.id} className="group relative flex items-stretch gap-4 px-5 py-3.5 transition hover:bg-cyan-500/5">
                  {/* Severity bar */}
                  <span className={`my-0.5 w-1 shrink-0 rounded-full ${bar} shadow-[0_0_10px_currentColor]`} />

                  {/* Main info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityPill severity={item.severity} />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400/80">
                        {item.source}
                      </span>
                      <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block" />
                      <span className="hidden font-mono text-[10px] text-slate-500 sm:block">
                        {relativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-semibold text-slate-100" title={item.title}>
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400" title={item.detail || undefined}>
                      {item.detail || 'No additional details recorded'}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="hidden flex-col items-end justify-center gap-1 sm:flex">
                    <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-300">
                      {item.status}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500" title={item.id}>
                      #{item.id.slice(0, 12)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              {findings.length ? <SlidersHorizontal className="mx-auto h-6 w-6 text-slate-500" /> : <Archive className="mx-auto h-6 w-6 text-slate-500" />}
              <p className="mt-3 text-sm font-semibold text-slate-200">
                {findings.length ? 'No events match your filters' : 'No events recorded yet'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {findings.length ? 'Try clearing filters or search.' : 'Run a scan to populate this list.'}
              </p>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-cyan-500/20 bg-slate-950/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] text-slate-400">
            Showing <span className="text-slate-200">{filteredFindings.length ? (currentPage - 1) * pageSize + 1 : 0}</span>
            –<span className="text-slate-200">{Math.min(currentPage * pageSize, filteredFindings.length)}</span>
            {' '}of <span className="text-cyan-400">{filteredFindings.length}</span>
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="h-7 rounded border border-cyan-500/20 bg-slate-950 px-2 font-mono text-[11px] text-slate-200 outline-none focus:border-cyan-400"
              >
                {[5, 10, 15, 20, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <PageBtn onClick={() => setCurrentPage(1)}               disabled={currentPage === 1}          title="First"><ChevronsLeft className="h-3.5 w-3.5" /></PageBtn>
              <PageBtn onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}   title="Prev"><ChevronLeft className="h-3.5 w-3.5" /></PageBtn>
              <span className="px-2 font-mono text-[11px] text-slate-300">
                <span className="text-white">{currentPage}</span> / <span className="text-slate-500">{totalPages}</span>
              </span>
              <PageBtn onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} title="Next"><ChevronRight className="h-3.5 w-3.5" /></PageBtn>
              <PageBtn onClick={() => setCurrentPage(totalPages)}      disabled={currentPage === totalPages} title="Last"><ChevronsRight className="h-3.5 w-3.5" /></PageBtn>
            </div>
          </div>
        </div>
      </CyberCard>

      {/* ═══════════════ COVERAGE + EXPORTS ═══════════════ */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">

        <CyberCard glow="amber">
          <div className="border-b border-cyan-500/20 p-5">
            <SectionTitle
              kicker="Coverage Check"
              title="Tool Readiness"
              hint="Shows how many tools in each group are currently active."
            />
          </div>
          <ul className="divide-y divide-cyan-500/10">
            {readiness.map(item => {
              const pct = Math.round((item.ready / item.total) * 100);
              const tone = pct === 100 ? 'emerald' : pct > 0 ? 'amber' : 'rose';
              const color = tone === 'emerald' ? 'bg-emerald-400' : tone === 'amber' ? 'bg-amber-400' : 'bg-rose-500';
              return (
                <li key={item.label} className="grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(160px,.9fr)_1fr_60px] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                    <p className="text-[11px] text-slate-500">{item.detail}</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="font-mono text-xs font-bold text-slate-200 sm:text-right">{item.ready}/{item.total}</p>
                </li>
              );
            })}
          </ul>
        </CyberCard>

        <CyberCard glow="cyan">
          <div className="flex items-center justify-between border-b border-cyan-500/20 p-5">
            <SectionTitle kicker="Downloads" title="Report History" />
            <FileCheck2 className="h-5 w-5 text-cyan-400" />
          </div>
          {artifacts.length ? (
            <ul className="divide-y divide-cyan-500/10">
              {artifacts.map((artifact, i) => (
                <li key={`${artifact.generatedAt}-${i}`} className="flex items-center gap-3 px-5 py-3">
                  <div className="grid h-8 w-8 place-items-center rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                    <Download className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-200">{artifact.name}</p>
                    <p className="font-mono text-[10px] text-slate-500">{artifact.format} · {dateLabel(artifact.generatedAt, true)}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5">
              <div className="flex items-start gap-3 rounded border border-cyan-500/15 bg-cyan-500/5 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                <p className="text-xs leading-relaxed text-slate-300">
                  No reports generated yet. Click below to export a PDF, CSV, or JSON summary of your findings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-400 transition hover:text-cyan-300"
              >
                Open Report Builder <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </CyberCard>
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="mt-8 flex flex-col gap-2 border-t border-cyan-500/15 pt-4 font-mono text-[10px] uppercase tracking-widest text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-cyan-400" />
          CyberShield · Unified SOC Telemetry
        </span>
        <span className="flex items-center gap-1.5">
          {data.summary.offline ? (
            <><WifiOff className="h-3.5 w-3.5 text-amber-400" /><span className="text-amber-400">Partial feed</span></>
          ) : data.summary.loading ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" /><span className="text-cyan-400">Syncing…</span></>
          ) : (
            <><Wifi className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">All feeds online</span></>
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
   SMALL SHARED COMPONENTS
   ───────────────────────────────────────────────────────────── */
function StatBlock({
  icon, label, value, sub, tone,
}: { icon: React.ReactNode; label: string; value: string; sub: string; tone: 'cyan' | 'emerald' | 'amber' | 'rose' }) {
  const color = {
    cyan:    'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
    emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    amber:   'text-amber-400 border-amber-500/30 bg-amber-500/5',
    rose:    'text-rose-400 border-rose-500/30 bg-rose-500/5',
  }[tone];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className={`grid h-5 w-5 place-items-center rounded border ${color}`}>{icon}</span>
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      </div>
      <p className="font-mono text-xl font-bold text-slate-100">{value}</p>
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
      className="grid h-7 w-7 place-items-center rounded border border-cyan-500/20 bg-slate-950 text-slate-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-cyan-500/20 disabled:hover:bg-slate-950 disabled:hover:text-slate-300"
    >
      {children}
    </button>
  );
}