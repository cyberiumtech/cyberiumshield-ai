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
  return (
    <section className={`relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-2xl shadow-cyan-950/20 ${className}`}>
      {children}
    </section>
  );
}

function SourceDot({ source, compact = false }: { source: SourceState; compact?: boolean }) {
  const isOnline = source.status === 'online';
  const isLoading = source.status === 'loading';

  const dotStyles = isOnline
    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
    : isLoading
      ? 'bg-amber-400 animate-pulse'
      : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]';

  return (
    <span className={`inline-flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <span className="relative flex h-2 w-2">
        {isOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={`relative h-2 w-2 rounded-full ${dotStyles}`} />
      </span>
      {!compact && <span className="capitalize text-slate-300 font-medium">{source.status}</span>}
    </span>
  );
}

function RiskScoreGauge({ score }: { score: number | null }) {
  const displayScore = score ?? 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const colorClass = displayScore >= 70 
    ? 'text-rose-500 stroke-rose-500' 
    : displayScore >= 40 
      ? 'text-amber-400 stroke-amber-400' 
      : 'text-cyan-400 stroke-cyan-400';

  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} className="stroke-slate-800" strokeWidth="8" fill="transparent" />
        {score !== null && (
          <circle
            cx="60"
            cy="60"
            r={radius}
            className={`transition-all duration-1000 ease-out ${colorClass}`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="font-mono text-4xl font-extrabold tracking-tight text-white">
          {score !== null ? score : '—'}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Risk Index</span>
      </div>
    </div>
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
    <div className="relative h-[390px] overflow-hidden rounded-b-xl sm:h-[470px] lg:h-[560px]">
      <div className="pointer-events-none absolute inset-x-[10%] top-[15%] aspect-square rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_30%,#030712_85%)]" />
      
      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={{ rotate: rotation, scale: projectionScale }}
        width={900}
        height={560}
        className="relative h-full w-full"
        aria-label="Rotating global threat telemetry map"
      >
        <Sphere id="dashboard-globe" fill="#091424" stroke="#1e3a5f" strokeWidth={0.8} />
        <Graticule stroke="#38bdf8" strokeWidth={0.3} strokeOpacity={0.2} />
        <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
          {({ geographies }: { geographies: Array<{ rsmKey: string; [key: string]: unknown }> }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#112238"
                stroke="#1d4ed8"
                strokeWidth={0.4}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none', fill: '#1e3a8a' },
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
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.45}
          />
        ))}
        {mapPoints.map(point => (
          <Marker key={point.name} coordinates={point.coordinates}>
            <g className="cursor-pointer">
              <circle r={9} fill={point.tone} opacity={0.15} className="animate-ping" />
              <circle r={5} fill={point.tone} opacity={0.4} />
              <circle r={2.2} fill={point.tone} stroke="#030712" strokeWidth={1} />
              <title>{point.name} telemetry location</title>
            </g>
          </Marker>
        ))}
      </ComposableMap>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#030712_0%,transparent_15%,transparent_85%,#030712_100%)]" />
      
      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs font-medium text-slate-300 backdrop-blur-md sm:bottom-5 sm:left-5 sm:right-auto">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
        </span>
        <span className="uppercase tracking-widest text-cyan-400 font-semibold text-[10px]">Live Global Mesh Telemetry</span>
      </div>
    </div>
  );
}

type ModuleProps = {
  title: string; eyebrow: string; value: string; detail: string; route: string; icon: ElementType;
  source: SourceState; accent: 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald'; note: string;
};

const accentStyles = {
  cyan: {
    border: 'group-hover:border-cyan-500/40',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    glow: 'hover:shadow-cyan-500/5',
    text: 'text-cyan-400',
  },
  violet: {
    border: 'group-hover:border-violet-500/40',
    iconBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    glow: 'hover:shadow-violet-500/5',
    text: 'text-violet-400',
  },
  amber: {
    border: 'group-hover:border-amber-500/40',
    iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    glow: 'hover:shadow-amber-500/5',
    text: 'text-amber-400',
  },
  rose: {
    border: 'group-hover:border-rose-500/40',
    iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    glow: 'hover:shadow-rose-500/5',
    text: 'text-rose-400',
  },
  emerald: {
    border: 'group-hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    glow: 'hover:shadow-emerald-500/5',
    text: 'text-emerald-400',
  },
};

function ModuleSummary({ title, eyebrow, value, detail, route, icon: Icon, source, accent, note }: ModuleProps) {
  const style = accentStyles[accent];

  return (
    <Link
      to={route}
      className={`group relative flex min-h-[210px] flex-col justify-between border-b border-slate-800/60 p-5 transition-all duration-300 hover:bg-slate-800/30 sm:border-r ${style.border} ${style.glow}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{eyebrow}</p>
            <h3 className="mt-1 text-base font-semibold text-slate-100 transition group-hover:text-white">{title}</h3>
          </div>
          <span className={`grid h-10 w-10 place-items-center rounded-lg border transition-transform duration-300 group-hover:scale-105 ${style.iconBg}`}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-5 font-mono text-3xl font-extrabold tracking-tight text-white">{value}</div>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">{detail}</p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-800/60 pt-4 text-xs">
        <span className="flex items-center gap-2 text-slate-400">
          <SourceDot source={source} compact />
          <span className="truncate text-[11px]">{note}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cyan-400" />
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
    return { score, label: score >= 70 ? 'CRITICAL EXPOSURE' : score >= 40 ? 'ELEVATED RISK' : score >= 15 ? 'GUARDED POSTURE' : 'OPTIMAL / STABLE', factors };
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
  const sourceSummary = data.summary.loading ? 'Connecting sources...' : data.summary.offline ? 'Partial Coverage' : 'All Sources Operational';
  const sourceTone = data.summary.loading || data.summary.offline ? 'text-amber-400' : 'text-emerald-400';

  const modules: ModuleProps[] = [
    { title: 'Email Intelligence', eyebrow: 'Inbound Analysis', value: data.email.length ? String(data.email.length) : '—', detail: data.email.length ? `${data.email.filter(item => item.verdict === 'spam').length} spam detected` : 'No scans performed', route: '/email-spam', icon: MailWarning, source: data.sources.email, accent: 'cyan', note: data.sources.email.status === 'online' ? 'Engine Ready' : 'Cached History' },
    { title: 'Phishing Defense', eyebrow: 'URL Scanner', value: data.phishing.length ? String(data.phishing.length) : '—', detail: data.phishing.length ? `${data.phishing.filter(item => item.prediction === 'phishing').length} malicious links` : 'No scans performed', route: '/phishing', icon: FileWarning, source: data.sources.phishing, accent: 'amber', note: data.sources.phishing.status === 'online' ? 'Engine Ready' : 'Service Offline' },
    { title: 'Malware Inspection', eyebrow: 'File Analysis', value: data.malware.length ? String(data.malware.length) : '—', detail: data.malware.length ? `${data.malware.filter(item => item.classification === 'Malware').length} threats isolated` : 'No scans performed', route: '/malware', icon: Bug, source: data.sources.malware, accent: 'rose', note: data.sources.malware.status === 'online' ? 'Scanner Ready' : 'Service Offline' },
    { title: 'Vulnerability Mgmt', eyebrow: 'Exposure Matrix', value: data.vulnerability ? String(data.vulnerability.counts.total) : '—', detail: data.vulnerability ? `${data.vulnerability.counts.critical} critical · ${data.vulnerability.counts.high} high` : 'Inventory Unreachable', route: '/vulnerability', icon: ScanSearch, source: data.sources.vulnerability, accent: 'violet', note: data.vulnerability ? `${data.vulnerability.counts.assets} Active Assets` : 'API Offline' },
    { title: 'Network Telemetry', eyebrow: 'Traffic Monitor', value: data.network ? String(data.network.connection_count) : '—', detail: data.network ? `${data.network.established} active connections` : 'Telemetry Offline', route: '/network', icon: Network, source: data.sources.network, accent: 'emerald', note: data.network?.monitoring ? 'Stream Active' : 'Monitor Paused' },
    { title: 'Threat Feed', eyebrow: 'CISA KEV Intel', value: data.intel ? String(data.intel.declaredCount ?? data.intel.vulnerabilities.length) : '—', detail: data.intel ? `${recentKev ?? 0} catalog updates (30d)` : 'Feed Unreachable', route: '/threat-intelligence', icon: Radar, source: data.sources.intel, accent: 'violet', note: data.intel ? `v${data.intel.catalogVersion || '1.0'}` : 'Feed Offline' },
  ];

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[1700px] space-y-6 bg-[#030712] p-4 text-slate-200 sm:p-6 lg:p-8">
      {/* Background Cybernetic Grid Lines */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Main Command Header */}
      <header className="flex flex-col justify-between gap-6 rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-md lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-semibold tracking-widest text-cyan-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="uppercase">Cyber Shield Operations Command</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Security Operations Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time threat detection, exposure modeling, and global network monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="border-l border-slate-800 px-4">
            <p className="font-mono text-sm font-semibold text-slate-200">{formatDate(now.toISOString())}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · System Time
            </p>
          </div>

          <div className="border-l border-slate-800 px-4">
            <p className={`flex items-center gap-2 text-sm font-semibold ${sourceTone}`}>
              <SourceDot source={{ status: data.summary.offline ? 'offline' : 'online', updatedAt: null, error: null }} compact />
              {sourceSummary}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {data.summary.online} / 6 Feeds Active
            </p>
          </div>

          <button
            type="button"
            onClick={() => void data.refreshAll()}
            disabled={data.isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-300 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/20 active:scale-95 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${data.isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </header>

      {/* Hero Section: Interactive Globe + Operational Risk Score */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(340px,0.8fr)]">
        <Surface className="flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Globe2 className={`h-4 w-4 ${isGlobePaused ? 'text-slate-500' : 'text-cyan-400'}`} />
              <span>Global Attack Surface Projection</span>
            </div>
            <button
              type="button"
              onClick={() => setIsGlobePaused(current => !current)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              {isGlobePaused ? <Play className="h-3 w-3 text-emerald-400" /> : <Pause className="h-3 w-3 text-amber-400" />}
              {isGlobePaused ? 'Resume Rotation' : 'Pause Rotation'}
            </button>
          </div>
          <GlobalThreatGlobe isPaused={isGlobePaused} />
        </Surface>

        <Surface className="flex flex-col justify-between p-6">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Posture</p>
                <h2 className="mt-1 text-xl font-bold text-white">Operational Risk</h2>
              </div>
              <span className={`rounded-lg border p-2 ${posture.score !== null && posture.score >= 40 ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'}`}>
                {posture.score !== null && posture.score >= 40 ? <ShieldAlert className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
              </span>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center border-b border-slate-800/80 pb-6">
              <RiskScoreGauge score={posture.score} />
              <p className="mt-4 font-mono text-xs font-bold tracking-wider text-cyan-400 uppercase">
                {posture.label}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Risk Contributors</p>
              {posture.factors.length ? (
                posture.factors.slice(0, 4).map(factor => (
                  <div key={factor.label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-400">
                      <span className={`h-1.5 w-1.5 rounded-full ${factor.points ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      {factor.label}
                    </span>
                    <span className="font-mono font-semibold text-slate-200">+{factor.points}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No active risk factors detected.</p>
              )}
            </div>
          </div>

          <p className="mt-6 text-[11px] leading-relaxed text-slate-500 border-t border-slate-800/60 pt-4">
            Risk metric derived from active network monitors, open vulnerability findings, and scan detection events.
          </p>
        </Surface>
      </div>

      {/* Detection Fabric Grid */}
      <Surface>
        <div className="flex flex-col justify-between border-b border-slate-800/80 px-6 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Detection Fabric</p>
            <h2 className="text-lg font-bold text-white">Active Defense Engines</h2>
          </div>
          <span className="mt-2 font-mono text-xs text-slate-400 sm:mt-0">
            {detectorCount} total scans / <span className="text-rose-400 font-semibold">{detectionCount} flagged</span>
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {modules.map(module => (
            <ModuleSummary key={module.title} {...module} />
          ))}
        </div>
      </Surface>

      {/* Bottom Grid: Live Feed & Telemetry Panels */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        {/* Prioritized Queue */}
        <Surface className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Live Event Attention Feed</h2>
              </div>
              <span className="rounded-full bg-slate-800 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-slate-400">Real-Time</span>
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
                      className="group flex items-center justify-between gap-4 p-4 transition hover:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${severityBadge}`}>
                          {item.severity}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition">
                            {item.title}
                          </p>
                          <p className="truncate text-xs text-slate-400">{item.detail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <p className="text-xs font-medium text-slate-300">{item.source}</p>
                          <p className="font-mono text-[10px] text-slate-500">{relativeTime(item.time)}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-[280px] place-items-center p-6 text-center">
                <div>
                  <CloudOff className="mx-auto h-10 w-10 text-slate-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-300">No events logged</p>
                  <p className="mt-1 text-xs text-slate-500">Initiate a security scan to populate telemetry.</p>
                </div>
              </div>
            )}
          </div>
        </Surface>

        {/* Side Panels: Network & Source Health */}
        <div className="space-y-6">
          {/* Network Pulse */}
          <Surface className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Network Bandwidth</p>
                <h2 className="text-base font-bold text-white">Live Traffic Throughput</h2>
              </div>
              {data.network?.monitoring ? (
                <Wifi className="h-5 w-5 text-emerald-400 animate-pulse" />
              ) : (
                <WifiOff className="h-5 w-5 text-slate-600" />
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <ArrowUp className="h-3.5 w-3.5 text-violet-400" /> Outbound
                </div>
                <p className="mt-2 font-mono text-xl font-bold text-white">
                  {data.network ? formatDataRate(data.network.upload_bps) : '—'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <ArrowDown className="h-3.5 w-3.5 text-cyan-400" /> Inbound
                </div>
                <p className="mt-2 font-mono text-xl font-bold text-white">
                  {data.network ? formatDataRate(data.network.download_bps) : '—'}
                </p>
              </div>
            </div>
          </Surface>

          {/* Source Health Table */}
          <Surface>
            <div className="border-b border-slate-800/80 px-6 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Integrity Check</p>
              <h2 className="text-base font-bold text-white">Source Feed Health</h2>
            </div>

            <div className="divide-y divide-slate-800/60">
              {(Object.keys(sourceNames) as SourceKey[]).map(key => {
                const source = data.sources[key];
                return (
                  <div key={key} className="flex items-center justify-between px-6 py-3 text-xs">
                    <span className="flex items-center gap-2.5 text-slate-200">
                      <SourceDot source={source} compact />
                      {sourceNames[key]}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {source.status === 'loading' ? 'Connecting...' : source.updatedAt ? formatDate(source.updatedAt) : 'Offline'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-800/80 bg-slate-950/40 px-6 py-3 text-xs text-slate-500">
              <Clock3 className="h-3.5 w-3.5 shrink-0" />
              Last Sync: {data.lastSync ? relativeTime(data.lastSync) : 'In Progress'}
            </div>
          </Surface>
        </div>
      </div>

      {/* Telemetry Footer */}
      <footer className="flex flex-col gap-2 rounded-lg border border-slate-800/60 bg-slate-950/40 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2 font-mono">
          <Server className="h-4 w-4 text-cyan-400" /> Cyber Shield Mesh Node v4.2
        </span>
        <span className="text-[11px]">Strict telemetry verification • Unverified sources omitted</span>
      </footer>
    </div>
  );
}