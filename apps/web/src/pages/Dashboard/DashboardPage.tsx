import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDown, ArrowRight, ArrowUp, Bug, Clock3, CloudOff, FileWarning,
  Globe2, MailWarning, Network, Pause, Play, Radar, RefreshCw, ScanSearch, Server, ShieldCheck,
  Siren, Wifi, WifiOff, Zap, AlertTriangle, CheckCircle2, ShieldAlert
} from 'lucide-react';
import {
  ComposableMap, Geographies, Geography, Graticule, Line, Marker, Sphere,
} from 'react-simple-maps';
import { useSecurityDashboard, type SourceKey, type SourceState } from '../../hooks/useSecurityDashboard';
import { formatDataRate } from '../../services/network-monitor.service';

const mapPoints = [
  { name: 'London', coordinates: [-0.13, 51.5] as [number, number], tone: '#38bdf8' },
  { name: 'São Paulo', coordinates: [-46.63, -23.55] as [number, number], tone: '#c084fc' },
  { name: 'Virginia', coordinates: [-77.44, 37.54] as [number, number], tone: '#38bdf8' },
  { name: 'Singapore', coordinates: [103.82, 1.35] as [number, number], tone: '#fbbf24' },
  { name: 'Tokyo', coordinates: [139.69, 35.68] as [number, number], tone: '#c084fc' },
  { name: 'Mumbai', coordinates: [72.88, 19.08] as [number, number], tone: '#f43f5e' },
  { name: 'Sydney', coordinates: [151.21, -33.87] as [number, number], tone: '#38bdf8' },
];

const sourceNames: Record<SourceKey, string> = {
  email: 'Email Detector', phishing: 'Phishing Engine', malware: 'Malware Scanner',
  network: 'Network Monitor', vulnerability: 'Vulnerability API', intel: 'CISA KEV Feed',
};

function formatDate(value?: string | null, includeDate = false) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat(undefined, includeDate
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

function relativeTime(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
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
  return (
    <section className={`relative overflow-hidden rounded-lg border border-slate-800/90 bg-slate-900/70 backdrop-blur-md shadow-lg shadow-black/40 ${className}`}>
      {children}
    </section>
  );
}

function SourceDot({ source, compact = false }: { source: SourceState; compact?: boolean }) {
  const isOnline = source.status === 'online';
  const isLoading = source.status === 'loading';

  const dotStyles = isOnline
    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
    : isLoading
      ? 'bg-amber-400 animate-pulse'
      : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';

  return (
    <span className={`inline-flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <span className="relative flex h-2 w-2">
        {isOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />}
        <span className={`relative h-2 w-2 rounded-full ${dotStyles}`} />
      </span>
      {!compact && <span className="capitalize text-slate-300 font-medium">{source.status}</span>}
    </span>
  );
}

function RiskScoreGauge({ score }: { score: number | null }) {
  const displayScore = score ?? 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const colorClass = displayScore >= 70 
    ? 'text-rose-500 stroke-rose-500' 
    : displayScore >= 40 
      ? 'text-amber-400 stroke-amber-400' 
      : 'text-cyan-400 stroke-cyan-400';

  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-28 w-28 -rotate-90 transform" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} className="stroke-slate-800/80" strokeWidth="7" fill="transparent" />
        {score !== null && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={`transition-all duration-700 ease-out ${colorClass}`}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
          {score !== null ? score : '—'}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Risk Score</span>
      </div>
    </div>
  );
}

function GlobalThreatGlobe({ isPaused }: { isPaused: boolean }) {
  const [rotation, setRotation] = useState<[number, number, number]>([18, -12, 0]);
  const [projectionScale, setProjectionScale] = useState(190);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateScale = () => setProjectionScale(window.innerWidth < 640 ? 140 : 190);
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    let lastTimestamp: number | null = null;
    const degreesPerMillisecond = 360 / 75_000;

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
    <div className="relative h-[290px] overflow-hidden rounded-b-lg sm:h-[340px] lg:h-[360px]">
      <div className="pointer-events-none absolute inset-x-[15%] top-[10%] aspect-square rounded-full bg-cyan-500/10 blur-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_35%,#090d16_90%)]" />
      
      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={{ rotate: rotation, scale: projectionScale }}
        width={800}
        height={400}
        className="relative h-full w-full"
        aria-label="Global attack map telemetry"
      >
        <Sphere id="dashboard-globe" fill="#0c1726" stroke="#1d304a" strokeWidth={0.8} />
        <Graticule stroke="#38bdf8" strokeWidth={0.3} strokeOpacity={0.18} />
        <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
          {({ geographies }: { geographies: Array<{ rsmKey: string; [key: string]: unknown }> }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#132338"
                stroke="#1d4ed8"
                strokeWidth={0.3}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none', fill: '#1d3a68' },
                  pressed: { outline: 'none' },
                }}
              />
            ))}
        </Geographies>
        {mapPoints.slice(0, 5).map((point, index) => (
          <Line
            key={point.name}
            from={point.coordinates}
            to={mapPoints[(index + 3) % mapPoints.length].coordinates}
            stroke="#38bdf8"
            strokeWidth={0.8}
            strokeDasharray="2 3"
            opacity={0.4}
          />
        ))}
        {mapPoints.map(point => (
          <Marker key={point.name} coordinates={point.coordinates}>
            <g className="cursor-pointer">
              <circle r={7} fill={point.tone} opacity={0.2} className="animate-ping" />
              <circle r={3.5} fill={point.tone} opacity={0.5} />
              <circle r={1.8} fill={point.tone} stroke="#090d16" strokeWidth={0.8} />
              <title>{point.name} Telemetry Node</title>
            </g>
          </Marker>
        ))}
      </ComposableMap>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#090d16_0%,transparent_10%,transparent_90%,#090d16_100%)]" />
      
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/85 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md sm:bottom-4 sm:left-4 sm:right-auto">
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
          </span>
          <span className="uppercase tracking-wider text-cyan-400 font-semibold text-[10px]">Global Threat Mesh Active</span>
        </span>
      </div>
    </div>
  );
}

type ModuleProps = {
  title: string; eyebrow: string; value: string; detail: string; route: string; icon: ElementType;
  source: SourceState; accent: 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald'; note: string;
};

const accentStyles = {
  cyan: { border: 'group-hover:border-cyan-500/40', iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  violet: { border: 'group-hover:border-violet-500/40', iconBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  amber: { border: 'group-hover:border-amber-500/40', iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  rose: { border: 'group-hover:border-rose-500/40', iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  emerald: { border: 'group-hover:border-emerald-500/40', iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

function ModuleSummary({ title, eyebrow, value, detail, route, icon: Icon, source, accent, note }: ModuleProps) {
  const style = accentStyles[accent];

  return (
    <Link
      to={route}
      className={`group relative flex flex-col justify-between border-b border-slate-800/80 p-4 transition-all duration-200 hover:bg-slate-800/40 sm:border-r ${style.border}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{eyebrow}</p>
            <h3 className="mt-0.5 text-sm font-semibold text-slate-100 transition group-hover:text-white">{title}</h3>
          </div>
          <span className={`grid h-8 w-8 place-items-center rounded-md border transition-transform duration-200 group-hover:scale-105 ${style.iconBg}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 font-mono text-2xl font-bold tracking-tight text-white">{value}</div>
        <p className="mt-1 text-xs text-slate-400 leading-snug truncate">{detail}</p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-2.5 text-xs">
        <span className="flex items-center gap-1.5 text-slate-400">
          <SourceDot source={source} compact />
          <span className="truncate text-[10px]">{note}</span>
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-cyan-400" />
      </div>
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
    if (data.network) factors.push({ label: data.network.monitoring ? 'Network monitor active' : 'Network monitor offline', points: data.network.monitoring ? 0 : 22 });
    if (data.vulnerability) {
      factors.push({ label: `${data.vulnerability.counts.critical} Critical Vulnerabilities`, points: Math.min(35, data.vulnerability.counts.critical * 7) });
      factors.push({ label: `${data.vulnerability.counts.high} High Vulnerabilities`, points: Math.min(20, data.vulnerability.counts.high * 2) });
    }
    const scans = data.email.length + data.phishing.length + data.malware.length;
    if (scans) {
      const detections = data.email.filter(item => item.verdict !== 'legitimate').length + data.phishing.filter(item => item.prediction === 'phishing').length + data.malware.filter(item => item.classification === 'Malware').length;
      factors.push({ label: `${detections} threats flagged in ${scans} local scans`, points: Math.min(20, Math.round((detections / scans) * 20)) });
    }
    if (recentKev !== null) factors.push({ label: `${recentKev} CISA KEV updates (30d)`, points: Math.min(12, Math.ceil(recentKev / 3)) });
    if (!factors.length) return { score: null, label: 'Awaiting Telemetry', factors };
    const score = Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0));
    return { score, label: score >= 70 ? 'CRITICAL EXPOSURE' : score >= 40 ? 'ELEVATED RISK' : score >= 15 ? 'GUARDED POSTURE' : 'OPTIMAL SYSTEM STATE', factors };
  }, [data.email, data.malware, data.network, data.phishing, data.vulnerability, recentKev]);

  const activities = useMemo(() => {
    const items: Array<{ id: string; title: string; detail: string; source: string; time: string | null; severity: 'critical' | 'warning' | 'info' | 'ok'; route: string }> = [];
    data.email.slice(0, 3).forEach((item, index) => items.push({ id: `e-${item.id || index}`, title: item.verdict === 'legitimate' ? 'Email cleared' : `${item.verdict} email detected`, detail: item.subject || item.sender || 'Message scan', source: 'Email Detector', time: item.scannedAt, severity: item.verdict === 'spam' ? 'critical' : item.verdict === 'suspicious' ? 'warning' : 'ok', route: '/email-spam' }));
    data.phishing.slice(0, 3).forEach((item, index) => items.push({ id: `p-${item.id || index}`, title: item.prediction === 'phishing' ? 'Phishing URL detected' : 'URL cleared', detail: item.url, source: 'Phishing', time: item.scannedAt, severity: item.prediction === 'phishing' ? 'critical' : 'ok', route: '/phishing' }));
    data.malware.slice(0, 3).forEach((item, index) => items.push({ id: `m-${item.id || index}`, title: item.classification === 'Malware' ? 'Malware detected' : 'File scan completed', detail: `${item.filename} · ${item.family}`, source: 'Malware', time: item.timestamp, severity: item.classification === 'Malware' ? 'critical' : 'ok', route: '/malware' }));
    data.vulnerability?.recent.slice(0, 4).forEach(item => items.push({ id: `v-${item.id}`, title: `${item.severity} vulnerability`, detail: `${item.cve || 'Finding'} · ${item.title}`, source: 'Vulnerability', time: item.updated_at || item.created_at, severity: item.severity === 'Critical' ? 'critical' : item.severity === 'High' ? 'warning' : 'info', route: '/vulnerability' }));
    data.intel?.vulnerabilities.slice(0, 3).forEach(item => items.push({ id: `i-${item.cveID}`, title: 'Known exploited vulnerability', detail: `${item.cveID} · ${item.vulnerabilityName}`, source: 'CISA KEV', time: item.dateAdded, severity: 'warning', route: '/threat-intelligence' }));
    if (data.network) items.push({ id: 'network-status', title: data.network.monitoring ? 'Network telemetry active' : 'Network monitor stopped', detail: `${data.network.connection_count} connections · ${data.network.established} active`, source: 'Network', time: data.network.updated, severity: data.network.monitoring ? 'info' : 'critical', route: '/network' });
    return items.sort((a, b) => {
      const severity = { critical: 4, warning: 3, info: 2, ok: 1 };
      const score = severity[b.severity] - severity[a.severity];
      if (score) return score;
      return (new Date(b.time || 0).getTime() || 0) - (new Date(a.time || 0).getTime() || 0);
    }).slice(0, 7);
  }, [data.email, data.intel, data.malware, data.network, data.phishing, data.vulnerability]);

  const detectorCount = data.email.length + data.phishing.length + data.malware.length;
  const detectionCount = data.email.filter(item => item.verdict !== 'legitimate').length + data.phishing.filter(item => item.prediction === 'phishing').length + data.malware.filter(item => item.classification === 'Malware').length;
  const sourceSummary = data.summary.loading ? 'Connecting...' : data.summary.offline ? 'Partial Telemetry' : 'All Feeds Nominal';
  const sourceTone = data.summary.loading || data.summary.offline ? 'text-amber-400' : 'text-emerald-400';

  const modules: ModuleProps[] = [
    { title: 'Email Analysis', eyebrow: 'Inbound Threats', value: data.email.length ? String(data.email.length) : '—', detail: data.email.length ? `${data.email.filter(item => item.verdict === 'spam').length} spam flagged` : 'No active scans', route: '/email-spam', icon: MailWarning, source: data.sources.email, accent: 'cyan', note: data.sources.email.status === 'online' ? 'Active' : 'Offline' },
    { title: 'Phishing Defense', eyebrow: 'URL Scanner', value: data.phishing.length ? String(data.phishing.length) : '—', detail: data.phishing.length ? `${data.phishing.filter(item => item.prediction === 'phishing').length} malicious links` : 'No active scans', route: '/phishing', icon: FileWarning, source: data.sources.phishing, accent: 'amber', note: data.sources.phishing.status === 'online' ? 'Active' : 'Offline' },
    { title: 'Malware Engine', eyebrow: 'File Inspection', value: data.malware.length ? String(data.malware.length) : '—', detail: data.malware.length ? `${data.malware.filter(item => item.classification === 'Malware').length} threats isolated` : 'No active scans', route: '/malware', icon: Bug, source: data.sources.malware, accent: 'rose', note: data.sources.malware.status === 'online' ? 'Active' : 'Offline' },
    { title: 'Vulnerabilities', eyebrow: 'Exposure Matrix', value: data.vulnerability ? String(data.vulnerability.counts.total) : '—', detail: data.vulnerability ? `${data.vulnerability.counts.critical} critical · ${data.vulnerability.counts.high} high` : 'Inventory Offline', route: '/vulnerability', icon: ScanSearch, source: data.sources.vulnerability, accent: 'violet', note: data.vulnerability ? `${data.vulnerability.counts.assets} Assets` : 'Offline' },
    { title: 'Network Traffic', eyebrow: 'Live Connections', value: data.network ? String(data.network.connection_count) : '—', detail: data.network ? `${data.network.established} established` : 'Telemetry Pause', route: '/network', icon: Network, source: data.sources.network, accent: 'emerald', note: data.network?.monitoring ? 'Streaming' : 'Paused' },
    { title: 'Threat Intelligence', eyebrow: 'CISA KEV Feed', value: data.intel ? String(data.intel.declaredCount ?? data.intel.vulnerabilities.length) : '—', detail: data.intel ? `${recentKev ?? 0} added (30d)` : 'Feed Unavailable', route: '/threat-intelligence', icon: Radar, source: data.sources.intel, accent: 'violet', note: data.intel ? `v${data.intel.catalogVersion || '1.0'}` : 'Offline' },
  ];

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[1600px] space-y-5 bg-[#090d16] p-4 text-slate-200 sm:p-6">
      {/* Structural Top Bar */}
      <header className="flex flex-col justify-between gap-4 rounded-lg border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="uppercase">SOC Command Operations</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Security Operations Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="border-l border-slate-800 px-3">
            <p className="font-mono text-xs font-semibold text-slate-200">{formatDate(now.toISOString())}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">System Time</p>
          </div>

          <div className="border-l border-slate-800 px-3">
            <p className={`flex items-center gap-1.5 text-xs font-semibold ${sourceTone}`}>
              <SourceDot source={{ status: data.summary.offline ? 'offline' : 'online', updatedAt: null, error: null }} compact />
              {sourceSummary}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              {data.summary.online} / 6 Feeds Active
            </p>
          </div>

          <button
            type="button"
            onClick={() => void data.refreshAll()}
            disabled={data.isRefreshing}
            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:border-cyan-500/50 hover:bg-cyan-500/20 active:scale-95 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${data.isRefreshing ? 'animate-spin' : ''}`} />
            Sync Feeds
          </button>
        </div>
      </header>

      {/* Primary Section: Threat Globe & Risk Gauge */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.8fr)]">
        <Surface className="flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Globe2 className={`h-4 w-4 ${isGlobePaused ? 'text-slate-500' : 'text-cyan-400'}`} />
              <span>Global Mesh Telemetry Map</span>
            </div>
            <button
              type="button"
              onClick={() => setIsGlobePaused(current => !current)}
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              {isGlobePaused ? <Play className="h-3 w-3 text-emerald-400" /> : <Pause className="h-3 w-3 text-amber-400" />}
              {isGlobePaused ? 'Resume' : 'Pause'}
            </button>
          </div>
          <GlobalThreatGlobe isPaused={isGlobePaused} />
        </Surface>

        <Surface className="flex flex-col justify-between p-5">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Security Posture</p>
                <h2 className="mt-0.5 text-lg font-bold text-white">Risk Profile</h2>
              </div>
              <span className={`rounded-md border p-1.5 ${posture.score !== null && posture.score >= 40 ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'}`}>
                {posture.score !== null && posture.score >= 40 ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              </span>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center border-b border-slate-800/80 pb-4">
              <RiskScoreGauge score={posture.score} />
              <p className="mt-2 font-mono text-xs font-bold tracking-wider text-cyan-400 uppercase">
                {posture.label}
              </p>
            </div>

            <div className="mt-4 space-y-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Contributing Indicators</p>
              {posture.factors.length ? (
                posture.factors.slice(0, 4).map(factor => (
                  <div key={factor.label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-400 truncate">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${factor.points ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span className="truncate">{factor.label}</span>
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-200">+{factor.points}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No elevated indicators logged.</p>
              )}
            </div>
          </div>

          <p className="mt-4 text-[10px] leading-tight text-slate-500 border-t border-slate-800/60 pt-3">
            Real-time weighted score evaluated across network parameters and detection events.
          </p>
        </Surface>
      </div>

      {/* Module Overview Grid */}
      <Surface>
        <div className="flex flex-col justify-between border-b border-slate-800/80 px-4 py-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">Security Fabric</p>
            <h2 className="text-base font-bold text-white">Detection Modules</h2>
          </div>
          <span className="mt-1 font-mono text-xs text-slate-400 sm:mt-0">
            {detectorCount} total scans / <span className="text-rose-400 font-semibold">{detectionCount} threats</span>
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {modules.map(module => (
            <ModuleSummary key={module.title} {...module} />
          ))}
        </div>
      </Surface>

      {/* Lower Section: Telemetry Feed & System Status */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        {/* Real-time Activity */}
        <Surface className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Live Event Stream</h2>
              </div>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-slate-400">Real-Time</span>
            </div>

            {activities.length ? (
              <div className="divide-y divide-slate-800/60">
                {activities.map(item => {
                  const severityBadge = {
                    critical: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
                    ok: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                  }[item.severity];

                  return (
                    <Link
                      key={item.id}
                      to={item.route}
                      className="group flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-800/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${severityBadge}`}>
                          {item.severity}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition">
                            {item.title}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">{item.detail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <p className="text-[11px] font-medium text-slate-300">{item.source}</p>
                          <p className="font-mono text-[9px] text-slate-500">{relativeTime(item.time)}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-[220px] place-items-center p-6 text-center">
                <div>
                  <CloudOff className="mx-auto h-8 w-8 text-slate-600" />
                  <p className="mt-2 text-xs font-semibold text-slate-300">No events logged</p>
                  <p className="mt-1 text-[11px] text-slate-500">Initiate a security scan to populate telemetry.</p>
                </div>
              </div>
            )}
          </div>
        </Surface>

        {/* Network & Source Telemetry Side Panels */}
        <div className="space-y-5">
          {/* Network Throughput Panel */}
          <Surface className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Network Bandwidth</p>
                <h2 className="text-sm font-bold text-white">Live Traffic Rates</h2>
              </div>
              {data.network?.monitoring ? (
                <Wifi className="h-4 w-4 text-emerald-400 animate-pulse" />
              ) : (
                <WifiOff className="h-4 w-4 text-slate-600" />
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ArrowUp className="h-3 w-3 text-violet-400" /> Outbound
                </div>
                <p className="mt-1 font-mono text-lg font-bold text-white">
                  {data.network ? formatDataRate(data.network.upload_bps) : '—'}
                </p>
              </div>

              <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ArrowDown className="h-3 w-3 text-cyan-400" /> Inbound
                </div>
                <p className="mt-1 font-mono text-lg font-bold text-white">
                  {data.network ? formatDataRate(data.network.download_bps) : '—'}
                </p>
              </div>
            </div>
          </Surface>

          {/* Feed Integrity Table */}
          <Surface>
            <div className="border-b border-slate-800/80 px-4 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-violet-400">System Feeds</p>
              <h2 className="text-sm font-bold text-white">Source Feed Health</h2>
            </div>

            <div className="divide-y divide-slate-800/60">
              {(Object.keys(sourceNames) as SourceKey[]).map(key => {
                const source = data.sources[key];
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="flex items-center gap-2 text-slate-200">
                      <SourceDot source={source} compact />
                      {sourceNames[key]}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {source.status === 'loading' ? 'Connecting' : source.updatedAt ? formatDate(source.updatedAt) : 'Offline'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 border-t border-slate-800/80 bg-slate-950/40 px-4 py-2 text-[11px] text-slate-500">
              <Clock3 className="h-3 w-3 shrink-0" />
              Last Telemetry Sync: {data.lastSync ? relativeTime(data.lastSync) : 'In Progress'}
            </div>
          </Surface>
        </div>
      </div>

      {/* Compact Telemetry Footer */}
      <footer className="flex items-center justify-between rounded-md border border-slate-800/60 bg-slate-950/40 px-4 py-2.5 text-[11px] text-slate-500">
        <span className="flex items-center gap-2 font-mono">
          <Server className="h-3.5 w-3.5 text-cyan-400" /> Cyber Shield Mesh Node v4.2
        </span>
        <span>Telemetry Verified</span>
      </footer>
    </div>
  );
}