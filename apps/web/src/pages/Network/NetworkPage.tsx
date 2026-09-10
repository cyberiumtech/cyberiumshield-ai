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

type HistorySample = { id: number; download: number; upload: number };
type SortKey = 'process' | 'pid' | 'protocol' | 'local_address' | 'remote_address' | 'status';
type SortDirection = 'asc' | 'desc';

const panel =
  'border border-slate-700/70 bg-[#101a2c] shadow-[0_22px_70px_-42px_rgba(34,211,238,.4)]';
const button =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] border border-slate-700 bg-slate-900/70 px-3.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40';
const select =
  'min-h-10 rounded-[9px] border border-slate-700 bg-[#0a1322] px-3 text-sm text-slate-200 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The network monitor did not respond.';
}

function statusTone(status: NetworkStatus | null, error: string | null) {
  if (error || !status)
    return {
      label: 'Offline',
      className: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
      dot: 'bg-rose-400',
    };
  if (!status.monitoring)
    return {
      label: 'Stopped',
      className: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
      dot: 'bg-amber-300',
    };
  return {
    label: 'Live',
    className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    dot: 'bg-emerald-300',
  };
}

function protocolTone(protocol: string) {
  return protocol.toUpperCase() === 'TCP'
    ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
    : 'border-violet-400/20 bg-violet-400/10 text-violet-300';
}

function connectionStatusTone(value: string) {
  const status = value.toUpperCase();
  if (status === 'ESTABLISHED') return 'text-emerald-300';
  if (status === 'LISTEN') return 'text-cyan-300';
  if (status.includes('WAIT')) return 'text-amber-300';
  return 'text-slate-400';
}

function pointPath(history: HistorySample[], key: 'download' | 'upload', maximum: number) {
  if (!history.length) return '';
  return history
    .map((sample, index) => {
      const x = history.length === 1 ? 100 : (index / (history.length - 1)) * 100;
      const y = 38 - (sample[key] / maximum) * 32;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function TrafficPulse({
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

  return (
    <section
      className={`${panel} relative min-h-[360px] w-full min-w-0 overflow-hidden rounded-[14px] lg:min-h-[430px]`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(34,211,238,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.035)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative flex flex-col gap-4 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Activity className="h-4 w-4 text-cyan-300" /> Traffic pulse
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            This session · receive / transmit
          </p>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
              <span className="h-1.5 w-1.5 bg-cyan-300" /> Download
            </div>
            <p className="mt-1 font-mono text-sm font-semibold text-cyan-200">
              {formatDataRate(status?.download_bps ?? 0)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
              <span className="h-1.5 w-1.5 bg-violet-300" /> Upload
            </div>
            <p className="mt-1 font-mono text-sm font-semibold text-violet-200">
              {formatDataRate(status?.upload_bps ?? 0)}
            </p>
          </div>
        </div>
      </div>
      <div className="relative flex min-h-[278px] items-stretch px-3 pb-4 pt-7 sm:px-5 lg:min-h-[344px]">
        <div className="absolute bottom-5 left-5 top-7 flex flex-col justify-between font-mono text-[9px] text-slate-600">
          <span>{formatDataRate(maximum)}</span>
          <span>{formatDataRate(maximum / 2)}</span>
          <span>0 B/s</span>
        </div>
        <svg
          viewBox="0 0 100 42"
          preserveAspectRatio="none"
          className="ml-14 min-h-[230px] min-w-0 flex-1 overflow-visible"
          role="img"
          aria-label="Live upload and download rates collected during this browser session"
        >
          <defs>
            <linearGradient id="network-download-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity=".22" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[6, 14, 22, 30, 38].map(y => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#334155" strokeWidth=".16" />
          ))}
          {[0, 20, 40, 60, 80, 100].map(x => (
            <line key={x} x1={x} x2={x} y1="6" y2="38" stroke="#334155" strokeWidth=".12" />
          ))}
          {downloadPath && (
            <>
              <path d={`${downloadPath} L 100 38 L 0 38 Z`} fill="url(#network-download-fill)" />
              <motion.path
                d={downloadPath}
                fill="none"
                stroke="#22d3ee"
                strokeWidth=".7"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.35 }}
              />
              <motion.path
                d={uploadPath}
                fill="none"
                stroke="#c4b5fd"
                strokeWidth=".55"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{ duration: 0.35 }}
              />
            </>
          )}
        </svg>
        {!history.length && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div>
              <RadioTower className="mx-auto h-7 w-7 text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-400">{emptyLabel}</p>
              <p className="mt-1 text-xs text-slate-600">No synthetic history is displayed.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

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
    <section
      className={`${panel} w-full min-w-0 overflow-hidden rounded-[14px]`}
      aria-label="Operational summary"
    >
      <div className="border-b border-slate-800 px-5 py-4">
        <p className="text-sm font-semibold text-white">Operational summary</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          Host socket inventory
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-1">
        {metrics.map(({ label, value, icon: Icon }, index) => (
          <div
            key={label}
            className={`group flex min-h-[92px] items-center justify-between gap-3 px-4 py-4 transition hover:bg-cyan-400/[.035] lg:min-h-0 ${index < metrics.length - 1 ? 'border-b border-slate-800/80' : ''} ${index % 2 === 0 ? 'max-lg:border-r max-lg:border-slate-800/80' : ''}`}
          >
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {label}
              </p>
              <motion.p
                key={String(value)}
                initial={{ opacity: 0.55, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 truncate font-mono text-xl font-semibold tracking-tight text-slate-100"
              >
                {value}
              </motion.p>
            </div>
            <Icon className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-cyan-300" />
          </div>
        ))}
      </div>
    </section>
  );
}

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
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1 py-1 text-left transition hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
    >
      {label} <ArrowUpDown className={`h-3 w-3 ${sortKey === column ? 'text-cyan-300' : ''}`} />
    </button>
  );
}

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

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-5 overflow-x-clip pb-12 2xl:max-w-[1540px]">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${panel} w-full min-w-0 overflow-hidden rounded-[14px]`}
      >
        <div className="h-1 bg-[linear-gradient(90deg,#22d3ee,#14b8a6_50%,transparent_88%)]" />
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-400">
              Network operations
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
                Network Monitoring
              </h1>
              <span
                aria-live="polite"
                className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${tone.className}`}
              >
                <span
                  className={`h-1.5 w-1.5 ${tone.dot} ${status?.monitoring && !error ? 'animate-pulse' : ''}`}
                />
                {initialLoading ? 'Connecting' : tone.label}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Live, read-only visibility into host connections and network interfaces.
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
              {status?.updated && !offline
                ? `Last update ${status.updated}`
                : 'Local source · 127.0.0.1:5003'}
              {status?.monitoring ? ` · Uptime ${formatUptime(status.uptime_seconds)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              onClick={runAction}
              disabled={!canAct || actionBusy}
            >
              {status?.monitoring ? (
                <Square className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {actionBusy ? 'Applying…' : status?.monitoring ? 'Stop monitor' : 'Start monitor'}
            </button>
            <button
              type="button"
              className={button}
              onClick={runExport}
              disabled={!canAct || exporting}
            >
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>
      </motion.header>

      {offline && (
        <section
          aria-live="assertive"
          className="border-l-2 border-rose-400 bg-rose-400/[.06] px-5 py-4 shadow-[inset_0_1px_rgba(251,113,133,.08)]"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              <div>
                <h2 className="text-sm font-semibold text-rose-100">Native monitor unavailable</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">{error}</p>
                <code className="mt-2 block break-all font-mono text-[11px] text-slate-500">
                  $env:NETWORK_MONITOR_PORT=5003; .\Network-Monitoring\.venv\Scripts\python.exe
                  .\Network-Monitoring\app.py
                </code>
              </div>
            </div>
            <button
              type="button"
              className={button}
              onClick={() => void loadStatus(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Retry
            </button>
          </div>
        </section>
      )}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        <TrafficPulse history={history} status={status} offline={offline} />
        <MetricRail status={status} />
      </div>

      <section className={`${panel} min-w-0 overflow-hidden rounded-[14px]`}>
        <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Active connections</h2>
              <p className="mt-1 text-xs text-slate-500">
                Current host sockets reported by Windows. Refreshes while this page is open.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 sm:w-64">
                <span className="sr-only">Search connections</span>
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search process, PID, address…"
                  className="min-h-10 w-full rounded-[9px] border border-slate-700 bg-[#0a1322] pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10"
                />
              </label>
              <label>
                <span className="sr-only">Filter by protocol</span>
                <select
                  value={protocol}
                  onChange={event => setProtocol(event.target.value)}
                  className={`${select} w-full sm:w-28`}
                >
                  <option value="all">All protocols</option>
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Filter by connection state</span>
                <select
                  value={connectionState}
                  onChange={event => setConnectionState(event.target.value)}
                  className={`${select} w-full sm:w-36`}
                >
                  <option value="all">All states</option>
                  {statuses.map(item => (
                    <option key={item} value={item}>
                      {item || 'Unknown'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={`${button} px-3`}
                onClick={() => void loadStatus(true)}
                disabled={refreshing}
                aria-label="Refresh connections now"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="sm:hidden">Refresh now</span>
              </button>
            </div>
          </div>
        </div>

        {initialLoading ? (
          <div className="space-y-px p-5" aria-label="Loading connections">
            {[1, 2, 3, 4].map(item => (
              <div key={item} className="h-12 animate-pulse bg-slate-800/50" />
            ))}
          </div>
        ) : visibleConnections.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="bg-[#0b1424] font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  <tr>
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
                      <th
                        key={key}
                        scope="col"
                        className="border-b border-slate-800 px-4 py-3 font-medium first:pl-6 last:pr-6"
                      >
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
                <tbody>
                  {visibleConnections.map((connection, index) => (
                    <motion.tr
                      key={`${connection.timestamp}-${connection.protocol}-${connection.local_address}-${connection.remote_address}-${connection.pid}-${index}`}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-slate-800/70 text-sm transition last:border-0 hover:bg-cyan-300/[.025]"
                    >
                      <td
                        className="max-w-48 truncate px-4 py-3.5 pl-6 font-medium text-slate-200"
                        title={connection.process || 'Unavailable'}
                      >
                        {connection.process || 'Unavailable'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                        {connection.pid || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex border px-1.5 py-0.5 font-mono text-[10px] font-bold ${protocolTone(connection.protocol)}`}
                        >
                          {connection.protocol}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-300">
                        {connection.local_address || '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-300">
                        {connection.remote_address || '—'}
                      </td>
                      <td
                        className={`px-4 py-3.5 pr-6 font-mono text-[10px] font-semibold ${connectionStatusTone(connection.status)}`}
                      >
                        {connection.status || 'UNSPECIFIED'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-800 md:hidden">
              {visibleConnections.map((connection, index) => (
                <article
                  key={`${connection.local_address}-${connection.remote_address}-${index}`}
                  className="px-4 py-4"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-200">
                        {connection.process || 'Process unavailable'}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-slate-600">
                        PID {connection.pid || '—'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] font-bold ${protocolTone(connection.protocol)}`}
                    >
                      {connection.protocol}
                    </span>
                  </div>
                  <dl className="mt-3 grid min-w-0 gap-2 text-xs">
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-wider text-slate-600">Local</dt>
                      <dd className="mt-0.5 break-all font-mono text-slate-300">
                        {connection.local_address || '—'}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-wider text-slate-600">
                        Remote
                      </dt>
                      <dd className="mt-0.5 break-all font-mono text-slate-300">
                        {connection.remote_address || '—'}
                      </dd>
                    </div>
                  </dl>
                  <p
                    className={`mt-3 font-mono text-[10px] font-semibold ${connectionStatusTone(connection.status)}`}
                  >
                    {connection.status || 'UNSPECIFIED'}
                  </p>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="px-6 py-14 text-center">
            <Wifi className="mx-auto h-7 w-7 text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-300">
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

        <footer className="flex flex-col gap-3 border-t border-slate-800 bg-[#0b1424] px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            {filteredConnections.length
              ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredConnections.length)} of ${filteredConnections.length}`
              : '0 results'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`${button} min-h-8 px-2`}
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center font-mono text-[10px] uppercase tracking-wider">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className={`${button} min-h-8 px-2`}
              onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Network interfaces</h2>
            <p className="mt-1 text-xs text-slate-500">
              OS totals since startup — these are cumulative, not live rates.
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
            {status?.interfaces.length ?? 0} detected
          </span>
        </div>
        {status?.interfaces.length ? (
          <div className="grid gap-px overflow-hidden border border-slate-700/70 bg-slate-700/70 sm:grid-cols-2 xl:grid-cols-3">
            {status.interfaces.map(item => (
              <article
                key={item.name}
                className="min-w-0 bg-[#101a2c] p-4 transition hover:bg-[#132037]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-700 bg-slate-900/70">
                      <Cable className="h-4 w-4 text-cyan-300" />
                    </span>
                    <h3 className="truncate text-sm font-semibold text-slate-200" title={item.name}>
                      {item.name}
                    </h3>
                  </div>
                  <span
                    className={`font-mono text-[9px] font-bold uppercase tracking-wider ${item.is_up ? 'text-emerald-300' : 'text-slate-500'}`}
                  >
                    {item.is_up ? 'UP' : 'DOWN'}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-800 pt-3">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-slate-600">
                      Received total
                    </dt>
                    <dd className="mt-1 font-mono text-sm text-slate-300">
                      {formatBytes(item.bytes_recv)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-slate-600">
                      Sent total
                    </dt>
                    <dd className="mt-1 font-mono text-sm text-slate-300">
                      {formatBytes(item.bytes_sent)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-slate-700 px-5 py-8 text-center text-sm text-slate-500">
            No interface data is available.
          </div>
        )}
      </section>

      <aside className="flex items-start gap-2.5 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-500">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
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
