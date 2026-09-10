import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
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

const FONT_SANS = "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

const mapPoints = [
  { name: 'London',    coordinates: [-0.13, 51.5] as [number, number],    tone: '#22d3ee' },
  { name: 'São Paulo', coordinates: [-46.63, -23.55] as [number, number], tone: '#a78bfa' },
  { name: 'Virginia',  coordinates: [-77.44, 37.54] as [number, number],  tone: '#22d3ee' },
  { name: 'Singapore', coordinates: [103.82, 1.35] as [number, number],   tone: '#f59e0b' },
  { name: 'Tokyo',     coordinates: [139.69, 35.68] as [number, number],  tone: '#a78bfa' },
  { name: 'Mumbai',    coordinates: [72.88, 19.08] as [number, number],   tone: '#fb7185' },
  { name: 'Sydney',    coordinates: [151.21, -33.87] as [number, number], tone: '#22d3ee' },
];

const sourceNames: Record<SourceKey, string> = {
  email: 'Email detector',
  phishing: 'Phishing engine',
  malware: 'Malware scanner',
  network: 'Network monitor',
  vulnerability: 'Vulnerability API',
  intel: 'CISA KEV feed',
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

/* PRIMITIVES */
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`border border-white/[0.08] bg-[#0b1424] ${className}`}>
      {children}
    </section>
  );
}

function PanelHeader({
  kicker, kickerTone = 'slate', title, hint, right,
}: {
  kicker: string;
  kickerTone?: 'slate' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  const tone = {
    slate:   'text-slate-500',
    cyan:    'text-cyan-400',
    emerald: 'text-emerald-400',
    amber:   'text-amber-400',
    rose:    'text-rose-400',
    violet:  'text-violet-400',
  }[kickerTone];

  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className={`font-mono text-[10px] font-medium uppercase tracking-[0.18em] ${tone}`}>{kicker}</p>
        <h2 className="mt-1 text-[15px] font-semibold text-slate-100">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

function SourceDot({ source, compact = false }: { source: SourceState; compact?: boolean }) {
  const tone =
    source.status === 'online' ? 'bg-emerald-500'
    : source.status === 'loading' ? 'bg-amber-500'
    : 'bg-rose-500';
  return (
    <span className={`inline-flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} aria-hidden="true" />
      <span className={compact ? 'sr-only' : 'capitalize text-slate-300'}>{source.status}</span>
    </span>
  );
}

function SeverityPill({ severity }: { severity: 'critical' | 'warning' | 'info' | 'ok' }) {
  const map = {
    critical: { label: 'Critical', cls: 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400' },
    warning:  { label: 'Warning',  cls: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400' },
    info:     { label: 'Info',     cls: 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-400' },
    ok:       { label: 'Clean',    cls: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400' },
  }[severity];
  return (
    <span className={`inline-flex items-center justify-center border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${map.cls}`}>
      {map.label}
    </span>
  );
}

/* GLOBE */
function GlobalThreatGlobe() {
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

    const start = () => {
      if (document.visibilityState === 'visible' && animationFrameRef.current === null) {
        lastTimestamp = null;
        animationFrameRef.current = window.requestAnimationFrame(animate);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        lastTimestamp = null;
      } else {
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-[380px] overflow-hidden sm:h-[440px] lg:h-[520px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_42%,#07101e_82%)]" />

      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={{ rotate: rotation, scale: projectionScale }}
        width={900}
        height={560}
        className="relative h-full w-full"
        aria-label="Rotating world activity map"
      >
        <Sphere id="dashboard-globe" fill="#0b2034" stroke="#276079" strokeWidth={0.8} />
        <Graticule stroke="#54d3ea" strokeWidth={0.28} strokeOpacity={0.18} />
        <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
          {({ geographies }: { geographies: Array<{ rsmKey: string; [key: string]: unknown }> }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#123149"
                stroke="#32708b"
                strokeWidth={0.38}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none', fill: '#16405d' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {mapPoints.slice(0, 5).map((point, index) => (
          <Line
            key={point.name}
            from={point.coordinates}
            to={mapPoints[(index + 3) % mapPoints.length].coordinates}
            stroke="#22d3ee"
            strokeWidth={0.8}
            strokeDasharray="2 5"
            opacity={0.3}
          />
        ))}

        {mapPoints.map(point => (
          <Marker key={point.name} coordinates={point.coordinates}>
            <g>
              <circle r={8} fill={point.tone} opacity={0.1} />
              <circle r={4} fill={point.tone} opacity={0.32} />
              <circle r={1.9} fill={point.tone} stroke="#06101c" strokeWidth={0.8} />
              <title>{point.name} activity marker</title>
            </g>
          </Marker>
        ))}
      </ComposableMap>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#07101e_0%,transparent_20%,transparent_80%,#07101e_100%)]" />

      <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-sm">
        <div className="flex items-center gap-2 border-l-2 border-cyan-500/70 bg-[#07101e] px-3 py-2">
          <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
            Global activity layer
          </span>
        </div>
      </div>
    </div>
  );
}

/* MODULE TILE */
type ModuleProps = {
  title: string;
  eyebrow: string;
  value: string;
  detail: string;
  route: string;
  icon: ElementType;
  source: SourceState;
  accent: 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald';
  note: string;
};

const accentStyles = {
  cyan:    'text-cyan-400 border-cyan-500/25 bg-cyan-500/[0.05]',
  violet:  'text-violet-400 border-violet-500/25 bg-violet-500/[0.05]',
  amber:   'text-amber-400 border-amber-500/25 bg-amber-500/[0.05]',
  rose:    'text-rose-400 border-rose-500/25 bg-rose-500/[0.05]',
  emerald: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.05]',
};

function ModuleTile({ title, eyebrow, value, detail, route, icon: Icon, source, accent, note }: ModuleProps) {
  return (
    <Link
      to={route}
      className="group relative flex min-h-[170px] flex-col border-t border-white/[0.08] bg-[#0b1424] px-4 py-4 transition hover:bg-white/[0.02] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-500 sm:border-l sm:border-t-0"
    >
      <div className="flex items-center gap-2.5">
        <span className={`grid h-7 w-7 shrink-0 place-items-center border ${accentStyles[accent]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
            {eyebrow}
          </p>
          <h3 className="truncate text-[13px] font-semibold leading-tight text-slate-100">{title}</h3>
        </div>
      </div>

      <div className="mt-4">
        <p className="font-mono text-2xl font-semibold leading-none tracking-tight text-white">{value}</p>
        <p className="mt-1.5 truncate text-[11px] text-slate-500" title={detail}>{detail}</p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
          <SourceDot source={source} compact />
          <span className="truncate font-mono uppercase tracking-wider">{note}</span>
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-400" />
      </div>
    </Link>
  );
}

/* DASHBOARD PAGE */
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
    if (data.network) factors.push({
      label: data.network.monitoring ? 'Network monitor active' : 'Network monitor stopped',
      points: data.network.monitoring ? 0 : 22,
    });
    if (data.vulnerability) {
      factors.push({ label: `${data.vulnerability.counts.critical} critical vulnerabilities`, points: Math.min(35, data.vulnerability.counts.critical * 7) });
      factors.push({ label: `${data.vulnerability.counts.high} high vulnerabilities`, points: Math.min(20, data.vulnerability.counts.high * 2) });
    }
    const scans = data.email.length + data.phishing.length + data.malware.length;
    if (scans) {
      const detections =
        data.email.filter(item => item.verdict !== 'legitimate').length +
        data.phishing.filter(item => item.prediction === 'phishing').length +
        data.malware.filter(item => item.classification === 'Malware').length;
      factors.push({
        label: `${detections} flagged across ${scans} local scans`,
        points: Math.min(20, Math.round((detections / scans) * 20)),
      });
    }
    if (recentKev !== null) factors.push({ label: `${recentKev} KEV additions in 30 days`, points: Math.min(12, Math.ceil(recentKev / 3)) });
    if (!factors.length) return { score: null, label: 'Awaiting signals', factors };
    const score = Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0));
    return {
      score,
      label: score >= 70 ? 'Critical exposure' : score >= 40 ? 'Elevated risk' : score >= 15 ? 'Guarded' : 'Stable',
      factors,
    };
  }, [data.email, data.malware, data.network, data.phishing, data.vulnerability, recentKev]);

  /* ═══ MORE DATA IN THE FEED ═══ */
  const activities = useMemo(() => {
    const items: Array<{
      id: string; title: string; detail: string; source: string;
      time: string | null; severity: 'critical' | 'warning' | 'info' | 'ok'; route: string;
    }> = [];
    data.email.slice(0, 4).forEach((item, index) => items.push({
      id: `e-${item.id || index}`,
      title: item.verdict === 'legitimate' ? 'Email cleared' : `${item.verdict} email detected`,
      detail: item.subject || item.sender || 'Message scan',
      source: 'Email Spam', time: item.scannedAt,
      severity: item.verdict === 'spam' ? 'critical' : item.verdict === 'suspicious' ? 'warning' : 'ok',
      route: '/email-spam',
    }));
    data.phishing.slice(0, 4).forEach((item, index) => items.push({
      id: `p-${item.id || index}`,
      title: item.prediction === 'phishing' ? 'Phishing URL detected' : 'URL cleared',
      detail: item.url, source: 'Phishing', time: item.scannedAt,
      severity: item.prediction === 'phishing' ? 'critical' : 'ok',
      route: '/phishing',
    }));
    data.malware.slice(0, 4).forEach((item, index) => items.push({
      id: `m-${item.id || index}`,
      title: item.classification === 'Malware' ? 'Malware detected' : 'File scan completed',
      detail: `${item.filename} · ${item.family}`,
      source: 'Threat Detection', time: item.timestamp,
      severity: item.classification === 'Malware' ? 'critical' : 'ok',
      route: '/malware',
    }));
    data.vulnerability?.recent.slice(0, 6).forEach(item => items.push({
      id: `v-${item.id}`,
      title: `${item.severity} vulnerability`,
      detail: `${item.cve || 'Finding'} · ${item.title}`,
      source: 'Vulnerability', time: item.updated_at || item.created_at,
      severity: item.severity === 'Critical' ? 'critical' : item.severity === 'High' ? 'warning' : 'info',
      route: '/vulnerability',
    }));
    data.intel?.vulnerabilities.slice(0, 4).forEach(item => items.push({
      id: `i-${item.cveID}`,
      title: 'Known exploited vulnerability',
      detail: `${item.cveID} · ${item.vulnerabilityName}`,
      source: 'CISA KEV', time: item.dateAdded, severity: 'warning',
      route: '/threat-intelligence',
    }));
    if (data.network) items.push({
      id: 'network-status',
      title: data.network.monitoring ? 'Network telemetry active' : 'Network monitor stopped',
      detail: `${data.network.connection_count} connections · ${data.network.established} established`,
      source: 'Network', time: data.network.updated,
      severity: data.network.monitoring ? 'info' : 'critical',
      route: '/network',
    });
    return items
      .sort((a, b) => {
        const severity = { critical: 4, warning: 3, info: 2, ok: 1 };
        const score = severity[b.severity] - severity[a.severity];
        if (score) return score;
        return (new Date(b.time || 0).getTime() || 0) - (new Date(a.time || 0).getTime() || 0);
      })
      .slice(0, 12);
  }, [data.email, data.intel, data.malware, data.network, data.phishing, data.vulnerability]);

  const detectorCount = data.email.length + data.phishing.length + data.malware.length;
  const detectionCount =
    data.email.filter(item => item.verdict !== 'legitimate').length +
    data.phishing.filter(item => item.prediction === 'phishing').length +
    data.malware.filter(item => item.classification === 'Malware').length;

  const sourceSummary = data.summary.loading ? 'Connecting sources' : data.summary.offline ? 'Partial coverage' : 'All sources online';
  const sourceTone = data.summary.loading || data.summary.offline ? 'text-amber-400' : 'text-emerald-400';

  const modules: ModuleProps[] = [
    {
      title: 'Email Spam', eyebrow: 'Message intel',
      value: data.email.length ? String(data.email.length) : '—',
      detail: data.email.length ? `${data.email.filter(item => item.verdict === 'spam').length} spam · latest ${data.email[0].verdict}` : 'No scans yet',
      route: '/email-spam', icon: MailWarning, source: data.sources.email, accent: 'cyan',
      note: data.sources.email.status === 'online' ? 'Ready' : 'Local only',
    },
    {
      title: 'Phishing', eyebrow: 'URL analysis',
      value: data.phishing.length ? String(data.phishing.length) : '—',
      detail: data.phishing.length ? `${data.phishing.filter(item => item.prediction === 'phishing').length} malicious · latest ${data.phishing[0].prediction}` : 'No scans yet',
      route: '/phishing', icon: FileWarning, source: data.sources.phishing, accent: 'amber',
      note: data.sources.phishing.status === 'online' ? 'Ready' : 'Unavailable',
    },
    {
      title: 'Malware Detection', eyebrow: 'File intel',
      value: data.malware.length ? String(data.malware.length) : '—',
      detail: data.malware.length ? `${data.malware.filter(item => item.classification === 'Malware').length} threats · latest ${data.malware[0].classification}` : 'No scans yet',
      route: '/malware', icon: Bug, source: data.sources.malware, accent: 'rose',
      note: data.sources.malware.status === 'online' ? 'Ready' : 'Unavailable',
    },
    {
      title: 'Vulnerability Management', eyebrow: 'Exposure',
      value: data.vulnerability ? String(data.vulnerability.counts.total) : '—',
      detail: data.vulnerability ? `${data.vulnerability.counts.critical} critical · ${data.vulnerability.counts.high} high` : 'Inventory unavailable',
      route: '/vulnerability', icon: ScanSearch, source: data.sources.vulnerability, accent: 'violet',
      note: data.vulnerability ? `${data.vulnerability.counts.assets} assets` : 'Unavailable',
    },
    {
      title: 'Network Monitoring', eyebrow: 'Traffic',
      value: data.network ? String(data.network.connection_count) : '—',
      detail: data.network ? `${data.network.established} established · ${data.network.interfaces.filter(item => item.is_up).length} interfaces up` : 'Telemetry unavailable',
      route: '/network', icon: Network, source: data.sources.network, accent: 'emerald',
      note: data.network?.monitoring ? 'Active' : 'Unavailable',
    },
    {
      title: 'Threat Intelligence', eyebrow: 'CISA KEV',
      value: data.intel ? String(data.intel.declaredCount ?? data.intel.vulnerabilities.length) : '—',
      detail: data.intel ? `${recentKev ?? 0} additions in 30 days` : 'Catalog unavailable',
      route: '/threat-intelligence', icon: Radar, source: data.sources.intel, accent: 'violet',
      note: data.intel ? `Catalog ${data.intel.catalogVersion || 'current'}` : 'Unavailable',
    },
  ];

  return (
    <div
      style={{ fontFamily: FONT_SANS }}
      className="relative mx-auto w-full min-w-0 max-w-[1640px] pb-10 text-slate-200"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      {/* HEADER */}
      <header className="mb-5 flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center border border-white/[0.08] bg-[#0b1424]">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Cyber Shield · Command Center
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Security Operations Overview
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden border-l border-white/[0.08] pl-4 sm:block">
            <p className="font-mono text-xs text-slate-300">{formatDate(now.toISOString())}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>

          <div className="hidden border-l border-white/[0.08] pl-4 sm:block">
            <p className={`flex items-center gap-2 text-xs font-medium ${sourceTone}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {sourceSummary}
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {data.summary.online}/6 online · {data.summary.offline} offline
            </p>
          </div>

          <button
            type="button"
            onClick={() => void data.refreshAll()}
            disabled={data.isRefreshing}
            className="inline-flex h-9 items-center gap-2 border border-white/[0.08] bg-[#0b1424] px-3.5 text-xs font-medium text-slate-300 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${data.isRefreshing ? 'animate-spin' : ''}`} />
            {data.isRefreshing ? 'Syncing' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* GLOBE + POSTURE */}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,.68fr)]">
        <Panel className="relative min-w-0 overflow-hidden bg-[#07101e]">
          <GlobalThreatGlobe />
        </Panel>

        <Panel className="relative flex min-h-[480px] flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Derived posture</p>
              <h2 className="mt-1 text-[15px] font-semibold text-slate-100">Operational risk</h2>
            </div>
            <Siren className={`h-5 w-5 ${posture.score !== null && posture.score >= 40 ? 'text-rose-400' : 'text-cyan-400'}`} />
          </div>

          <div className="mt-8 flex items-end gap-3">
            <span className="font-mono text-6xl font-light leading-none tracking-tight text-white">
              {posture.score ?? '—'}
            </span>
            <span className="mb-1 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-slate-500">
              / 100<br />risk pressure
            </span>
          </div>

          <div
            className="mt-5 h-1 overflow-hidden bg-white/[0.06]"
            role="meter"
            aria-label="Operational risk score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={posture.score ?? undefined}
          >
            {posture.score !== null && (
              <div
                className={`h-full transition-[width] duration-700 ${
                  posture.score >= 70 ? 'bg-rose-500' : posture.score >= 40 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${posture.score}%` }}
              />
            )}
          </div>

          <div className="mt-3 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-slate-200">{posture.label}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Available signals only
            </span>
          </div>

          <div className="mt-6 border-t border-white/[0.08] pt-4">
            <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Contributing factors
            </p>
            <div className="space-y-2.5">
              {posture.factors.length ? posture.factors.slice(0, 5).map(factor => (
                <div key={factor.label} className="flex items-center justify-between gap-4 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-slate-400">
                    <span className={`h-1 w-1 shrink-0 rounded-full ${factor.points ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className="truncate">{factor.label}</span>
                  </span>
                  <span className="font-mono text-slate-300">+{factor.points}</span>
                </div>
              )) : (
                <p className="text-xs text-slate-500">Connect a data source or run a scan to calculate posture.</p>
              )}
            </div>
          </div>

          <p className="mt-auto pt-5 text-[11px] leading-relaxed text-slate-500">
            Explainable snapshot — missing sources are excluded, never estimated.
          </p>
        </Panel>
      </div>

      {/* MODULE GRID */}
      <Panel className="mt-5 overflow-hidden">
        <PanelHeader
          kicker="Detection fabric"
          kickerTone="cyan"
          title="Six connected operations"
          right={
            <p className="font-mono text-xs text-slate-500">
              {detectorCount} scans / {detectionCount} flagged
            </p>
          }
        />
        <div className="grid sm:grid-cols-2 xl:grid-cols-6">
          {modules.map(module => <ModuleTile key={module.title} {...module} />)}
        </div>
      </Panel>

      {/* ACTIVITY + SIDEBAR */}
      <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.7fr)]">

        {/* Live attention feed */}
        <Panel className="overflow-hidden">
          <PanelHeader
            kicker="Prioritized queue"
            kickerTone="rose"
            title="Live attention feed"
            right={<Activity className="h-4 w-4 text-slate-500" />}
          />

          {activities.length ? (
            <div className="w-full">
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.015] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    <th className="w-[96px] px-5 py-2.5 font-medium">Severity</th>
                    <th className="px-4 py-2.5 font-medium">Event</th>
                    <th className="hidden w-[150px] px-4 py-2.5 font-medium md:table-cell">Source</th>
                    <th className="hidden w-[110px] px-4 py-2.5 font-medium sm:table-cell">When</th>
                    <th className="w-[44px] px-5 py-2.5" aria-label="Open" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {activities.map(item => (
                    <tr key={item.id} className="group transition hover:bg-white/[0.025]">
                      <td className="px-5 py-3 align-middle">
                        <Link
                          to={item.route}
                          className="inline-block focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
                          aria-label={`Open ${item.title}`}
                        >
                          <SeverityPill severity={item.severity} />
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Link
                          to={item.route}
                          className="block min-w-0 focus:outline-none focus-visible:text-cyan-300"
                        >
                          <p className="truncate text-[13px] font-medium text-slate-200">{item.title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.detail}</p>
                          <p className="mt-1 flex items-center gap-2 font-mono text-[10px] text-slate-500 md:hidden">
                            <span className="truncate">{item.source}</span>
                            <span className="h-1 w-1 shrink-0 rounded-full bg-slate-700" />
                            <span className="shrink-0">{relativeTime(item.time)}</span>
                          </p>
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 align-middle md:table-cell">
                        <span className="block truncate font-mono text-[11px] text-slate-400">{item.source}</span>
                      </td>
                      <td className="hidden px-4 py-3 align-middle sm:table-cell">
                        <span
                          className="block truncate font-mono text-[11px] text-slate-500"
                          title={formatDate(item.time, true)}
                        >
                          {relativeTime(item.time)}
                        </span>
                      </td>
                      <td className="px-5 py-3 align-middle text-right">
                        <Link
                          to={item.route}
                          className="inline-grid place-items-center focus:outline-none"
                          aria-label={`Open ${item.title}`}
                        >
                          <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-400" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Feed footer — fills remaining space intentionally */}
              <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                <span>Showing {activities.length} most recent events</span>
                <span>Sorted by severity</span>
              </div>
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center px-6 text-center">
              <div>
                <CloudOff className="mx-auto h-7 w-7 text-slate-600" />
                <p className="mt-3 text-sm font-medium text-slate-300">No activity yet</p>
                <p className="mt-1 text-xs text-slate-500">Run a scan or connect a service to populate this feed.</p>
              </div>
            </div>
          )}
        </Panel>

        <div className="grid gap-5">
          {/* Network pulse */}
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-400">Network pulse</p>
                <h2 className="mt-1 text-[15px] font-semibold text-slate-100">Traffic now</h2>
              </div>
              {data.network?.monitoring
                ? <Wifi className="h-4 w-4 text-emerald-400" />
                : <WifiOff className="h-4 w-4 text-slate-600" />}
            </div>

            <div className="mt-5 grid grid-cols-2 divide-x divide-white/[0.08] border border-white/[0.08]">
              <div className="bg-[#0b1424] p-4">
                <ArrowUp className="h-3.5 w-3.5 text-violet-400" />
                <p className="mt-3 font-mono text-lg font-semibold text-white">
                  {data.network ? formatDataRate(data.network.upload_bps) : '—'}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Outbound</p>
              </div>
              <div className="bg-[#0b1424] p-4">
                <ArrowDown className="h-3.5 w-3.5 text-cyan-400" />
                <p className="mt-3 font-mono text-lg font-semibold text-white">
                  {data.network ? formatDataRate(data.network.download_bps) : '—'}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Inbound</p>
              </div>
            </div>
          </Panel>

          {/* Source health */}
          <Panel className="min-w-0 overflow-hidden">
            <PanelHeader kicker="Data integrity" kickerTone="violet" title="Source health" />
            <div className="divide-y divide-white/[0.06]">
              {(Object.keys(sourceNames) as SourceKey[]).map(key => {
                const source = data.sources[key];
                return (
                  <div
                    key={key}
                    className="flex min-w-0 flex-col items-start justify-between gap-1 px-5 py-2.5 text-xs sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-slate-200">
                      <SourceDot source={source} compact />
                      {sourceNames[key]}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {source.status === 'loading' ? 'Connecting' : source.updatedAt ? formatDate(source.updatedAt) : 'Unavailable'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 border-t border-white/[0.08] bg-white/[0.015] px-5 py-3 text-[11px] text-slate-500">
              <Clock3 className="h-3.5 w-3.5 shrink-0" />
              Last full refresh {data.lastSync ? relativeTime(data.lastSync) : 'in progress'}
            </div>
          </Panel>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-6 flex flex-col gap-2 border-t border-white/[0.08] pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <Server className="h-3.5 w-3.5" />
          Cyber Shield telemetry fabric
        </span>
        <span>Unavailable values are never estimated</span>
      </footer>
    </div>
  );
}