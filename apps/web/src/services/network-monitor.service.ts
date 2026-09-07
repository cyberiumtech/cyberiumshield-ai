export interface NetworkConnection {
  timestamp: string;
  protocol: string;
  local_address: string;
  remote_address: string;
  status: string;
  pid: number | string;
  process: string;
  bytes_sent: number | string;
  bytes_recv: number | string;
}

export interface NetworkInterface {
  name: string;
  bytes_sent: number;
  bytes_recv: number;
  is_up: boolean;
}

export interface NetworkStatus {
  monitoring: boolean;
  uptime_seconds: number;
  connection_count: number;
  tcp: number;
  udp: number;
  established: number;
  upload_bps: number;
  download_bps: number;
  interfaces: NetworkInterface[];
  connections: NetworkConnection[];
  updated: string;
}

interface ActionResponse {
  ok: boolean;
  monitoring: boolean;
  error?: string;
}

const baseUrl = import.meta.env.VITE_NETWORK_MONITOR_URL || '/network-api';

export class NetworkMonitorError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NetworkMonitorError';
    this.status = status;
  }
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.error || body.message || `Network monitor returned HTTP ${response.status}.`;
  } catch {
    return `Network monitor returned HTTP ${response.status}.`;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json', ...init?.headers },
      ...init,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new NetworkMonitorError(
      'The native network monitor is not reachable on port 5003. Start it locally and retry.'
    );
  }

  if (!response.ok) throw new NetworkMonitorError(await readError(response), response.status);
  return response.json() as Promise<T>;
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeNetworkStatus(value: NetworkStatus): NetworkStatus {
  return {
    ...value,
    monitoring: Boolean(value.monitoring),
    uptime_seconds: finiteNumber(value.uptime_seconds),
    connection_count: finiteNumber(value.connection_count),
    tcp: finiteNumber(value.tcp),
    udp: finiteNumber(value.udp),
    established: finiteNumber(value.established),
    upload_bps: finiteNumber(value.upload_bps),
    download_bps: finiteNumber(value.download_bps),
    interfaces: Array.isArray(value.interfaces)
      ? value.interfaces.map(item => ({
          ...item,
          bytes_sent: finiteNumber(item.bytes_sent),
          bytes_recv: finiteNumber(item.bytes_recv),
          is_up: Boolean(item.is_up),
        }))
      : [],
    connections: Array.isArray(value.connections) ? value.connections : [],
    updated: typeof value.updated === 'string' ? value.updated : '',
  };
}

export async function getNetworkStatus(signal?: AbortSignal) {
  return normalizeNetworkStatus(await request<NetworkStatus>('/api/status', { signal }));
}

export function startNetworkMonitor(signal?: AbortSignal) {
  return request<ActionResponse>('/api/start', { method: 'POST', signal });
}

export function stopNetworkMonitor(signal?: AbortSignal) {
  return request<ActionResponse>('/api/stop', { method: 'POST', signal });
}

export async function exportNetworkConnections(signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/export`, {
      signal,
      cache: 'no-store',
      headers: { Accept: 'text/csv' },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new NetworkMonitorError('CSV export failed because the network monitor is offline.');
  }
  if (!response.ok) throw new NetworkMonitorError(await readError(response), response.status);
  return response.blob();
}

export function downloadNetworkCsv(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `network-connections-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function formatDataRate(bytesPerSecond: number) {
  const value = Math.max(0, finiteNumber(bytesPerSecond));
  if (value < 1024) return `${Math.round(value)} B/s`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB/s`;
  if (value < 1024 ** 3)
    return `${(value / 1024 ** 2).toFixed(value < 10 * 1024 ** 2 ? 1 : 0)} MB/s`;
  return `${(value / 1024 ** 3).toFixed(1)} GB/s`;
}

export function formatBytes(bytes: number) {
  const value = Math.max(0, finiteNumber(bytes));
  if (value < 1024) return `${Math.round(value)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let amount = value / 1024;
  let unit = units[0];
  for (let index = 1; amount >= 1024 && index < units.length; index += 1) {
    amount /= 1024;
    unit = units[index];
  }
  return `${amount.toFixed(amount < 10 ? 1 : 0)} ${unit}`;
}

export function formatUptime(seconds: number) {
  const total = Math.max(0, Math.floor(finiteNumber(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
}
