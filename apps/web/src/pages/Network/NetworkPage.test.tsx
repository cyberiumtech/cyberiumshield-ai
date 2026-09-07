import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkPage } from './NetworkPage';
import * as networkService from '../../services/network-monitor.service';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/network-monitor.service', async importOriginal => {
  const original = await importOriginal<typeof import('../../services/network-monitor.service')>();
  return {
    ...original,
    getNetworkStatus: vi.fn(),
    startNetworkMonitor: vi.fn(),
    stopNetworkMonitor: vi.fn(),
    exportNetworkConnections: vi.fn(),
    downloadNetworkCsv: vi.fn(),
  };
});

const stoppedStatus = {
  monitoring: false,
  uptime_seconds: 0,
  connection_count: 1,
  tcp: 1,
  udp: 0,
  established: 1,
  upload_bps: 0,
  download_bps: 0,
  interfaces: [{ name: 'Ethernet', bytes_sent: 2048, bytes_recv: 4096, is_up: true }],
  connections: [
    {
      timestamp: '2026-09-07 12:00:00',
      protocol: 'TCP',
      local_address: '127.0.0.1:5003',
      remote_address: '127.0.0.1:62000',
      status: 'ESTABLISHED',
      pid: 42,
      process: 'python.exe',
      bytes_sent: '',
      bytes_recv: '',
    },
  ],
  updated: '12:00:00',
};

describe('NetworkPage', () => {
  beforeEach(() => {
    vi.mocked(networkService.getNetworkStatus).mockResolvedValue(stoppedStatus);
    vi.mocked(networkService.startNetworkMonitor).mockResolvedValue({ ok: true, monitoring: true });
  });

  it('renders real connection and interface data and starts a stopped monitor', async () => {
    render(<NetworkPage />);
    expect(await screen.findAllByText('python.exe')).not.toHaveLength(0);
    expect(screen.getByText('Ethernet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start monitor' }));
    await waitFor(() => expect(networkService.startNetworkMonitor).toHaveBeenCalledOnce());
  });

  it('shows a useful offline state when the native service is unreachable', async () => {
    vi.mocked(networkService.getNetworkStatus).mockRejectedValueOnce(
      new Error('The native network monitor is not reachable on port 5003.')
    );
    render(<NetworkPage />);
    expect(await screen.findByText('Native monitor unavailable')).toBeInTheDocument();
    expect(screen.getByText(/NETWORK_MONITOR_PORT=5003/)).toBeInTheDocument();
  });
});
