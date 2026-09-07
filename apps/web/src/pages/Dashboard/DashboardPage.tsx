import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDown, ArrowRight, ArrowUp, Bug, Clock3, CloudOff, FileWarning,
  Globe2, MailWarning, Network, Radar, RefreshCw, ScanSearch, Server, ShieldCheck,
  Siren, Wifi, WifiOff,
} from 'lucide-react';
import {
  ComposableMap, Geographies, Geography, Graticule, Line, Marker, Sphere,
} from 'react-simple-maps';
import { useSecurityDashboard, type SourceKey, type SourceState } from '../../hooks/useSecurityDashboard';
import { formatDataRate } from '../../services/network-monitor.service';

const mapPoints = [
  { name: 'London', coordinates: [-0.13, 51.5] as [number, number], tone: '#22d3ee' },
  { name: 'São Paulo', coordinates: [-46.63, -23.55] as [number, number], tone: '#a78bfa' },
  { name: 'Virginia', coordinates: [-77.44, 37.54] as [number, number], tone: '#22d3ee' },
  { name: 'Singapore', coordinates: [103.82, 1.35] as [number, number], tone: '#f59e0b' },
  { name: 'Tokyo', coordinates: [139.69, 35.68] as [number, number], tone: '#a78bfa' },
  { name: 'Mumbai', coordinates: [72.88, 19.08] as [number, number], tone: '#fb7185' },
  { name: 'Sydney', coordinates: [151.21, -33.87] as [number, number], tone: '#22d3ee' },
  { name: 'Frankfurt', coordinates: [8.68, 50.11] as [number, number], tone: '#22d3ee' },
];

const sourceNames: Record<SourceKey, string> = {
  email: 'Email detector', phishing: 'Phishing engine', malware: 'Malware scanner',
  network: 'Network monitor', vulnerability: 'Vulnerability API', intel: 'CISA KEV feed',
};

function formatDate(value?: string | null, includeDate = false) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat(undefined, includeDate
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

function relativeTime(value?: string | null) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`border border-white/[0.09] bg-[#0b1424]/90 shadow-[0_20px_80px_rgba(0,0,0,.24)] ${className}`}>{children}</section>;
}

function SourceDot({ source, compact = false }: { source: SourceState; compact?: boolean }) {
  const styles = source.status === 'online'
    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.7)]'
    : source.status === 'loading' ? 'bg-amber-300 animate-pulse' : 'bg-rose-400';
  return (
    <span className={`inline-flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles}`} aria-hidden="true" />
      <span className={compact ? 'sr-only' : 'capitalize'}>{source.status}</span>
    </span>
  );
}

function GlobalThreatGlobe() {
  const [rotation, setRotation] = useState<[number, number, number]>([18, -12, 0]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setRotation(current => [current[0] + 0.22, current[1], current[2]]);
    }, 70);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[390px] overflow-hidden sm:h-[470px] lg:h-[560px]">
      <div className="pointer-events-none absolute inset-x-[8%] top-[10%] aspect-square rounded-full bg-cyan-400/[0.055] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,transparent_35%,#07101e_75%)]" />
      <ComposableMap projection="geoOrthographic" projectionConfig={{ rotate: rotation, scale: 258 }} width={900} height={560} className="relative h-full w-full" aria-label="Rotating illustrative world activity map">
        <Sphere id="dashboard-globe" fill="#0b2034" stroke="#276079" strokeWidth={0.8} />
        <Graticule stroke="#54d3ea" strokeWidth={0.28} strokeOpacity={0.22} />
        <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
          {({ geographies }: { geographies: Array<{ rsmKey: string; [key: string]: unknown }> }) =>
            geographies.map(geo => (
              <Geography key={geo.rsmKey} geography={geo} fill="#123149" stroke="#32708b" strokeWidth={0.38}
                style={{ default: { outline: 'none' }, hover: { outline: 'none', fill: '#16405d' }, pressed: { outline: 'none' } }} />
            ))}
        </Geographies>
        {mapPoints.slice(0, 5).map((point, index) => (
          <Line key={point.name} from={point.coordinates} to={mapPoints[(index + 3) % mapPoints.length].coordinates}
            stroke="#22d3ee" strokeWidth={0.8} strokeDasharray="2 5" opacity={0.36} />
        ))}
        {mapPoints.map(point => (
          <Marker key={point.name} coordinates={point.coordinates}>
            <g><circle r={8} fill={point.tone} opacity={0.11} /><circle r={4} fill={point.tone} opacity={0.35} /><circle r={1.9} fill={point.tone} stroke="#06101c" strokeWidth={0.8} /><title>{point.name} illustrative activity marker</title></g>
          </Marker>
        ))}
      </ComposableMap>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#07101e_0%,transparent_18%,transparent_82%,#07101e_100%)]" />
      <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-2 border-l border-cyan-300/40 bg-[#07101e]/80 px-3 py-2 text-[11px] leading-relaxed text-slate-400 backdrop-blur-sm sm:right-auto sm:max-w-sm">
        <span className="font-medium uppercase tracking-[0.16em] text-cyan-200">Illustrative activity layer</span>
        <span>Markers show ambient global context, not live geolocation. Quantitative panels use connected sources.</span>
      </div>
    </div>
  );
}

type ModuleProps = {
  title: string; eyebrow: string; value: string; detail: string; route: string; icon: ElementType;
  source: SourceState; accent: 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald'; note: string;
};

const accentStyles = {
  cyan: 'text-cyan-300 border-cyan-300/30 bg-cyan-300/[0.06]', violet: 'text-violet-300 border-violet-300/30 bg-violet-300/[0.06]',
  amber: 'text-amber-300 border-amber-300/30 bg-amber-300/[0.06]', rose: 'text-rose-300 border-rose-300/30 bg-rose-300/[0.06]',
  emerald: 'text-emerald-300 border-emerald-300/30 bg-emerald-300/[0.06]',
};

function ModuleSummary({ title, eyebrow, value, detail, route, icon: Icon, source, accent, note }: ModuleProps) {
  return (
    <Link to={route} className="group relative flex min-h-48 flex-col overflow-hidden border-t border-white/10 px-5 py-5 transition hover:bg-white/[0.035] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:border-l sm:border-t-0">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p><h3 className="mt-2 text-base font-semibold text-slate-100">{title}</h3></div><span className={`grid h-9 w-9 place-items-center border ${accentStyles[accent]}`}><Icon className="h-[18px] w-[18px]" /></span></div>
      <div className="mt-6 font-mono text-3xl font-semibold tracking-tight text-white">{value}</div>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-5 text-[11px]"><span className="flex min-w-0 items-center gap-2 text-slate-500"><SourceDot source={source} compact /><span className="truncate">{note}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300" /></div>
    </Link>
  );
}

export function DashboardPage() {
  const data = useSecurityDashboard();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const recentKev = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return data.intel?.vulnerabilities.filter(item => {
      const time = new Date(`${item.dateAdded}T00:00:00`).getTime();
      return Number.isFinite(time) && time >= cutoff;
    }).length ?? null;
  }, [data.intel]);

  const posture = useMemo(() => {
    const factors: Array<{ label: string; points: number }> = [];
    if (data.network) factors.push({ label: data.network.monitoring ? 'Network monitor active' : 'Network monitor stopped', points: data.network.monitoring ? 0 : 22 });
    if (data.vulnerability) {
      factors.push({ label: `${data.vulnerability.counts.critical} critical vulnerabilities`, points: Math.min(35, data.vulnerability.counts.critical * 7) });
      factors.push({ label: `${data.vulnerability.counts.high} high vulnerabilities`, points: Math.min(20, data.vulnerability.counts.high * 2) });
    }
    const scans = data.email.length + data.phishing.length + data.malware.length;
    if (scans) {
      const detections = data.email.filter(item => item.verdict !== 'legitimate').length + data.phishing.filter(item => item.prediction === 'phishing').length + data.malware.filter(item => item.classification === 'Malware').length;
      factors.push({ label: `${detections} flagged across ${scans} local scans`, points: Math.min(20, Math.round((detections / scans) * 20)) });
    }
    if (recentKev !== null) factors.push({ label: `${recentKev} KEV additions in 30 days`, points: Math.min(12, Math.ceil(recentKev / 3)) });
    if (!factors.length) return { score: null, label: 'Awaiting signals', factors };
    const score = Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0));
    return { score, label: score >= 70 ? 'Critical exposure' : score >= 40 ? 'Elevated risk' : score >= 15 ? 'Guarded' : 'Stable', factors };
  }, [data.email, data.malware, data.network, data.phishing, data.vulnerability, recentKev]);

  const activities = useMemo(() => {
    const items: Array<{ id: string; title: string; detail: string; source: string; time: string | null; severity: 'critical' | 'warning' | 'info' | 'ok'; route: string }> = [];
    data.email.slice(0, 3).forEach((item, index) => items.push({ id: `e-${item.id || index}`, title: item.verdict === 'legitimate' ? 'Email cleared' : `${item.verdict} email detected`, detail: item.subject || item.sender || 'Message scan', source: 'Email Spam', time: item.scannedAt, severity: item.verdict === 'spam' ? 'critical' : item.verdict === 'suspicious' ? 'warning' : 'ok', route: '/email-spam' }));
    data.phishing.slice(0, 3).forEach((item, index) => items.push({ id: `p-${item.id || index}`, title: item.prediction === 'phishing' ? 'Phishing URL detected' : 'URL cleared', detail: item.url, source: 'Phishing', time: item.scannedAt, severity: item.prediction === 'phishing' ? 'critical' : 'ok', route: '/phishing' }));
    data.malware.slice(0, 3).forEach((item, index) => items.push({ id: `m-${item.id || index}`, title: item.classification === 'Malware' ? 'Malware detected' : 'File scan completed', detail: `${item.filename} · ${item.family}`, source: 'Threat Detection', time: item.timestamp, severity: item.classification === 'Malware' ? 'critical' : 'ok', route: '/malware' }));
    data.vulnerability?.recent.slice(0, 4).forEach(item => items.push({ id: `v-${item.id}`, title: `${item.severity} vulnerability`, detail: `${item.cve || 'Finding'} · ${item.title}`, source: 'Vulnerability', time: item.updated_at || item.created_at, severity: item.severity === 'Critical' ? 'critical' : item.severity === 'High' ? 'warning' : 'info', route: '/vulnerability' }));
    data.intel?.vulnerabilities.slice(0, 3).forEach(item => items.push({ id: `i-${item.cveID}`, title: 'Known exploited vulnerability', detail: `${item.cveID} · ${item.vulnerabilityName}`, source: 'CISA KEV', time: item.dateAdded, severity: 'warning', route: '/threat-intelligence' }));
    if (data.network) items.push({ id: 'network-status', title: data.network.monitoring ? 'Network telemetry active' : 'Network monitor stopped', detail: `${data.network.connection_count} connections · ${data.network.established} established`, source: 'Network', time: data.network.updated, severity: data.network.monitoring ? 'info' : 'critical', route: '/network' });
    return items.sort((a, b) => {
      const severity = { critical: 4, warning: 3, info: 2, ok: 1 };
      const score = severity[b.severity] - severity[a.severity];
      if (score) return score;
      return (new Date(b.time || 0).getTime() || 0) - (new Date(a.time || 0).getTime() || 0);
    }).slice(0, 9);
  }, [data.email, data.intel, data.malware, data.network, data.phishing, data.vulnerability]);

  const detectorCount = data.email.length + data.phishing.length + data.malware.length;
  const detectionCount = data.email.filter(item => item.verdict !== 'legitimate').length + data.phishing.filter(item => item.prediction === 'phishing').length + data.malware.filter(item => item.classification === 'Malware').length;
  const sourceSummary = data.summary.loading ? 'Connecting sources' : data.summary.offline ? 'Partial coverage' : 'All sources online';
  const sourceTone = data.summary.loading || data.summary.offline ? 'text-amber-300' : 'text-emerald-300';
  const modules: ModuleProps[] = [
    { title: 'Email Spam', eyebrow: 'Message intelligence', value: data.email.length ? String(data.email.length) : '—', detail: data.email.length ? `${data.email.filter(item => item.verdict === 'spam').length} spam · latest ${data.email[0].verdict}` : 'No scans yet', route: '/email-spam', icon: MailWarning, source: data.sources.email, accent: 'cyan', note: data.sources.email.status === 'online' ? 'Detector ready' : 'Local history available' },
    { title: 'Phishing', eyebrow: 'URL analysis', value: data.phishing.length ? String(data.phishing.length) : '—', detail: data.phishing.length ? `${data.phishing.filter(item => item.prediction === 'phishing').length} malicious · latest ${data.phishing[0].prediction}` : 'No scans yet', route: '/phishing', icon: FileWarning, source: data.sources.phishing, accent: 'amber', note: data.sources.phishing.status === 'online' ? 'Engine ready' : 'Service unavailable' },
    { title: 'Threat Detection', eyebrow: 'File intelligence', value: data.malware.length ? String(data.malware.length) : '—', detail: data.malware.length ? `${data.malware.filter(item => item.classification === 'Malware').length} threats · latest ${data.malware[0].classification}` : 'No scans yet', route: '/malware', icon: Bug, source: data.sources.malware, accent: 'rose', note: data.sources.malware.status === 'online' ? 'Scanner ready' : 'Service unavailable' },
    { title: 'Vulnerability Management', eyebrow: 'Exposure', value: data.vulnerability ? String(data.vulnerability.counts.total) : '—', detail: data.vulnerability ? `${data.vulnerability.counts.critical} critical · ${data.vulnerability.counts.high} high` : 'Inventory unavailable', route: '/vulnerability', icon: ScanSearch, source: data.sources.vulnerability, accent: 'violet', note: data.vulnerability ? `${data.vulnerability.counts.assets} assets` : 'API unavailable' },
    { title: 'Network Monitoring', eyebrow: 'Traffic', value: data.network ? String(data.network.connection_count) : '—', detail: data.network ? `${data.network.established} established · ${data.network.interfaces.filter(item => item.is_up).length} interfaces up` : 'Telemetry unavailable', route: '/network', icon: Network, source: data.sources.network, accent: 'emerald', note: data.network?.monitoring ? 'Monitoring active' : 'Monitor unavailable' },
    { title: 'Threat Intelligence', eyebrow: 'CISA KEV', value: data.intel ? String(data.intel.declaredCount ?? data.intel.vulnerabilities.length) : '—', detail: data.intel ? `${recentKev ?? 0} catalog additions in 30 days` : 'Catalog unavailable', route: '/threat-intelligence', icon: Radar, source: data.sources.intel, accent: 'violet', note: data.intel ? `Catalog ${data.intel.catalogVersion || 'current'}` : 'Feed unavailable' },
  ];

  return (
    <div className="relative mx-auto max-w-[1640px] overflow-hidden pb-8 text-slate-200">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(34,211,238,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.025)_1px,transparent_1px)] bg-[size:34px_34px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <header className="mb-5 flex flex-col justify-between gap-5 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-end">
        <div className="min-w-0"><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300 sm:text-[11px] sm:tracking-[0.22em]"><ShieldCheck className="h-4 w-4 shrink-0" /> Cyberium Shield / Command Center</div><h1 className="max-w-[340px] text-[26px] font-semibold leading-tight tracking-[-0.035em] text-white sm:max-w-none sm:text-4xl">Security Operations Overview</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Live posture across detection, infrastructure exposure, traffic and global threat intelligence.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="border-l border-white/10 px-4"><p className="font-mono text-sm text-slate-200">{formatDate(now.toISOString())}</p><p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · Local time</p></div>
          <div className="border-l border-white/10 px-4"><p className={`flex items-center gap-2 text-sm font-medium ${sourceTone}`}><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-current" /></span>{sourceSummary}</p><p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">{data.summary.online}/6 online · {data.summary.offline} offline</p></div>
          <button type="button" onClick={() => void data.refreshAll()} disabled={data.isRefreshing} className="inline-flex min-h-11 items-center gap-2 border border-cyan-300/30 bg-cyan-300/[0.08] px-4 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-wait disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${data.isRefreshing ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,.68fr)]">
        <Surface className="relative overflow-hidden bg-[#07101e]"><div className="absolute left-5 top-5 z-10"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Global signal canvas</p><h2 className="mt-1 text-xl font-semibold text-white">Activity orbit</h2></div><div className="absolute right-5 top-5 z-10 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-400"><Globe2 className="h-3.5 w-3.5 text-cyan-300" /> Auto-rotating</div><GlobalThreatGlobe /></Surface>
        <Surface className="relative flex min-h-[480px] flex-col overflow-hidden p-6">
          <div className="absolute right-0 top-0 h-48 w-48 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.13),transparent_67%)]" />
          <div className="relative flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Derived posture</p><h2 className="mt-2 text-xl font-semibold text-white">Operational risk</h2></div><Siren className={posture.score !== null && posture.score >= 40 ? 'h-6 w-6 text-rose-300' : 'h-6 w-6 text-cyan-300'} /></div>
          <div className="relative mt-10 flex items-end gap-3"><span className="font-mono text-7xl font-light leading-none tracking-[-0.08em] text-white">{posture.score ?? '—'}</span><span className="mb-1 text-xs uppercase tracking-[0.16em] text-slate-500">/ 100<br />risk pressure</span></div>
          <div className="relative mt-5 h-1.5 overflow-hidden bg-white/[0.07]" role="meter" aria-label="Operational risk score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={posture.score ?? undefined}>{posture.score !== null && <div className={`h-full transition-[width] duration-700 ${posture.score >= 70 ? 'bg-rose-400' : posture.score >= 40 ? 'bg-amber-300' : 'bg-cyan-300'}`} style={{ width: `${posture.score}%` }} />}</div>
          <div className="relative mt-3 flex items-center justify-between"><span className="text-sm font-semibold text-slate-200">{posture.label}</span><span tabIndex={0} className="text-[11px] text-slate-500 outline-none focus:text-cyan-200" title="Risk is derived from available network status, vulnerability severity, local scan verdicts and recent CISA KEV additions." aria-label="Risk is derived from available network status, vulnerability severity, local scan verdicts and recent CISA KEV additions.">Available signals only</span></div>
          <div className="relative mt-7 border-t border-white/[0.08] pt-4"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Contributing factors</p><div className="space-y-3">{posture.factors.length ? posture.factors.slice(0, 5).map(factor => <div key={factor.label} className="flex items-center justify-between gap-4 text-xs"><span className="flex min-w-0 items-center gap-2 text-slate-400"><span className={`h-1 w-1 shrink-0 rounded-full ${factor.points ? 'bg-amber-300' : 'bg-emerald-300'}`} />{factor.label}</span><span className="font-mono text-slate-300">+{factor.points}</span></div>) : <p className="text-sm text-slate-500">Connect a data source or run a local scan to calculate posture.</p>}</div></div>
          <p className="relative mt-auto pt-6 text-[11px] leading-relaxed text-slate-600">This score is an explainable snapshot, not a compliance grade. Missing sources are excluded rather than estimated.</p>
        </Surface>
      </div>

      <Surface className="mt-5 overflow-hidden"><div className="flex flex-col border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Detection fabric</p><h2 className="mt-1 text-lg font-semibold text-white">Six connected operations</h2></div><p className="mt-2 font-mono text-xs text-slate-500 sm:mt-0">{detectorCount} local scans / {detectionCount} flagged</p></div><div className="grid sm:grid-cols-2 xl:grid-cols-6">{modules.map(module => <ModuleSummary key={module.title} {...module} />)}</div></Surface>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.7fr)]">
        <Surface className="overflow-hidden"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300">Prioritized queue</p><h2 className="mt-1 text-lg font-semibold text-white">Live attention feed</h2></div><Activity className="h-5 w-5 text-cyan-300" /></div>
          {activities.length ? <div className="divide-y divide-white/[0.06]">{activities.map(item => { const tone = item.severity === 'critical' ? 'bg-rose-400' : item.severity === 'warning' ? 'bg-amber-300' : item.severity === 'ok' ? 'bg-emerald-300' : 'bg-cyan-300'; return <Link key={item.id} to={item.route} className="group grid gap-3 px-5 py-4 transition hover:bg-white/[0.025] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:grid-cols-[12px_minmax(0,1fr)_150px_18px] sm:items-center"><span className={`h-1.5 w-1.5 rounded-full ${tone}`} /><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200">{item.title}</p><p className="mt-1 truncate text-xs text-slate-500">{item.detail}</p></div><div className="text-left sm:text-right"><p className="text-[11px] font-medium text-slate-400">{item.source}</p><p className="mt-1 font-mono text-[10px] text-slate-600" title={formatDate(item.time, true)}>{relativeTime(item.time)}</p></div><ArrowRight className="hidden h-4 w-4 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-cyan-300 sm:block" /></Link>; })}</div> : <div className="grid min-h-72 place-items-center px-6 text-center"><div><CloudOff className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm font-medium text-slate-300">No activity yet</p><p className="mt-1 text-xs text-slate-500">Run a scan or connect a service to populate this feed.</p></div></div>}
        </Surface>
        <div className="grid gap-5">
          <Surface className="p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Network pulse</p><h2 className="mt-1 text-lg font-semibold text-white">Traffic now</h2></div>{data.network?.monitoring ? <Wifi className="h-5 w-5 text-emerald-300" /> : <WifiOff className="h-5 w-5 text-slate-600" />}</div><div className="mt-6 grid grid-cols-2 gap-px bg-white/[0.08]"><div className="bg-[#0b1424] py-4 pr-4"><ArrowUp className="h-4 w-4 text-violet-300" /><p className="mt-3 font-mono text-xl text-white">{data.network ? formatDataRate(data.network.upload_bps) : '—'}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Outbound</p></div><div className="bg-[#0b1424] py-4 pl-4"><ArrowDown className="h-4 w-4 text-cyan-300" /><p className="mt-3 font-mono text-xl text-white">{data.network ? formatDataRate(data.network.download_bps) : '—'}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Inbound</p></div></div></Surface>
          <Surface className="overflow-hidden"><div className="border-b border-white/[0.08] px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">Data integrity</p><h2 className="mt-1 text-lg font-semibold text-white">Source health</h2></div><div className="divide-y divide-white/[0.06]">{(Object.keys(sourceNames) as SourceKey[]).map(key => { const source = data.sources[key]; return <div key={key} className="flex items-center justify-between gap-3 px-5 py-3 text-xs"><span className="flex items-center gap-2 text-slate-300"><SourceDot source={source} compact />{sourceNames[key]}</span><span className="font-mono text-[10px] text-slate-600">{source.status === 'loading' ? 'Connecting' : source.updatedAt ? formatDate(source.updatedAt) : 'Unavailable'}</span></div>; })}</div><div className="flex items-center gap-2 border-t border-white/[0.08] bg-white/[0.015] px-5 py-3 text-[10px] text-slate-600"><Clock3 className="h-3.5 w-3.5" />Last full refresh {data.lastSync ? relativeTime(data.lastSync) : 'in progress'}</div></Surface>
        </div>
      </div>
      <footer className="mt-5 flex flex-col gap-2 border-t border-white/[0.08] pt-4 text-[10px] uppercase tracking-[0.14em] text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><Server className="h-3.5 w-3.5" />Cyberium Shield telemetry fabric</span><span>Unavailable values are never estimated</span></footer>
    </div>
  );
}
