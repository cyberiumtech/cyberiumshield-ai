import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDown, ArrowRight, ArrowUp, Bug, Clock3, CloudOff, FileWarning,
  Globe2, MailWarning, Network, Pause, Play, Radar, RefreshCw, ScanSearch, Server, ShieldCheck,
  Siren, Wifi, WifiOff,
} from 'lucide-react';
import {
  ComposableMap, Geographies, Geography, Graticule, Line, Marker, Sphere,
} from 'react-simple-maps';
import { useSecurityDashboard, type SourceKey, type SourceState } from '../../hooks/useSecurityDashboard';
import { formatDataRate } from '../../services/network-monitor.service';

const mapPoints = [
  { name: 'London', coordinates: [-0.13, 51.5] as [number, number], tone: '#38bdf8' },
  { name: 'São Paulo', coordinates: [-46.63, -23.55] as [number, number], tone: '#a855f7' },
  { name: 'Virginia', coordinates: [-77.44, 37.54] as [number, number], tone: '#38bdf8' },
  { name: 'Singapore', coordinates: [103.82, 1.35] as [number, number], tone: '#f59e0b' },
  { name: 'Tokyo', coordinates: [139.69, 35.68] as [number, number], tone: '#a855f7' },
  { name: 'Mumbai', coordinates: [72.88, 19.08] as [number, number], tone: '#f43f5e' },
  { name: 'Sydney', coordinates: [151.21, -33.87] as [number, number], tone: '#38bdf8' },
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
  return <section className={`border border-cyan-500/15 bg-[#060b18]/90 backdrop-blur-md shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] ${className}`}>{children}</section>;
}

function SourceDot({ source, compact = false }: { source: SourceState; compact?: boolean }) {
  const styles = source.status === 'online'
    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]'
    : source.status === 'loading' ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]';
  return (
    <span className={`inline-flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles}`} aria-hidden="true" />
      <span className={compact ? 'sr-only' : 'capitalize'}>{source.status}</span>
    </span>
  );
}

function GlobalThreatGlobe({ isPaused }: { isPaused: boolean }) {
  const [rotation, setRotation] = useState<[number, number, number]>([18, -12, 0]);
  const [projectionScale, setProjectionScale] = useState(258);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateScale = () => setProjectionScale(window.innerWidth < 640 ? 178 : 258);
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    let lastTimestamp: number | null = null;
    const degreesPerMillisecond = 360 / 60_000;

    const animate = (timestamp: number) => {
      animationFrameRef.current = null;
      if (document.visibilityState !== 'visible') {
        lastTimestamp = null;
        return;
      }

      if (lastTimestamp !== null) {
        const elapsed = timestamp - lastTimestamp;
        setRotation(current => [
          (current[0] + elapsed * degreesPerMillisecond) % 360,
          current[1],
          current[2],
        ]);
      }
      lastTimestamp = timestamp;
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (document.visibilityState === 'visible' && animationFrameRef.current === null) {
        lastTimestamp = null;
        animationFrameRef.current = window.requestAnimationFrame(animate);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        lastTimestamp = null;
      } else {
        startAnimation();
      }
    };

    startAnimation();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPaused]);

  return (
    <div className="relative h-[390px] overflow-hidden sm:h-[470px] lg:h-[560px]">
      <div className="pointer-events-none absolute inset-x-[8%] top-[10%] aspect-square rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,transparent_25%,#030712_85%)]" />
      <ComposableMap projection="geoOrthographic" projectionConfig={{ rotate: rotation, scale: projectionScale }} width={900} height={560} className="relative h-full w-full" aria-label="Rotating illustrative world activity map">
        <Sphere id="dashboard-globe" fill="#081326" stroke="#16385c" strokeWidth={0.8} />
        <Graticule stroke="#38bdf8" strokeWidth={0.25} strokeOpacity={0.2} />
        <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
          {({ geographies }: { geographies: Array<{ rsmKey: string; [key: string]: unknown }> }) =>
            geographies.map(geo => (
              <Geography key={geo.rsmKey} geography={geo} fill="#0d243a" stroke="#1e4e78" strokeWidth={0.4}
                style={{ default: { outline: 'none' }, hover: { outline: 'none', fill: '#15395b' }, pressed: { outline: 'none' } }} />
            ))}
        </Geographies>
        {mapPoints.slice(0, 5).map((point, index) => (
          <Line key={point.name} from={point.coordinates} to={mapPoints[(index + 3) % mapPoints.length].coordinates}
            stroke="#38bdf8" strokeWidth={0.8} strokeDasharray="2 5" opacity={0.5} />
        ))}
        {mapPoints.map(point => (
          <Marker key={point.name} coordinates={point.coordinates}>
            <g><circle r={9} fill={point.tone} opacity={0.15} /><circle r={4} fill={point.tone} opacity={0.5} /><circle r={2} fill={point.tone} stroke="#030712" strokeWidth={0.8} /><title>{point.name} illustrative activity marker</title></g>
          </Marker>
        ))}
      </ComposableMap>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#030712_0%,transparent_18%,transparent_82%,#030712_100%)]" />
      <div className="absolute bottom-4 left-4 right-4 min-w-0 border-l-2 border-cyan-400 bg-[#030712]/95 px-3.5 py-2.5 text-xs leading-relaxed text-slate-300 shadow-lg backdrop-blur-md sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-sm">
        <span className="font-semibold uppercase tracking-[0.18em] text-cyan-400">Illustrative activity layer</span>
      </div>
    </div>
  );
}

type ModuleProps = {
  title: string; eyebrow: string; value: string; detail: string; route: string; icon: ElementType;
  source: SourceState; accent: 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald'; note: string;
};

const accentStyles = {
  cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.12)]',
  violet: 'text-purple-400 border-purple-500/30 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.12)]',
  amber: 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.12)]',
  rose: 'text-rose-400 border-rose-500/30 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.12)]',
  emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.12)]',
};

function ModuleSummary({ title, eyebrow, value, detail, route, icon: Icon, source, accent, note }: ModuleProps) {
  return (
    <Link to={route} className="group relative flex min-h-48 flex-col overflow-hidden border-t border-cyan-500/10 px-5 py-5 transition hover:bg-cyan-500/[0.04] hover:border-cyan-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 sm:border-l sm:border-t-0">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p><h3 className="mt-2 text-base font-semibold text-slate-100">{title}</h3></div><span className={`grid h-9 w-9 place-items-center border ${accentStyles[accent]}`}><Icon className="h-[18px] w-[18px]" /></span></div>
      <div className="mt-6 font-mono text-3xl font-bold tracking-tight text-white">{value}</div>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-5 text-xs"><span className="flex min-w-0 items-center gap-2 text-slate-400"><SourceDot source={source} compact /><span className="truncate">{note}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-400" /></div>
    </Link>
  );
}

export function DashboardPage() {
  const data = useSecurityDashboard();
  const [now, setNow] = useState(new Date());
  const [isGlobePaused, setIsGlobePaused] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

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
  const sourceTone = data.summary.loading || data.summary.offline ? 'text-amber-400' : 'text-emerald-400';
  const modules: ModuleProps[] = [
    { title: 'Email Spam', eyebrow: 'Message intelligence', value: data.email.length ? String(data.email.length) : '—', detail: data.email.length ? `${data.email.filter(item => item.verdict === 'spam').length} spam · latest ${data.email[0].verdict}` : 'No scans yet', route: '/email-spam', icon: MailWarning, source: data.sources.email, accent: 'cyan', note: data.sources.email.status === 'online' ? 'Detector ready' : 'Local history available' },
    { title: 'Phishing', eyebrow: 'URL analysis', value: data.phishing.length ? String(data.phishing.length) : '—', detail: data.phishing.length ? `${data.phishing.filter(item => item.prediction === 'phishing').length} malicious · latest ${data.phishing[0].prediction}` : 'No scans yet', route: '/phishing', icon: FileWarning, source: data.sources.phishing, accent: 'amber', note: data.sources.phishing.status === 'online' ? 'Engine ready' : 'Service unavailable' },
    { title: 'Malware Detection', eyebrow: 'File intelligence', value: data.malware.length ? String(data.malware.length) : '—', detail: data.malware.length ? `${data.malware.filter(item => item.classification === 'Malware').length} threats · latest ${data.malware[0].classification}` : 'No scans yet', route: '/malware', icon: Bug, source: data.sources.malware, accent: 'rose', note: data.sources.malware.status === 'online' ? 'Scanner ready' : 'Service unavailable' },
    { title: 'Vulnerability Management', eyebrow: 'Exposure', value: data.vulnerability ? String(data.vulnerability.counts.total) : '—', detail: data.vulnerability ? `${data.vulnerability.counts.critical} critical · ${data.vulnerability.counts.high} high` : 'Inventory unavailable', route: '/vulnerability', icon: ScanSearch, source: data.sources.vulnerability, accent: 'violet', note: data.vulnerability ? `${data.vulnerability.counts.assets} assets` : 'API unavailable' },
    { title: 'Network Monitoring', eyebrow: 'Traffic', value: data.network ? String(data.network.connection_count) : '—', detail: data.network ? `${data.network.established} established · ${data.network.interfaces.filter(item => item.is_up).length} interfaces up` : 'Telemetry unavailable', route: '/network', icon: Network, source: data.sources.network, accent: 'emerald', note: data.network?.monitoring ? 'Monitoring active' : 'Monitor unavailable' },
    { title: 'Threat Intelligence', eyebrow: 'CISA KEV', value: data.intel ? String(data.intel.declaredCount ?? data.intel.vulnerabilities.length) : '—', detail: data.intel ? `${recentKev ?? 0} catalog additions in 30 days` : 'Catalog unavailable', route: '/threat-intelligence', icon: Radar, source: data.sources.intel, accent: 'violet', note: data.intel ? `Catalog ${data.intel.catalogVersion || 'current'}` : 'Feed unavailable' },
  ];

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[1640px] pb-8 text-slate-200">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(56,189,248,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.035)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <header className="mb-5 flex flex-col justify-between gap-5 border-b border-cyan-500/15 pb-5 xl:flex-row xl:items-end">
        <div className="min-w-0"><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400 sm:text-[11px]"><ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]" /> cyber Shield / Command Center</div><h1 className="max-w-[340px] text-[26px] font-bold leading-tight tracking-tight text-white sm:max-w-none sm:text-4xl">Security Operations Overview</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Live posture across detection, infrastructure exposure, traffic and global threat intelligence.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 border-l border-cyan-500/20 px-4"><p className="font-mono text-sm font-medium text-slate-200">{formatDate(now.toISOString())}</p><p className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-400">{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · Local time</p></div>
          <div className="min-w-0 border-l border-cyan-500/20 px-4"><p className={`flex items-center gap-2 text-sm font-semibold ${sourceTone}`}><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" /></span>{sourceSummary}</p><p className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-400">{data.summary.online}/6 online · {data.summary.offline} offline</p></div>
          <button type="button" onClick={() => void data.refreshAll()} disabled={data.isRefreshing} className="inline-flex min-h-11 items-center gap-2 border border-cyan-500/40 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] transition hover:bg-cyan-500/20 hover:border-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-wait disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${data.isRefreshing ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,.68fr)]">
        <Surface className="relative min-w-0 overflow-hidden bg-[#030712]">
          <div className="relative z-10 flex min-w-0 flex-col gap-3 border-b border-cyan-500/10 px-5 py-4 sm:absolute sm:inset-x-0 sm:top-0 sm:flex-row sm:items-start sm:justify-between sm:border-0">
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-400" aria-live="polite">
                <Globe2 className={`h-3.5 w-3.5 ${isGlobePaused ? 'text-slate-500' : 'text-cyan-400'}`} />
                {isGlobePaused ? 'Paused' : 'Rotating'}
              </div>
              <button
                type="button"
                onClick={() => setIsGlobePaused(current => !current)}
                aria-label={isGlobePaused ? 'Resume globe rotation' : 'Pause globe rotation'}
                aria-pressed={!isGlobePaused}
                className="inline-flex min-h-9 items-center gap-1.5 border border-cyan-500/30 bg-[#030712]/90 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)] transition hover:border-cyan-400 hover:bg-cyan-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {isGlobePaused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
                {isGlobePaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
          <GlobalThreatGlobe isPaused={isGlobePaused} />
        </Surface>
        <Surface className="relative flex min-h-[480px] flex-col overflow-hidden p-6">
          <div className="absolute right-0 top-0 h-56 w-56 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.15),transparent_65%)]" />
          <div className="relative flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Derived posture</p><h2 className="mt-2 text-xl font-bold text-white">Operational risk</h2></div><Siren className={posture.score !== null && posture.score >= 40 ? 'h-6 w-6 text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]' : 'h-6 w-6 text-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.5)]'} /></div>
          <div className="relative mt-10 flex items-end gap-3"><span className="font-mono text-7xl font-extralight leading-none tracking-tighter text-white">{posture.score ?? '—'}</span><span className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">/ 100<br />risk pressure</span></div>
          <div className="relative mt-5 h-1.5 overflow-hidden bg-slate-900" role="meter" aria-label="Operational risk score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={posture.score ?? undefined}>{posture.score !== null && <div className={`h-full transition-[width] duration-700 ${posture.score >= 70 ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_15px_rgba(244,63,94,0.7)]' : posture.score >= 40 ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_15px_rgba(251,191,36,0.7)]' : 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_15px_rgba(56,189,248,0.7)]'}`} style={{ width: `${posture.score}%` }} />}</div>
          <div className="relative mt-3 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-semibold text-slate-200">{posture.label}</span><span tabIndex={0} className="text-xs text-slate-400 outline-none focus:text-cyan-300" title="Risk is derived from available network status, vulnerability severity, local scan verdicts and recent CISA KEV additions." aria-label="Risk is derived from available network status, vulnerability severity, local scan verdicts and recent CISA KEV additions.">Available signals only</span></div>
          <div className="relative mt-7 border-t border-cyan-500/10 pt-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Contributing factors</p><div className="space-y-3">{posture.factors.length ? posture.factors.slice(0, 5).map(factor => <div key={factor.label} className="flex items-center justify-between gap-4 text-xs"><span className="flex min-w-0 items-center gap-2 text-slate-300"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${factor.points ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'}`} />{factor.label}</span><span className="font-mono font-semibold text-slate-200">+{factor.points}</span></div>) : <p className="text-sm text-slate-500">Connect a data source or run a local scan to calculate posture.</p>}</div></div>
          <p className="relative mt-auto pt-6 text-xs leading-relaxed text-slate-400">This score is an explainable snapshot, not a compliance grade. Missing sources are excluded rather than estimated.</p>
        </Surface>
      </div>

      <Surface className="mt-5 overflow-hidden"><div className="flex flex-col border-b border-cyan-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Detection fabric</p><h2 className="mt-1 text-lg font-semibold text-white">Six connected operations</h2></div><p className="mt-2 font-mono text-xs font-medium text-slate-400 sm:mt-0">{detectorCount} local scans / {detectionCount} flagged</p></div><div className="grid sm:grid-cols-2 xl:grid-cols-6">{modules.map(module => <ModuleSummary key={module.title} {...module} />)}</div></Surface>

      <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.7fr)]">
        <Surface className="overflow-hidden"><div className="flex items-center justify-between border-b border-cyan-500/10 px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">Prioritized queue</p><h2 className="mt-1 text-lg font-semibold text-white">Live attention feed</h2></div><Activity className="h-5 w-5 text-cyan-400" /></div>
          {activities.length ? <div className="divide-y divide-cyan-500/10">{activities.map(item => { const tone = item.severity === 'critical' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]' : item.severity === 'warning' ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]' : item.severity === 'ok' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]' : 'bg-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]'; return <Link key={item.id} to={item.route} className="group grid min-w-0 gap-3 px-5 py-4 transition hover:bg-cyan-500/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 sm:grid-cols-[12px_minmax(0,1fr)_150px_18px] sm:items-center"><span className={`h-1.5 w-1.5 rounded-full ${tone}`} /><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200">{item.title}</p><p className="mt-1 truncate text-xs text-slate-400">{item.detail}</p></div><div className="text-left sm:text-right"><p className="text-xs font-semibold text-slate-300">{item.source}</p><p className="mt-1 font-mono text-xs text-slate-400" title={formatDate(item.time, true)}>{relativeTime(item.time)}</p></div><ArrowRight className="hidden h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-400 sm:block" /></Link>; })}</div> : <div className="grid min-h-72 place-items-center px-6 text-center"><div><CloudOff className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm font-medium text-slate-300">No activity yet</p><p className="mt-1 text-xs text-slate-400">Run a scan or connect a service to populate this feed.</p></div></div>}
        </Surface>
        <div className="grid gap-5">
          <Surface className="p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Network pulse</p><h2 className="mt-1 text-lg font-semibold text-white">Traffic now</h2></div>{data.network?.monitoring ? <Wifi className="h-5 w-5 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" /> : <WifiOff className="h-5 w-5 text-slate-600" />}</div><div className="mt-6 grid grid-cols-2 gap-px bg-cyan-500/10"><div className="bg-[#030712] py-4 pr-4"><ArrowUp className="h-4 w-4 text-purple-400" /><p className="mt-3 font-mono text-xl font-bold text-white">{data.network ? formatDataRate(data.network.upload_bps) : '—'}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Outbound</p></div><div className="bg-[#030712] py-4 pl-4"><ArrowDown className="h-4 w-4 text-cyan-400" /><p className="mt-3 font-mono text-xl font-bold text-white">{data.network ? formatDataRate(data.network.download_bps) : '—'}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Inbound</p></div></div></Surface>
          <Surface className="min-w-0 overflow-hidden"><div className="border-b border-cyan-500/10 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">Data integrity</p><h2 className="mt-1 text-lg font-semibold text-white">Source health</h2></div><div className="divide-y divide-cyan-500/10">{(Object.keys(sourceNames) as SourceKey[]).map(key => { const source = data.sources[key]; return <div key={key} className="flex min-w-0 flex-col items-start justify-between gap-1 px-5 py-3 text-xs sm:flex-row sm:items-center sm:gap-3"><span className="flex min-w-0 items-center gap-2 text-slate-200"><SourceDot source={source} compact />{sourceNames[key]}</span><span className="font-mono text-xs text-slate-400">{source.status === 'loading' ? 'Connecting' : source.updatedAt ? formatDate(source.updatedAt) : 'Unavailable'}</span></div>; })}</div><div className="flex items-center gap-2 border-t border-cyan-500/10 bg-cyan-500/[0.02] px-5 py-3 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5 shrink-0" />Last full refresh {data.lastSync ? relativeTime(data.lastSync) : 'in progress'}</div></Surface>
        </div>
      </div>
      <footer className="mt-5 flex flex-col gap-2 border-t border-cyan-500/15 pt-4 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><Server className="h-3.5 w-3.5 text-cyan-500" />cyber Shield telemetry fabric</span><span>Unavailable values are never estimated</span></footer>
    </div>
  );
}