import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, CheckCircle2, ChevronRight, CircleDot, Database,
  Download, FileCheck2, FileText, Filter, RefreshCw, Search, ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSecurityDashboard, type SourceKey } from '../../hooks/useSecurityDashboard';
import {
  ReportModal,
  type ReportFinding,
  type ReportSource,
  type SecurityReportData,
} from '../../components/modals/ReportModal';

const sourceMeta: Record<SourceKey, { label: string; code: string; provenance: string }> = {
  email: { label: 'Email security', code: 'EMAIL/LOCAL', provenance: 'Detector health API + validated browser scan history' },
  phishing: { label: 'Phishing analysis', code: 'URL/LOCAL', provenance: 'Detector health API + validated browser scan history' },
  malware: { label: 'Malware analysis', code: 'FILE/LOCAL', provenance: 'Scanner health API + validated browser scan history' },
  network: { label: 'Network telemetry', code: 'NET/API', provenance: 'Native network monitor status API' },
  vulnerability: { label: 'Vulnerability register', code: 'VULN/API', provenance: 'Vulnerability management dashboard API' },
  intel: { label: 'Threat intelligence', code: 'CISA/KEV', provenance: 'CISA KEV catalog via local intelligence service' },
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
  return <section className={`border border-[var(--border-color)] bg-[var(--bg-secondary)] ${className}`}>{children}</section>;
}

function StatusMark({ status }: { status: 'loading' | 'online' | 'error' }) {
  const tone = status === 'online' ? 'bg-emerald-400' : status === 'loading' ? 'bg-amber-300' : 'bg-rose-400';
  return <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true"><span className={`absolute inline-flex h-full w-full ${status === 'loading' ? 'animate-ping' : ''} rounded-full opacity-30 ${tone}`} /><span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${tone}`} /></span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const tone = severity === 'critical' ? 'border-rose-400/30 bg-rose-400/10 text-rose-300'
    : severity === 'high' || severity === 'medium' || severity === 'warning' ? 'border-amber-300/30 bg-amber-300/10 text-amber-300'
      : severity === 'clear' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
        : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300';
  return <span className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${tone}`}>{severity}</span>;
}

export function SecurityCenterPage() {
  const data = useSecurityDashboard();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [artifacts, setArtifacts] = useState<Array<{ name: string; format: string; generatedAt: string }>>([]);

  const findings = useMemo<ReportFinding[]>(() => {
    const items: ReportFinding[] = [];
    data.email.forEach((item, index) => items.push({
      id: `email-${item.id || index}`, source: 'Email security',
      title: item.verdict === 'legitimate' ? 'Email cleared by detector' : `${item.verdict} email identified`,
      detail: [item.subject, item.sender].filter(Boolean).join(' · ') || 'Message scan',
      severity: item.verdict === 'spam' ? 'high' : item.verdict === 'suspicious' ? 'medium' : 'clear',
      status: item.verdict === 'legitimate' ? 'cleared' : 'open', timestamp: item.scannedAt || null,
    }));
    data.phishing.forEach((item, index) => items.push({
      id: `phishing-${item.id || index}`, source: 'Phishing analysis',
      title: item.prediction === 'legitimate' ? 'URL cleared by detector' : `${item.prediction} URL identified`,
      detail: item.url, severity: item.prediction === 'phishing' ? item.risk_level : item.prediction === 'suspicious' ? 'medium' : 'clear',
      status: item.prediction === 'legitimate' ? 'cleared' : 'open', timestamp: item.scannedAt || null,
    }));
    data.malware.forEach((item, index) => items.push({
      id: `malware-${item.id || index}`, source: 'Malware analysis',
      title: item.classification === 'Malware' ? 'Malware detected' : item.classification === 'Legitimate' ? 'File cleared by scanner' : 'File classification inconclusive',
      detail: [item.filename, item.family].filter(Boolean).join(' · '), severity: item.classification === 'Malware' ? (item.threat_score >= 80 ? 'critical' : 'high') : item.classification === 'Unknown' ? 'medium' : 'clear',
      status: item.classification === 'Legitimate' ? 'cleared' : 'open', timestamp: item.timestamp || null,
    }));
    data.vulnerability?.recent.forEach(item => items.push({
      id: `vulnerability-${item.id}`, source: 'Vulnerability register', title: item.title || item.cve || 'Vulnerability finding',
      detail: [item.cve, item.asset_name].filter(Boolean).join(' · '), severity: item.severity.toLowerCase(), status: item.status.toLowerCase(), timestamp: item.updated_at || item.created_at || null,
    }));
    data.intel?.vulnerabilities.slice(0, 40).forEach(item => items.push({
      id: `intel-${item.cveID}`, source: 'Threat intelligence', title: item.vulnerabilityName,
      detail: [item.cveID, item.vendorProject, item.product].filter(Boolean).join(' · '), severity: 'high', status: 'cataloged', timestamp: item.dateAdded || null,
    }));
    if (data.network) items.push({
      id: 'network-snapshot', source: 'Network telemetry', title: data.network.monitoring ? 'Network monitor active' : 'Network monitor stopped',
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

  const riskyFindings = findings.filter(item => (severityRank[item.severity] ?? 0) >= 3 && item.status !== 'resolved').length;
  const evidenceVolume = sources.reduce((sum, source) => sum + (source.recordCount ?? 0), 0);
  const availableForScore = data.summary.online + data.summary.offline;
  const postureScore = availableForScore
    ? Math.max(0, Math.round((data.summary.online / 6) * 70 + Math.max(0, 30 - Math.min(30, riskyFindings * 3))))
    : null;
  const postureLabel = postureScore === null ? 'Awaiting source checks' : postureScore >= 85 ? 'Strong signal posture' : postureScore >= 65 ? 'Partial assurance' : 'Attention required';
  const readiness = [
    { label: 'Detection evidence', detail: 'Email, phishing, and malware services', ready: ['email', 'phishing', 'malware'].filter(key => data.sources[key as SourceKey].status === 'online').length, total: 3 },
    { label: 'Infrastructure visibility', detail: 'Network monitoring and vulnerability register', ready: ['network', 'vulnerability'].filter(key => data.sources[key as SourceKey].status === 'online').length, total: 2 },
    { label: 'External threat context', detail: 'CISA Known Exploited Vulnerabilities', ready: data.sources.intel.status === 'online' ? 1 : 0, total: 1 },
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
    try { await data.refreshAll(); toast.success('Evidence refreshed', { description: 'Source health and records are up to date.' }); }
    catch { toast.error('Refresh completed with errors', { description: 'Review the source ledger for unavailable services.' }); }
  };

  return (
    <div className="relative mx-auto min-w-0 max-w-[1640px] pb-10 text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[linear-gradient(rgba(34,211,238,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.025)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <header className="flex flex-col gap-5 border-b border-[var(--border-color)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400"><ShieldCheck className="h-4 w-4" />Verified operations workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Security center</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">Validate source provenance, triage current evidence, and produce audit-ready exports without inferred data.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => void refresh()} disabled={data.isRefreshing} aria-busy={data.isRefreshing} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-cyan-400/40 hover:text-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-wait disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${data.isRefreshing ? 'animate-spin' : ''}`} />{data.isRefreshing ? 'Refreshing evidence…' : 'Refresh evidence'}</button><button type="button" onClick={() => setReportModalOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 bg-cyan-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"><FileText className="h-4 w-4" />Build report</button></div>
      </header>

      <section aria-label="Evidence trust summary" className="grid border-x border-b border-[var(--border-color)] bg-[var(--bg-secondary)] sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.45fr]">
        {[{ label: 'Live source coverage', value: `${data.summary.online} / 6`, note: data.summary.loading ? `${data.summary.loading} connecting` : `${data.summary.offline} unavailable` }, { label: 'Last successful sync', value: data.lastSync ? dateLabel(data.lastSync) : 'In progress', note: data.lastSync ? relativeTime(data.lastSync) : 'Checking all sources' }, { label: 'Evidence volume', value: evidenceVolume.toLocaleString(), note: 'Records exposed by sources' }].map(item => <div key={item.label} className="border-b border-[var(--border-color)] px-5 py-4 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r"><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[var(--text-secondary)]">{item.label}</p><p className="mt-1 font-mono text-xl text-[var(--text-primary)]">{item.value}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{item.note}</p></div>)}
        <div className="flex items-center gap-3 px-5 py-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-400" /><p className="text-xs leading-relaxed text-[var(--text-secondary)]"><span className="font-semibold text-[var(--text-primary)]">Evidence integrity:</span> unavailable values are excluded and never estimated.</p></div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,.78fr)_minmax(0,1.5fr)]">
        <Surface className="relative overflow-hidden p-6"><div className="absolute right-0 top-0 h-48 w-48 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.12),transparent_68%)]" /><div className="relative flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Derived signal posture</p><h2 className="mt-2 text-xl font-semibold">Operational assurance</h2></div><CircleDot className="h-5 w-5 text-cyan-400" /></div><div className="relative mt-9 flex items-end gap-3"><span className="font-mono text-7xl font-light leading-none tracking-[-0.08em]">{postureScore ?? '—'}</span><span className="mb-1 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">/ 100<br />signal score</span></div><div className="relative mt-6 h-2 overflow-hidden bg-slate-500/15" role="meter" aria-label="Operational assurance score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={postureScore ?? undefined}>{postureScore !== null && <div className={`h-full transition-[width] duration-700 ${postureScore >= 85 ? 'bg-emerald-400' : postureScore >= 65 ? 'bg-amber-300' : 'bg-rose-400'}`} style={{ width: `${postureScore}%` }} />}</div><div className="relative mt-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold">{postureLabel}</p><p className="font-mono text-xs text-[var(--text-secondary)]">{riskyFindings} attention items</p></div><div className="relative mt-8 grid grid-cols-3 gap-px bg-[var(--border-color)]">{[{ value: data.vulnerability ? data.vulnerability.counts.open : '—', label: 'Open vulns' }, { value: data.network ? data.network.established : '—', label: 'Connections' }, { value: findings.filter(item => item.severity === 'clear').length, label: 'Cleared scans' }].map(metric => <div key={metric.label} className="bg-[var(--bg-secondary)] py-4 text-center"><p className="font-mono text-xl">{metric.value}</p><p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{metric.label}</p></div>)}</div><p className="relative mt-5 text-xs leading-relaxed text-[var(--text-secondary)]">Explainable operational score: 70% source availability and 30% observed attention pressure. It is not a certification or legal compliance grade.</p></Surface>

        <Surface className="overflow-hidden"><div className="flex flex-col gap-2 border-b border-[var(--border-color)] px-5 py-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Chain of custody</p><h2 className="mt-1 text-lg font-semibold">Source validation ledger</h2></div><p className="font-mono text-xs text-[var(--text-secondary)]">LEDGER / {data.summary.online} VERIFIED</p></div><div className="relative divide-y divide-[var(--border-color)] before:absolute before:bottom-6 before:left-[25px] before:top-6 before:w-px before:bg-cyan-400/20">{sources.map(source => <div key={source.key} className="relative grid gap-3 px-5 py-4 sm:grid-cols-[22px_minmax(170px,.7fr)_minmax(210px,1.1fr)_110px_105px] sm:items-center"><div className="z-10 grid h-5 w-5 place-items-center bg-[var(--bg-secondary)]"><StatusMark status={source.status as 'loading' | 'online' | 'error'} /></div><div><p className="text-sm font-semibold">{source.label}</p><p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-cyan-500">{sourceMeta[source.key as SourceKey].code}</p></div><p className="text-xs leading-relaxed text-[var(--text-secondary)]">{source.provenance}</p><div><p className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Last checked</p><p className="mt-1 font-mono text-xs" title={source.updatedAt ?? undefined}>{source.status === 'loading' ? 'Connecting' : dateLabel(source.updatedAt)}</p></div><div className="sm:text-right"><p className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Records</p><p className="mt-1 font-mono text-sm">{source.recordCount === null ? 'Not exposed' : source.recordCount.toLocaleString()}</p></div>{data.sources[source.key as SourceKey].message && <p className="text-xs text-rose-400 sm:col-start-3 sm:col-span-3">{data.sources[source.key as SourceKey].message}</p>}</div>)}</div><div className="flex items-center gap-3 border-t border-[var(--border-color)] bg-cyan-400/[0.035] px-5 py-4"><ShieldCheck className="h-5 w-5 text-cyan-400" /><div><p className="text-sm font-semibold">Verified evidence summary</p><p className="mt-0.5 text-xs text-[var(--text-secondary)]">{data.summary.online} sources responded successfully; {data.summary.offline} are marked unavailable and excluded from derived values.</p></div></div></Surface>
      </div>

      <Surface className="mt-5 overflow-hidden"><div className="border-b border-[var(--border-color)] px-5 py-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Normalized evidence</p><h2 className="mt-1 text-lg font-semibold">Finding ledger</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Showing {filteredFindings.length} of {findings.length} records</p></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[230px_155px_130px_130px]"><label className="relative"><span className="sr-only">Search findings</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search evidence" className="min-h-10 w-full border border-[var(--border-color)] bg-[var(--bg-primary)] pl-9 pr-3 text-sm outline-none placeholder:text-[var(--text-secondary)] focus:border-cyan-400" /></label>{[{ value: sourceFilter, set: setSourceFilter, label: 'All sources', values: Array.from(new Set(findings.map(item => item.source))) }, { value: severityFilter, set: setSeverityFilter, label: 'All severities', values: Array.from(new Set(findings.map(item => item.severity))) }, { value: statusFilter, set: setStatusFilter, label: 'All statuses', values: Array.from(new Set(findings.map(item => item.status))) }].map(filter => <label key={filter.label} className="relative"><span className="sr-only">{filter.label}</span><select value={filter.value} onChange={event => filter.set(event.target.value)} className="min-h-10 w-full appearance-none border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 pr-8 text-xs text-[var(--text-primary)] outline-none focus:border-cyan-400"><option value="all">{filter.label}</option>{filter.values.map(value => <option key={value} value={value}>{value}</option>)}</select><Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" /></label>)}</div></div></div>
        {data.summary.loading === 6 ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-400" /><p className="mt-3 text-sm font-semibold">Validating evidence sources</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Records will appear as source checks complete.</p></div></div> : filteredFindings.length ? <div><div className="hidden grid-cols-[110px_145px_minmax(200px,1fr)_110px_110px_135px] gap-4 border-b border-[var(--border-color)] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] md:grid"><span>Severity</span><span>Source</span><span>Evidence</span><span>Status</span><span>Observed</span><span>Record ID</span></div><div className="divide-y divide-[var(--border-color)]">{filteredFindings.slice(0, 50).map(item => <article key={item.id} className="grid gap-3 px-5 py-4 transition hover:bg-cyan-400/[0.025] md:grid-cols-[110px_145px_minmax(200px,1fr)_110px_110px_135px] md:items-center"><SeverityBadge severity={item.severity} /><p className="text-xs font-medium">{item.source}</p><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 truncate text-xs text-[var(--text-secondary)]" title={item.detail}>{item.detail || 'No additional detail exposed'}</p></div><p className="text-xs capitalize text-[var(--text-secondary)]">{item.status}</p><p className="font-mono text-xs text-[var(--text-secondary)]" title={dateLabel(item.timestamp, true)}>{relativeTime(item.timestamp)}</p><p className="truncate font-mono text-[10px] text-cyan-500" title={item.id}>{item.id}</p></article>)}</div></div> : <div className="grid min-h-64 place-items-center p-8 text-center"><div>{findings.length ? <SlidersHorizontal className="mx-auto h-7 w-7 text-[var(--text-secondary)]" /> : <Archive className="mx-auto h-7 w-7 text-[var(--text-secondary)]" />}<p className="mt-3 text-sm font-semibold">{findings.length ? 'No evidence matches these filters' : 'No validated findings available'}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{findings.length ? 'Adjust or clear the filters to restore the ledger.' : 'Run a scan or connect a source to begin the evidence trail.'}</p></div></div>}
      </Surface>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Surface className="overflow-hidden"><div className="border-b border-[var(--border-color)] px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Readiness, not certification</p><h2 className="mt-1 text-lg font-semibold">Operational evidence coverage</h2><p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">These checks describe available telemetry families. They do not assert legal, regulatory, or framework compliance.</p></div><div className="divide-y divide-[var(--border-color)]">{readiness.map(item => { const percent = Math.round((item.ready / item.total) * 100); return <div key={item.label} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(180px,.8fr)_minmax(220px,1.2fr)_60px] sm:items-center"><div><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{item.detail}</p></div><div className="h-1.5 bg-slate-500/15"><div className={`h-full ${percent === 100 ? 'bg-emerald-400' : percent ? 'bg-amber-300' : 'bg-rose-400'}`} style={{ width: `${percent}%` }} /></div><p className="font-mono text-sm sm:text-right">{item.ready}/{item.total}</p></div>; })}</div></Surface>
        <Surface className="overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Export registry</p><h2 className="mt-1 text-lg font-semibold">Recent report artifacts</h2></div><FileCheck2 className="h-5 w-5 text-cyan-400" /></div>{artifacts.length ? <div className="divide-y divide-[var(--border-color)]">{artifacts.map((artifact, index) => <div key={`${artifact.generatedAt}-${index}`} className="flex items-center gap-3 px-5 py-4"><div className="grid h-9 w-9 place-items-center border border-cyan-400/20 bg-cyan-400/[0.06]"><Download className="h-4 w-4 text-cyan-400" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{artifact.name}</p><p className="mt-1 font-mono text-[10px] text-[var(--text-secondary)]">{artifact.format} · {dateLabel(artifact.generatedAt, true)}</p></div><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>)}</div> : <div className="p-5"><p className="text-sm font-semibold">No report generated this session</p><p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">Create a PDF, CSV, or JSON artifact from the validated ledger.</p><button type="button" onClick={() => setReportModalOpen(true)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">Open report builder <ChevronRight className="h-4 w-4" /></button></div>}</Surface>
      </div>

      <footer className="mt-5 flex flex-col gap-2 border-t border-[var(--border-color)] pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><Database className="h-3.5 w-3.5" />CyberShield telemetry evidence fabric</span><span>{data.summary.offline ? <><AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-400" />Partial source coverage</> : data.summary.loading ? 'Source validation in progress' : <><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />All source checks online</>}</span></footer>
      <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} data={reportData} onGenerated={artifact => setArtifacts(previous => [artifact, ...previous].slice(0, 4))} />
    </div>
  );
}
