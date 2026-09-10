import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle, Archive, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, CircleDot, Database, Download, FileCheck2, FileText, Filter,
  RefreshCw, Search, ShieldCheck, SlidersHorizontal, Activity, Lock, Eye, Zap,
  BarChart3, Globe, Server
} from 'lucide-react';
import { toast } from 'sonner';
import { useSecurityDashboard, type SourceKey } from '../../hooks/useSecurityDashboard';
import {
  ReportModal,
  type ReportFinding,
  type ReportSource,
  type SecurityReportData,
} from '../../components/modals/ReportModal';

const sourceMeta: Record<SourceKey, { label: string; code: string; provenance: string; icon: React.ReactNode }> = {
  email: { label: 'Email Security', code: 'EMAIL/LOCAL', provenance: 'Detector health API + validated scan telemetry', icon: <Globe className="h-4 w-4" /> },
  phishing: { label: 'Phishing Analysis', code: 'URL/LOCAL', provenance: 'Detector health API + domain analysis history', icon: <Eye className="h-4 w-4" /> },
  malware: { label: 'Malware Analysis', code: 'FILE/LOCAL', provenance: 'Scanner health API + binary signature telemetry', icon: <Lock className="h-4 w-4" /> },
  network: { label: 'Network Telemetry', code: 'NET/API', provenance: 'Native network monitor status API', icon: <Server className="h-4 w-4" /> },
  vulnerability: { label: 'Vulnerability Register', code: 'VULN/API', provenance: 'Vulnerability management dashboard API', icon: <AlertTriangle className="h-4 w-4" /> },
  intel: { label: 'Threat Intelligence', code: 'CISA/KEV', provenance: 'CISA KEV catalog via local intelligence service', icon: <Zap className="h-4 w-4" /> },
};

const severityRank: Record<string, number> = { critical: 5, high: 4, medium: 3, warning: 3, low: 2, info: 1, clear: 0 };

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

function Surface({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`border border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm shadow-[0_0_15px_rgba(34,211,238,0.05)] rounded-xl overflow-hidden ${className}`}>
      {children}
    </section>
  );
}

function StatusMark({ status }: { status: 'loading' | 'online' | 'error' }) {
  const tone = status === 'online' ? 'bg-emerald-400' : status === 'loading' ? 'bg-amber-300' : 'bg-rose-400';
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
      <span className={`absolute inline-flex h-full w-full ${status === 'loading' ? 'animate-ping' : ''} rounded-full opacity-30 ${tone}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${tone}`} />
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const tone = severity === 'critical' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
    : severity === 'high' || severity === 'medium' || severity === 'warning' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.15)]'
      : severity === 'clear' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
        : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300';
  return <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${tone}`}>{severity}</span>;
}

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
      detail: [item.filename, item.family].filter(Boolean).join(' · '), severity: item.classification === 'Malware' ? (item.threat_score >= 80 ? 'critical' : 'high') : item.classification === 'Unknown' ? 'medium' : 'clear',
      status: item.classification === 'Legitimate' ? 'cleared' : 'open', timestamp: item.timestamp || null,
    }));
    data.vulnerability?.recent.forEach(item => items.push({
      id: `vulnerability-${item.id}`, source: 'Vulnerability Register', title: item.title || item.cve || 'Vulnerability finding',
      detail: [item.cve, item.asset_name].filter(Boolean).join(' · '), severity: item.severity.toLowerCase(), status: item.status.toLowerCase(), timestamp: item.updated_at || item.created_at || null,
    }));
    data.intel?.vulnerabilities.slice(0, 40).forEach(item => items.push({
      id: `intel-${item.cveID}`, source: 'Threat Intelligence', title: item.vulnerabilityName,
      detail: [item.cveID, item.vendorProject, item.product].filter(Boolean).join(' · '), severity: 'high', status: 'cataloged', timestamp: item.dateAdded || null,
    }));
    if (data.network) items.push({
      id: 'network-snapshot', source: 'Network Telemetry', title: data.network.monitoring ? 'Network monitor active' : 'Network monitor stopped',
      detail: `${data.network.connection_count} connections · ${data.network.established} established`, severity: data.network.monitoring ? 'info' : 'high', status: data.network.monitoring ? 'observed' : 'attention', timestamp: data.network.updated || null,
    });
    return items.sort((a, b) => {
      const bySeverity = (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0);
      return bySeverity || (new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    });
  }, [data.email, data.intel, data.malware, data.network, data.phishing, data.vulnerability]);

  const sources = useMemo<ReportSource[]>(() => {
    const counts: Record<SourceKey, number | null> = {
      email: data.email.length, phishing: data.phishing.length, malware: data.malware.length,
      network: data.network?.connection_count ?? null, vulnerability: data.vulnerability?.counts.total ?? null,
      intel: data.intel?.declaredCount ?? data.intel?.vulnerabilities.length ?? null,
    };
    return (Object.keys(sourceMeta) as SourceKey[]).map(key => ({ key, label: sourceMeta[key].label, status: data.sources[key].status, updatedAt: data.sources[key].updatedAt, recordCount: counts[key], provenance: sourceMeta[key].provenance }));
  }, [data.email.length, data.intel, data.malware.length, data.network, data.phishing.length, data.sources, data.vulnerability]);

  const filteredFindings = useMemo(() => findings.filter(item => {
    const search = query.trim().toLowerCase();
    return (sourceFilter === 'all' || item.source === sourceFilter)
      && (severityFilter === 'all' || item.severity === severityFilter)
      && (statusFilter === 'all' || item.status === statusFilter)
      && (!search || `${item.title} ${item.detail} ${item.id}`.toLowerCase().includes(search));
  }), [findings, query, severityFilter, sourceFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, sourceFilter, severityFilter, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredFindings.length / pageSize));
  const paginatedFindings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFindings.slice(start, start + pageSize);
  }, [filteredFindings, currentPage, pageSize]);

  const riskyFindings = findings.filter(item => (severityRank[item.severity] ?? 0) >= 3 && item.status !== 'resolved').length;
  const evidenceVolume = sources.reduce((sum, source) => sum + (source.recordCount ?? 0), 0);
  const availableForScore = data.summary.online + data.summary.offline;
  const postureScore = availableForScore
    ? Math.max(0, Math.round((data.summary.online / 6) * 70 + Math.max(0, 30 - Math.min(30, riskyFindings * 3))))
    : null;
  const postureLabel = postureScore === null ? 'Awaiting source checks' : postureScore >= 85 ? 'Strong Signal Posture' : postureScore >= 65 ? 'Partial Assurance' : 'Attention Required';

  const readiness = [
    { label: 'Detection Evidence', detail: 'Email, phishing, and malware services', ready: ['email', 'phishing', 'malware'].filter(key => data.sources[key as SourceKey].status === 'online').length, total: 3 },
    { label: 'Infrastructure Visibility', detail: 'Network monitoring and vulnerability register', ready: ['network', 'vulnerability'].filter(key => data.sources[key as SourceKey].status === 'online').length, total: 2 },
    { label: 'External Threat Context', detail: 'CISA Known Exploited Vulnerabilities', ready: data.sources.intel.status === 'online' ? 1 : 0, total: 1 },
  ];

  const reportData: SecurityReportData = {
    sources, findings,
    metrics: [
      { label: 'Operational posture', value: postureScore === null ? 'Unavailable' : `${postureScore}/100 (${postureLabel})` },
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
      toast.success('Evidence refreshed', { description: 'Source health and records are up to date.' });
    } catch {
      toast.error('Refresh completed with errors', { description: 'Review the source ledger for unavailable services.' });
    }
  };

  return (
    <div className="relative mx-auto min-w-0 max-w-[1640px] pb-12 text-slate-100 font-sans">
      {/* Cyber Grid Background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[linear-gradient(to_right,rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)]" />

      {/* Header */}
      <header className="flex flex-col gap-6 border-b border-cyan-500/20 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-cyan-400">
            <ShieldCheck className="h-4 w-4 text-cyan-400 animate-pulse" /> Verified Operations Center
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Security Center
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Real-time evidence verification, source ledger tracking, and threat response operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={data.isRefreshing}
            aria-busy={data.isRefreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${data.isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            {data.isRefreshing ? 'Syncing Telemetry…' : 'Sync Telemetry'}
          </button>

          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <FileText className="h-3.5 w-3.5" />
            Build Security Report
          </button>
        </div>
      </header>

      {/* Summary Metrics Bar */}
      <section aria-label="Evidence trust summary" className="mt-6 grid rounded-xl border border-cyan-500/20 bg-slate-900/80 shadow-lg sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.45fr] divide-y divide-slate-800 sm:divide-y-0 sm:divide-x">
        {[
          { label: 'Live Source Coverage', value: `${data.summary.online} / 6`, note: data.summary.loading ? `${data.summary.loading} connecting` : `${data.summary.offline} unavailable`, icon: <Activity className="h-4 w-4 text-cyan-400" /> },
          { label: 'Last Successful Sync', value: data.lastSync ? dateLabel(data.lastSync) : 'In progress', note: data.lastSync ? relativeTime(data.lastSync) : 'Checking all sources', icon: <RefreshCw className="h-4 w-4 text-cyan-400" /> },
          { label: 'Evidence Volume', value: evidenceVolume.toLocaleString(), note: 'Validated telemetry events', icon: <BarChart3 className="h-4 w-4 text-cyan-400" /> }
        ].map(item => (
          <div key={item.label} className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              {item.icon}
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-slate-100">{item.value}</p>
            <p className="mt-1 text-xs text-slate-400">{item.note}</p>
          </div>
        ))}
        <div className="flex items-center gap-3 p-4 sm:p-5 bg-cyan-950/20">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-400" />
          <p className="text-xs leading-relaxed text-slate-300">
            <span className="font-semibold text-slate-100">Telemetry Cryptographically Verified:</span> Unverified metrics are excluded from posture calculations.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,.78fr)_minmax(0,1.5fr)]">

        {/* Posture Card */}
        <Surface className="relative p-6">
          <div className="absolute right-0 top-0 h-48 w-48 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_70%)] pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">Derived Signal Posture</p>
              <h2 className="mt-1 text-xl font-bold text-white">Operational Assurance</h2>
            </div>
            <CircleDot className="h-5 w-5 text-cyan-400 animate-pulse" />
          </div>

          <div className="relative mt-8 flex items-end gap-3">
            <span className="font-mono text-6xl font-black leading-none tracking-tight text-white">{postureScore ?? '—'}</span>
            <span className="mb-1 font-mono text-xs uppercase tracking-wider text-slate-400">/ 100<br />Signal Index</span>
          </div>

          <div className="relative mt-6 h-2 rounded-full overflow-hidden bg-slate-800" role="meter" aria-label="Operational assurance score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={postureScore ?? undefined}>
            {postureScore !== null && (
              <div
                className={`h-full transition-all duration-1000 ${postureScore >= 85 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : postureScore >= 65 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}
                style={{ width: `${postureScore}%` }}
              />
            )}
          </div>

          <div className="relative mt-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-200">{postureLabel}</p>
            <p className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">{riskyFindings} High Priority</p>
          </div>

          <div className="relative mt-8 grid grid-cols-3 gap-px bg-slate-800 rounded-lg overflow-hidden border border-cyan-500/20">
            {[
              { value: data.vulnerability ? data.vulnerability.counts.open : '—', label: 'Open Vulns' },
              { value: data.network ? data.network.established : '—', label: 'Active Conns' },
              { value: findings.filter(item => item.severity === 'clear').length, label: 'Cleared Scans' }
            ].map(metric => (
              <div key={metric.label} className="bg-slate-900/90 py-3.5 text-center">
                <p className="font-mono text-lg font-bold text-white">{metric.value}</p>
                <p className="mt-0.5 text-[9px] font-mono uppercase tracking-wider text-slate-400">{metric.label}</p>
              </div>
            ))}
          </div>
          <p className="relative mt-5 text-[11px] leading-relaxed text-slate-400">
            Calculated score based on 70% source telemetry health & 30% observed risk exposure.
          </p>
        </Surface>

        {/* Source Validation Ledger */}
        <Surface className="flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-2 border-b border-cyan-500/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between bg-slate-900/80">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">Chain of Custody</p>
                <h2 className="text-lg font-bold text-white">Source Validation Ledger</h2>
              </div>
              <span className="font-mono text-xs text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md">
                LEDGER : <span className="text-emerald-400 font-bold">{data.summary.online} VERIFIED</span>
              </span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {sources.map(source => (
                <div key={source.key} className="grid gap-3 px-5 py-3.5 text-xs sm:grid-cols-[20px_minmax(160px,.8fr)_minmax(200px,1.2fr)_110px_90px] sm:items-center hover:bg-slate-800/30 transition">
                  <div className="grid h-5 w-5 place-items-center">
                    <StatusMark status={source.status as 'loading' | 'online' | 'error'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400">{sourceMeta[source.key as SourceKey].icon}</span>
                      <p className="font-semibold text-slate-200">{source.label}</p>
                    </div>
                    <p className="font-mono text-[10px] tracking-wider text-cyan-400 mt-0.5">{sourceMeta[source.key as SourceKey].code}</p>
                  </div>
                  <p className="text-slate-400 text-[11px] truncate" title={source.provenance}>{source.provenance}</p>
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Last Sync</p>
                    <p className="font-mono text-[11px] text-slate-300" title={source.updatedAt ?? undefined}>
                      {source.status === 'loading' ? 'Connecting...' : dateLabel(source.updatedAt)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Records</p>
                    <p className="font-mono text-xs font-bold text-slate-200">
                      {source.recordCount === null ? 'N/A' : source.recordCount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-cyan-500/20 bg-slate-900/60 px-5 py-3.5">
            <Activity className="h-4 w-4 text-cyan-400" />
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">{data.summary.online} operational endpoints</span> active. Offline endpoints auto-flagged for review.
            </p>
          </div>
        </Surface>
      </div>

      {/* Finding Ledger */}
      <Surface className="mt-6">

        <div className="border-b border-cyan-500/20 bg-slate-900/90 px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">Normalized Telemetry</p>
              <h2 className="text-lg font-bold text-white">Finding Ledger</h2>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[240px_150px_130px_130px]">

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search findings or IDs..."
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-400 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {[
                { value: sourceFilter, set: setSourceFilter, label: 'All Sources', values: Array.from(new Set(findings.map(item => item.source))) },
                { value: severityFilter, set: setSeverityFilter, label: 'All Severities', values: Array.from(new Set(findings.map(item => item.severity))) },
                { value: statusFilter, set: setStatusFilter, label: 'All Statuses', values: Array.from(new Set(findings.map(item => item.status))) }
              ].map(filter => (
                <div key={filter.label} className="relative">
                  <select
                    value={filter.value}
                    onChange={event => filter.set(event.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 pr-8 text-xs text-slate-300 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="all">{filter.label}</option>
                    {filter.values.map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <Filter className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {data.summary.loading === 6 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-400" />
              <p className="mt-3 text-sm font-semibold text-slate-200">Validating Telemetry Sources</p>
              <p className="mt-1 text-xs text-slate-400">Fetching findings from integrated detectors...</p>
            </div>
          </div>
        ) : paginatedFindings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-cyan-500/20 bg-slate-950/60 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-5 w-[110px]">Severity</th>
                  <th className="py-3 px-5 w-[160px]">Source</th>
                  <th className="py-3 px-5">Evidence Details</th>
                  <th className="py-3 px-5 w-[110px]">Status</th>
                  <th className="py-3 px-5 w-[120px]">Observed</th>
                  <th className="py-3 px-5 w-[140px] text-right">Record Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedFindings.map(item => (
                  <tr key={item.id} className="transition hover:bg-slate-800/40">
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <SeverityBadge severity={item.severity} />
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-200 whitespace-nowrap">
                      {item.source}
                    </td>
                    <td className="py-3.5 px-5 min-w-[240px]">
                      <p className="font-semibold text-slate-200 truncate">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400 truncate max-w-md" title={item.detail}>
                        {item.detail || 'No additional parameters logged'}
                      </p>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="capitalize text-slate-300 font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-400 whitespace-nowrap" title={dateLabel(item.timestamp, true)}>
                      {relativeTime(item.timestamp)}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[11px] text-cyan-400 text-right whitespace-nowrap truncate max-w-[140px]" title={item.id}>
                      {item.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              {findings.length ? <SlidersHorizontal className="mx-auto h-7 w-7 text-slate-400" /> : <Archive className="mx-auto h-7 w-7 text-slate-400" />}
              <p className="mt-3 text-sm font-semibold text-slate-200">{findings.length ? 'No evidence matches your filters' : 'No findings recorded'}</p>
              <p className="mt-1 text-xs text-slate-400">{findings.length ? 'Try clearing your filters or search query.' : 'Run a scan or connect a telemetry feed to populate the ledger.'}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-cyan-500/20 bg-slate-950/80 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
            <span>
              Showing <strong className="text-slate-200">{filteredFindings.length ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
              <strong className="text-slate-200">{Math.min(currentPage * pageSize, filteredFindings.length)}</strong> of{' '}
              <strong className="text-cyan-400">{filteredFindings.length}</strong> records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono">Show:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="h-8 rounded border border-slate-700 bg-slate-900 px-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
              >
                {[5, 10, 15, 20, 25, 50].map(size => (
                  <option key={size} value={size}>
                    {size} rows
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="grid h-8 w-8 place-items-center rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="grid h-8 w-8 place-items-center rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-3 font-mono text-xs text-slate-300">
                Page <strong className="text-white">{currentPage}</strong> of <strong className="text-slate-400">{totalPages}</strong>
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="grid h-8 w-8 place-items-center rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="grid h-8 w-8 place-items-center rounded border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Surface>

      {/* Readiness & Export */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Surface>
          <div className="border-b border-cyan-500/20 px-5 py-4 bg-slate-900/80">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">Telemetry Assurance</p>
            <h2 className="text-lg font-bold text-white">Operational Evidence Coverage</h2>
          </div>
          <div className="divide-y divide-slate-800/60">
            {readiness.map(item => {
              const percent = Math.round((item.ready / item.total) * 100);
              return (
                <div key={item.label} className="grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(180px,.8fr)_minmax(200px,1.2fr)_60px] sm:items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-200">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{item.detail}</p>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${percent === 100 ? 'bg-emerald-400' : percent ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${percent}%` }} />
                  </div>
                  <p className="font-mono text-xs font-bold text-slate-300 sm:text-right">{item.ready}/{item.total}</p>
                </div>
              );
            })}
          </div>
        </Surface>

        <Surface className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-cyan-500/20 px-5 py-4 bg-slate-900/80">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">Export Registry</p>
                <h2 className="text-lg font-bold text-white">Report Artifacts</h2>
              </div>
              <FileCheck2 className="h-5 w-5 text-cyan-400" />
            </div>
            {artifacts.length ? (
              <div className="divide-y divide-slate-800/60">
                {artifacts.map((artifact, index) => (
                  <div key={`${artifact.generatedAt}-${index}`} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="grid h-8 w-8 place-items-center rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Download className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-200">{artifact.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{artifact.format} · {dateLabel(artifact.generatedAt, true)}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <p className="text-xs font-semibold text-slate-200">No exports generated in active session</p>
                <p className="mt-1 text-xs text-slate-400">Generate executive PDF, CSV, or raw JSON evidence reports.</p>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                >
                  Open Report Builder <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </Surface>
      </div>

      {/* Footer */}
      <footer className="mt-8 flex flex-col gap-2 border-t border-cyan-500/20 pt-4 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-cyan-400" /> CyberShield Unified SOC Telemetry Fabric
        </span>
        <span>
          {data.summary.offline ? (
            <span className="text-amber-400"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Partial Telemetry Active</span>
          ) : data.summary.loading ? (
            'Validating Feeds...'
          ) : (
            <span className="text-emerald-400"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> All Telemetry Feeds Online</span>
          )}
        </span>
      </footer>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        data={reportData}
        onGenerated={artifact => setArtifacts(previous => [artifact, ...previous].slice(0, 4))}
      />
    </div>
  );
}