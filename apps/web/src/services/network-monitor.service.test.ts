import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatBytes,
  formatDataRate,
  getNetworkStatus,
  NetworkMonitorError,
  startNetworkMonitor,
} from './network-monitor.service';

afterEach(() => vi.unstubAllGlobals());

describe('network monitor service', () => {
  it('normalizes numeric status fields and keeps real connection data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            monitoring: true,
            uptime_seconds: '8',
            connection_count: 1,
            tcp: 1,
            udp: 0,
            established: 1,
            upload_bps: '256',
            download_bps: 1024,
            interfaces: [],
            connections: [{ process: 'chrome.exe', protocol: 'TCP' }],
            updated: '12:00:00',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const status = await getNetworkStatus();
    expect(status.uptime_seconds).toBe(8);
    expect(status.upload_bps).toBe(256);
    expect(status.connections[0].process).toBe('chrome.exe');
  });

  it('surfaces the backend error instead of a generic HTTP failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Host counters are unavailable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    await expect(startNetworkMonitor()).rejects.toMatchObject({
      message: 'Host counters are unavailable.',
      status: 503,
    } satisfies Partial<NetworkMonitorError>);
  });

  it('formats cumulative bytes separately from live rates', () => {
    expect(formatBytes(2 * 1024 ** 2)).toBe('2.0 MB');
    expect(formatDataRate(1536)).toBe('1.5 KB/s');
  });
});
