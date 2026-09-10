import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Cable,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  Gauge,
  Play,
  RadioTower,
  RefreshCw,
  Search,
  Square,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  downloadNetworkCsv,
  exportNetworkConnections,
  formatBytes,
  formatDataRate,
  formatUptime,
  getNetworkStatus,
  NetworkStatus,
  startNetworkMonitor,
  stopNetworkMonitor,
} from '../../services/network-monitor.service';

/* ─────────────────────────────────────────────────────────────
   FONT STACK
   ───────────────────────────────────────────────────────────── */
const FONT_SANS = "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

type HistorySample = { id: number; download: number; upload: number };
type SortKey = 'process' | 'pid' | 'protocol' | 'local_address' | 'remote_address' | 'status';
type SortDirection = 'asc' | 'desc';

/* ─────────────────────────────────────────────────────────────
   SHARED STYLES
   ───────────────────────────────────────────────────────────── */
const button =
  'inline-flex h-9 items-center justify-center gap-2 border border-white/[0.08] bg-[#0b1424] px-3.5 text-xs font-medium text-slate-300 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const input =
  'h-9 w-full border border-white/[0.08] bg-[#07101e] px-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16] focus:bg-[#07101e]';

/* ─────────────────────────────────────────────────────────────
   TONE HELPERS
   ───────────────────────────────────────────────────────────── */
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The network monitor did not respond.';
}

function statusTone(status: NetworkStatus | null, error: string | null) {
  if (error || !status)
    return {
      label: 'Offline',
      pill: 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400',
      dot: 'bg-rose-500',
    };
  if (!status.monitoring)
    return {
      label: 'Stopped',
      pill: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400',
      dot: 'bg-amber-500',
    };
  return {
    label: 'Live',
    pill: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400',
    dot: 'bg-emerald-500',
  };
}

function protocolTone(protocol: string) {
  return protocol.toUpperCase() === 'TCP'
    ? 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-400'
    : 'border-violet-500/40 bg-violet-500/[0.08] text-violet-400';
}

function connectionStatusTone(value: string) {
  const status = value.toUpperCase();
  if (status === 'ESTABLISHED')
    return 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400';
  if (status === 'LISTEN') return 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-400';
  if (status.includes('WAIT')) return 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400';
  return 'border-slate-700 bg-slate-800/60 text-slate-400';
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVES
   ───────────────────────────────────────────────────────────── */
function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-white/[0.08] bg-[#0b1424] ${className}`}>{children}</section>
  );
}

function PanelHeader({
  kicker,
  kickerTone = 'slate',
  title,
  hint,
  right,
}: {
  kicker: string;
  kickerTone?: 'slate' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  const tone = {
    slate: 'text-slate-500',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    violet: 'text-violet-400',
  }[kickerTone];

  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p
          className={`font-mono text-[10px] font-medium uppercase tracking-[0.18em] ${tone}`}
        >
          {kicker}
        </p>
        <h2 className="mt-1 text-[15px] font-semibold text-slate-100">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TRAFFIC CHART — the centerpiece visualization
   ───────────────────────────────────────────────────────────── */
function pointPath(history: HistorySample[], key: 'download' | 'upload', maximum: number) {
  if (!history.length) return '';
  return history
    .map((sample, index) => {
      const x = history.length === 1 ? 100 : (index / (history.length - 1)) * 100;
      // Map value 0..maximum → y 34..4 (in viewBox units)
      const y = 34 - (sample[key] / maximum) * 30;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function TrafficChart({
  history,
  status,
  offline,
}: {
  history: HistorySample[];
  status: NetworkStatus | null;
  offline: boolean;
}) {
  const maximum = Math.max(1, ...history.flatMap(sample => [sample.download, sample.upload]));
  const downloadPath = pointPath(history, 'download', maximum);
  const uploadPath = pointPath(history, 'upload', maximum);

  const emptyLabel = offline
    ? 'Waiting for the native monitor'
    : status?.monitoring
      ? 'Collecting the first live sample…'
      : 'Start monitoring to collect session traffic';

  // Current marker positions (last sample)
  const lastSample = history[history.length - 1];
  const lastY = lastSample
    ? {
        download: 34 - (lastSample.download / maximum) * 30,
        upload: 34 - (lastSample.upload / maximum) * 30,
      }
    : null;

  // Peak / average
  const peak = maximum;
  const avgDown = history.length
    ? history.reduce((a, b) => a + b.download, 0) / history.length
    : 0;
  const avgUp = history.length
    ? history.reduce((a, b) => a + b.upload, 0) / history.length
    : 0;

  return (
    <Panel className="min-w-0 overflow-hidden">
      <PanelHeader
        kicker="Traffic pulse"
        kickerTone="cyan"
        title="Session throughput"
        hint="Receive and transmit rate sampled live while this page is open"
        right={
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <span className="h-1.5 w-3 bg-cyan-500" /> Download
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <span className="h-1.5 w-3 bg-violet-500" /> Upload
            </span>
          </div>
        }
      />

      {/* Stat strip */}
      <div className="grid grid-cols-2 divide-x divide-white/[0.08] border-b border-white/[0.08] sm:grid-cols-4">
        <StatCell
          label="Download"
          value={formatDataRate(status?.download_bps ?? 0)}
          tone="cyan"
        />
        <StatCell
          label="Upload"
          value={formatDataRate(status?.upload_bps ?? 0)}
          tone="violet"
        />
        <StatCell label="Peak" value={formatDataRate(peak)} tone="slate" />
        <StatCell
          label="Average"
          value={`${formatDataRate(avgDown)} ↓`}
          sub={`${formatDataRate(avgUp)} ↑`}
          tone="slate"
        />
      </div>

      {/* Chart area */}
      <div className="relative bg-[#07101e]">
        {/* Y-axis labels */}
        <div className="pointer-events-none absolute bottom-4 left-3 top-4 flex flex-col justify-between font-mono text-[9px] text-slate-600">
          <span>{formatDataRate(maximum)}</span>
          <span>{formatDataRate(maximum * 0.66)}</span>
          <span>{formatDataRate(maximum * 0.33)}</span>
          <span>0 B/s</span>
        </div>

        <svg
          viewBox="0 0 100 38"
          preserveAspectRatio="none"
          className="block h-[280px] w-full pl-14 pr-3 lg:h-[340px]"
          role="img"
          aria-label="Live upload and download rates collected during this browser session"
        >
          <defs>
            <linearGradient id="network-download-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {[4, 14, 24, 34].map(y => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.08)"
              strokeWidth="0.15"
            />
          ))}

          {/* Vertical gridlines */}
          {[0, 20, 40, 60, 80, 100].map(x => (
            <line
              key={x}
              x1={x}
              x2={x}
              y1="4"
              y2="34"
              stroke="rgba(148,163,184,0.05)"
              strokeWidth="0.1"
            />
          ))}

          {/* Download: filled area + stroke */}
          {downloadPath && (
            <>
              <path d={`${downloadPath} L 100 34 L 0 34 Z`} fill="url(#network-download-fill)" />
              <path
                d={downloadPath}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="0.55"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}

          {/* Upload: stroke only */}
          {uploadPath && (
            <path
              d={uploadPath}
              fill="none"
              stroke="#c4b5fd"
              strokeWidth="0.4"
              strokeOpacity="0.9"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Current-value markers */}
          {lastSample && lastY && (
            <>
              <circle cx="100" cy={lastY.download} r="0.9" fill="#22d3ee" />
              <circle cx="100" cy={lastY.upload} r="0.7" fill="#c4b5fd" />
            </>
          )}
        </svg>

        {/* Empty-state overlay */}
        {!history.length && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div>
              <RadioTower className="mx-auto h-6 w-6 text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-300">{emptyLabel}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                No synthetic history is displayed.
              </p>
            </div>
          </div>
        )}

        {/* Live sample count footer */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#0b1424] px-5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
          <span>{history.length} samples this session</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status?.monitoring && !offline ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            />
            {status?.monitoring && !offline ? 'Sampling every 2s' : 'Sampler idle'}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function StatCell({
  label,
  value,
  sub,
  tone = 'slate',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'cyan' | 'violet' | 'slate';
}) {
  const color = {
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
    slate: 'text-slate-100',
  }[tone];

  return (
    <div className="flex flex-col gap-1.5 px-5 py-3.5">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className={`font-mono text-lg font-semibold leading-none tracking-tight ${color}`}>
        {value}
      </p>
      {sub && <p className="font-mono text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   METRIC RAIL
   ───────────────────────────────────────────────────────────── */
function MetricRail({ status }: { status: NetworkStatus | null }) {
  const metrics = [
    { label: 'Active connections', value: status?.connection_count ?? 0, icon: Cable },
    { label: 'Established', value: status?.established ?? 0, icon: Activity },
    { label: 'TCP sockets', value: status?.tcp ?? 0, icon: ArrowDown },
    { label: 'UDP sockets', value: status?.udp ?? 0, icon: ArrowUp },
    { label: 'Download rate', value: formatDataRate(status?.download_bps ?? 0), icon: Download },
    { label: 'Upload rate', value: formatDataRate(status?.upload_bps ?? 0), icon: Gauge },
  ];

  return (
    <Panel className="w-full min-w-0 overflow-hidden">
      <PanelHeader
        kicker="Host socket inventory"
        kickerTone="slate"
        title="Operational summary"
      />
      <div className="divide-y divide-white/[0.06]">
        {metrics.map(({ label, value, icon: Icon }, index) => (
          <div
            key={label}
            className="group flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-white/[0.02]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-cyan-400" />
              <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                {label}
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm font-semibold text-slate-100">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
        <span>{status?.monitoring ? 'Sampler running' : 'Sampler idle'}</span>
        <span>{status?.uptime_seconds ? formatUptime(status.uptime_seconds) : '—'}</span>
      </div>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────
   SORT BUTTON
   ───────────────────────────────────────────────────────────── */
function SortButton({
  label,
  column,
  sortKey,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1 py-1 text-left transition hover:text-slate-200 focus:outline-none focus-visible:text-cyan-300"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? 'text-cyan-400' : 'text-slate-600'}`} />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   NETWORK PAGE
   ───────────────────────────────────────────────────────────── */
export function NetworkPage() {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<HistorySample[]>([]);
  const [search, setSearch] = useState('');
  const [protocol, setProtocol] = useState('all');
  const [connectionState, setConnectionState] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('process');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const mountedRef = useRef(false);
  const fetchingRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const lastSampleRef = useRef('');

  const loadStatus = useCallback(async (announce = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setRefreshing(true);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const next = await getNetworkStatus(controller.signal);
      if (!mountedRef.current) return;
      setStatus(next);
      setError(null);
      if (next.monitoring && next.updated !== lastSampleRef.current) {
        lastSampleRef.current = next.updated;
        setHistory(current => [
          ...current.slice(-35),
          { id: Date.now(), download: next.download_bps, upload: next.upload_bps },
        ]);
      }
      if (announce) toast.success('Network status refreshed.');
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError(errorMessage(requestError));
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const poll = async () => {
      await loadStatus();
      if (!stopped) timer = setTimeout(poll, document.hidden ? 10_000 : 2_000);
    };
    const handleVisibility = () => {
      if (!document.hidden) void loadStatus();
    };
    void poll();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopped = true;
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
      controllerRef.current?.abort();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadStatus]);

  const runAction = async () => {
    if (!status || actionBusy) return;
    setActionBusy(true);
    try {
      if (status.monitoring) {
        await stopNetworkMonitor();
        toast.success('Network monitoring stopped.');
      } else {
        await startNetworkMonitor();
        setHistory([]);
        lastSampleRef.current = '';
        toast.success('Network monitoring started.');
      }
      await loadStatus();
    } catch (actionError) {
      toast.error(errorMessage(actionError));
    } finally {
      setActionBusy(false);
    }
  };

  const runExport = async () => {
    setExporting(true);
    try {
      downloadNetworkCsv(await exportNetworkConnections());
      toast.success('Connection inventory exported.');
    } catch (exportError) {
      toast.error(errorMessage(exportError));
    } finally {
      setExporting(false);
    }
  };

  const statuses = useMemo(
    () => [...new Set((status?.connections ?? []).map(item => item.status).filter(Boolean))].sort(),
    [status?.connections]
  );

  const filteredConnections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...(status?.connections ?? [])]
      .filter(connection => {
        const matchesSearch =
          !query ||
          [
            connection.process,
            connection.pid,
            connection.protocol,
            connection.local_address,
            connection.remote_address,
            connection.status,
          ].some(value => String(value).toLowerCase().includes(query));
        const matchesProtocol = protocol === 'all' || connection.protocol === protocol;
        const matchesState = connectionState === 'all' || connection.status === connectionState;
        return matchesSearch && matchesProtocol && matchesState;
      })
      .sort((left, right) => {
        const a = left[sortKey];
        const b = right[sortKey];
        const result =
          typeof a === 'number' && typeof b === 'number'
            ? a - b
            : String(a).localeCompare(String(b), undefined, { numeric: true });
        return sortDirection === 'asc' ? result : -result;
      });
  }, [connectionState, protocol, search, sortDirection, sortKey, status?.connections]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredConnections.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleConnections = filteredConnections.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  useEffect(() => setPage(1), [search, protocol, connectionState]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection(current => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const tone = statusTone(status, error);
  const offline = Boolean(error);
  const canAct = Boolean(status && !offline);

  /* Connection state distribution — for the mini bar chart in the header */
  const stateBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    (status?.connections ?? []).forEach(c => {
      const key = c.status || 'UNSPECIFIED';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label, count, pct: (count / total) * 100 }));
  }, [status?.connections]);

  return (
    <div
      style={{ fontFamily: FONT_SANS }}
      className="relative mx-auto w-full min-w-0 max-w-[1640px] space-y-5 pb-10 text-slate-200"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center border border-white/[0.08] bg-[#0b1424]">
            <Activity className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Network operations
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Network Monitoring
              </h1>
              <span
                aria-live="polite"
                className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${tone.pill}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                {initialLoading ? 'Connecting' : tone.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden border-l border-white/[0.08] pl-4 sm:block">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {status?.updated && !offline ? 'Last update' : 'Local source'}
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-300">
              {status?.updated && !offline ? status.updated : '127.0.0.1:5003'}
              {status?.monitoring ? ` · Up ${formatUptime(status.uptime_seconds)}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={runAction}
            disabled={!canAct || actionBusy}
            className={button}
          >
            {status?.monitoring ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {actionBusy ? 'Applying…' : status?.monitoring ? 'Stop monitor' : 'Start monitor'}
          </button>
          <button
            type="button"
            onClick={runExport}
            disabled={!canAct || exporting}
            className={button}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </header>

      {/* ═══════════════ OFFLINE BANNER ═══════════════ */}
      {offline && (
        <section
          aria-live="assertive"
          className="border-l-2 border-rose-500 bg-rose-500/[0.04] px-5 py-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-rose-400">
                  Native monitor unavailable
                </p>
                <h2 className="mt-1 text-sm font-semibold text-slate-100">
                  Could not reach the local telemetry service
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{error}</p>
                <code className="mt-2 block break-all border border-white/[0.08] bg-[#07101e] px-3 py-2 font-mono text-[11px] text-slate-500">
                  $env:NETWORK_MONITOR_PORT=5003; .\Network-Monitoring\.venv\Scripts\python.exe
                  .\Network-Monitoring\app.py
                </code>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadStatus(true)}
              disabled={refreshing}
              className={button}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Retry
            </button>
          </div>
        </section>
      )}

      {/* ═══════════════ CHART + METRICS ═══════════════ */}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
        <TrafficChart history={history} status={status} offline={offline} />
        <MetricRail status={status} />
      </div>

      {/* ═══════════════ CONNECTIONS TABLE ═══════════════ */}
      <Panel className="min-w-0 overflow-hidden">
        <div className="border-b border-white/[0.08] px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-400">
                Socket inventory
              </p>
              <h2 className="mt-1 text-[15px] font-semibold text-slate-100">Active connections</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Current host sockets reported by Windows. Refreshes while this page is open.
              </p>

              {/* State distribution mini-bars */}
              {stateBreakdown.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {stateBreakdown.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        {item.label}
                      </span>
                      <span className="relative h-1 w-16 bg-white/[0.06]">
                        <span
                          className="absolute inset-y-0 left-0 bg-cyan-500"
                          style={{ width: `${Math.max(4, item.pct)}%` }}
                        />
                      </span>
                      <span className="font-mono text-[10px] font-medium text-slate-300">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 sm:w-64">
                <span className="sr-only">Search connections</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search process, PID, address…"
                  className={`${input} pl-9`}
                />
              </label>
              <select
                value={protocol}
                onChange={event => setProtocol(event.target.value)}
                aria-label="Filter by protocol"
                className={`${input} cursor-pointer appearance-none pr-8 sm:w-36`}
              >
                <option value="all">All protocols</option>
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
              </select>
              <select
                value={connectionState}
                onChange={event => setConnectionState(event.target.value)}
                aria-label="Filter by connection state"
                className={`${input} cursor-pointer appearance-none pr-8 sm:w-40`}
              >
                <option value="all">All states</option>
                {statuses.map(item => (
                  <option key={item} value={item}>
                    {item || 'Unknown'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={button}
                onClick={() => void loadStatus(true)}
                disabled={refreshing}
                aria-label="Refresh connections now"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {initialLoading ? (
          <div className="space-y-px p-5" aria-label="Loading connections">
            {[1, 2, 3, 4].map(item => (
              <div key={item} className="h-10 animate-pulse bg-white/[0.03]" />
            ))}
          </div>
        ) : visibleConnections.length ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col className="w-[200px]" />
                  <col className="w-[80px]" />
                  <col className="w-[100px]" />
                  <col />
                  <col />
                  <col className="w-[140px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.015] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    {(
                      [
                        ['Process', 'process'],
                        ['PID', 'pid'],
                        ['Protocol', 'protocol'],
                        ['Local endpoint', 'local_address'],
                        ['Remote endpoint', 'remote_address'],
                        ['State', 'status'],
                      ] as [string, SortKey][]
                    ).map(([label, key]) => (
                      <th key={key} scope="col" className="px-5 py-2.5 font-medium first:pl-6 last:pr-6">
                        <SortButton
                          label={label}
                          column={key}
                          sortKey={sortKey}
                          onSort={handleSort}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {visibleConnections.map((connection, index) => (
                    <motion.tr
                      key={`${connection.timestamp}-${connection.protocol}-${connection.local_address}-${connection.remote_address}-${connection.pid}-${index}`}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm transition hover:bg-white/[0.025]"
                    >
                      <td
                        className="truncate px-5 py-3 pl-6 font-medium text-slate-200"
                        title={connection.process || 'Unavailable'}
                      >
                        {connection.process || 'Unavailable'}
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                        {connection.pid || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${protocolTone(connection.protocol)}`}
                        >
                          {connection.protocol}
                        </span>
                      </td>
                      <td className="truncate px-5 py-3 font-mono text-[11px] text-slate-300">
                        {connection.local_address || '—'}
                      </td>
                      <td className="truncate px-5 py-3 font-mono text-[11px] text-slate-300">
                        {connection.remote_address || '—'}
                      </td>
                      <td className="px-5 py-3 pr-6">
                        <span
                          className={`inline-flex border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${connectionStatusTone(connection.status)}`}
                        >
                          {connection.status || 'UNSPECIFIED'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-white/[0.06] md:hidden">
              {visibleConnections.map((connection, index) => (
                <article
                  key={`${connection.local_address}-${connection.remote_address}-${index}`}
                  className="px-5 py-4"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {connection.process || 'Process unavailable'}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                        PID {connection.pid || '—'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${protocolTone(connection.protocol)}`}
                    >
                      {connection.protocol}
                    </span>
                  </div>
                  <dl className="mt-3 grid min-w-0 gap-2 text-xs">
                    <div className="min-w-0">
                      <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                        Local
                      </dt>
                      <dd className="mt-0.5 break-all font-mono text-[11px] text-slate-300">
                        {connection.local_address || '—'}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                        Remote
                      </dt>
                      <dd className="mt-0.5 break-all font-mono text-[11px] text-slate-300">
                        {connection.remote_address || '—'}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <span
                      className={`inline-flex border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${connectionStatusTone(connection.status)}`}
                    >
                      {connection.status || 'UNSPECIFIED'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <Wifi className="mx-auto h-6 w-6 text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-300">
              {status?.connections.length
                ? 'No connections match these filters'
                : status?.monitoring
                  ? 'No host connections reported'
                  : 'Monitoring is stopped'}
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              {status?.connections.length
                ? 'Adjust the search or filters to inspect another connection.'
                : 'Start the monitor or refresh after network activity occurs.'}
            </p>
          </div>
        )}

        {/* Footer / pagination */}
        <div className="flex flex-col gap-3 border-t border-white/[0.08] bg-white/[0.015] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {filteredConnections.length
              ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(
                  currentPage * pageSize,
                  filteredConnections.length
                )} of ${filteredConnections.length}`
              : '0 results'}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-[#0b1424] text-slate-400 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[64px] px-2 text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-[#0b1424] text-slate-400 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Panel>

      {/* ═══════════════ INTERFACES ═══════════════ */}
      <Panel className="overflow-hidden">
        <PanelHeader
          kicker="Interface inventory"
          kickerTone="violet"
          title="Network interfaces"
          hint="OS totals since startup — these are cumulative, not live rates."
          right={
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {status?.interfaces.length ?? 0} detected
            </span>
          }
        />
        {status?.interfaces.length ? (
          <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-3">
            {status.interfaces.map(item => (
              <article
                key={item.name}
                className="min-w-0 bg-[#0b1424] p-5 transition hover:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center border border-white/[0.08] bg-[#07101e] text-cyan-400">
                      <Cable className="h-3.5 w-3.5" />
                    </span>
                    <h3
                      className="truncate text-sm font-medium text-slate-200"
                      title={item.name}
                    >
                      {item.name}
                    </h3>
                  </div>
                  <span
                    className={`font-mono text-[10px] font-medium uppercase tracking-wider ${
                      item.is_up ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {item.is_up ? 'UP' : 'DOWN'}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-3">
                  <div>
                    <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                      Received
                    </dt>
                    <dd className="mt-1 font-mono text-sm text-slate-200">
                      {formatBytes(item.bytes_recv)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                      Sent
                    </dt>
                    <dd className="mt-1 font-mono text-sm text-slate-200">
                      {formatBytes(item.bytes_sent)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No interface data is available.
          </div>
        )}
      </Panel>

      {/* ═══════════════ FOOTER NOTE ═══════════════ */}
      <aside className="flex items-start gap-2.5 border-t border-white/[0.08] pt-4 text-[11px] leading-relaxed text-slate-500">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p>
          Process names and PIDs may be unavailable for protected system sockets unless the native
          monitor has appropriate Windows permissions. CyberShield reads connection metadata only
          and does not block traffic or modify network settings.
        </p>
      </aside>
    </div>
  );
}

export default NetworkPage;