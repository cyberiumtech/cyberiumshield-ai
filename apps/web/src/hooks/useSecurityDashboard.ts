import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EmailSpamAnalysis, MalwareScanResult, PhishingScanResult } from '../services/api';
import { getNetworkStatus, type NetworkStatus } from '../services/network-monitor.service';
import {
  getVulnerabilityDashboard,
  type VulnerabilityDashboard,
} from '../services/vulnerability.service';
import { fetchKevCatalog, type KevCatalog } from '../services/threat-intelligence.service';

export type SourceKey = 'email' | 'phishing' | 'malware' | 'network' | 'vulnerability' | 'intel';
export type SourceState = {
  status: 'loading' | 'online' | 'error';
  updatedAt: string | null;
  message?: string;
};

export interface EmailLog extends EmailSpamAnalysis { id: string }
export interface PhishingLog extends PhishingScanResult { id: string; scannedAt: string }
export interface MalwareLog extends MalwareScanResult { id: string }

const initialSources: Record<SourceKey, SourceState> = {
  email: { status: 'loading', updatedAt: null },
  phishing: { status: 'loading', updatedAt: null },
  malware: { status: 'loading', updatedAt: null },
  network: { status: 'loading', updatedAt: null },
  vulnerability: { status: 'loading', updatedAt: null },
  intel: { status: 'loading', updatedAt: null },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readHistory<T>(key: string, validate: (item: Record<string, unknown>) => boolean): T[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value)
      ? value.filter((item): item is T => isRecord(item) && validate(item))
      : [];
  } catch {
    return [];
  }
}

function getHistories() {
  return {
    email: readHistory<EmailLog>('email_spam_scan_logs', item =>
      typeof item.verdict === 'string' && typeof item.scannedAt === 'string'
    ),
    phishing: readHistory<PhishingLog>('phishing_scan_logs', item =>
      typeof item.prediction === 'string' && typeof item.url === 'string'
    ),
    malware: readHistory<MalwareLog>('malware_scan_logs', item =>
      typeof item.classification === 'string' && typeof item.filename === 'string'
    ),
  };
}

async function checkHealth(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { cache: 'no-store', signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return true;
}

export function useSecurityDashboard() {
  const [histories, setHistories] = useState(getHistories);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [vulnerability, setVulnerability] = useState<VulnerabilityDashboard | null>(null);
  const [intel, setIntel] = useState<KevCatalog | null>(null);
  const [sources, setSources] = useState(initialSources);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mounted = useRef(true);

  const updateSource = useCallback((key: SourceKey, next: SourceState) => {
    if (mounted.current) setSources(previous => ({ ...previous, [key]: next }));
  }, []);

  const refreshHistories = useCallback(() => setHistories(getHistories()), []);

  const loadNetwork = useCallback(async (signal?: AbortSignal) => {
    try {
      const value = await getNetworkStatus(signal);
      if (!mounted.current) return;
      setNetwork(value);
      updateSource('network', { status: 'online', updatedAt: value.updated || new Date().toISOString() });
    } catch (error) {
      if (signal?.aborted) return;
      updateSource('network', { status: 'error', updatedAt: null, message: error instanceof Error ? error.message : 'Unavailable' });
    }
  }, [updateSource]);

  const loadVulnerability = useCallback(async (signal?: AbortSignal) => {
    try {
      const value = await getVulnerabilityDashboard(signal);
      if (!mounted.current) return;
      setVulnerability(value);
      updateSource('vulnerability', { status: 'online', updatedAt: value.updated_at || new Date().toISOString() });
    } catch (error) {
      if (signal?.aborted) return;
      updateSource('vulnerability', { status: 'error', updatedAt: null, message: error instanceof Error ? error.message : 'Unavailable' });
    }
  }, [updateSource]);

  const loadIntel = useCallback(async (signal?: AbortSignal) => {
    try {
      const value = await fetchKevCatalog(signal);
      if (!mounted.current) return;
      setIntel(value);
      updateSource('intel', { status: 'online', updatedAt: value.fetchedAt });
    } catch (error) {
      if (signal?.aborted) return;
      updateSource('intel', { status: 'error', updatedAt: null, message: error instanceof Error ? error.message : 'Unavailable' });
    }
  }, [updateSource]);

  const loadDetectorHealth = useCallback(async (signal?: AbortSignal) => {
    const targets: Array<[SourceKey, string]> = [
      ['email', `${import.meta.env.VITE_EMAIL_SPAM_API_URL || '/email-spam-api'}/api/health`],
      ['phishing', `${import.meta.env.VITE_PHISHING_API_URL || '/phishing-api'}/api/health`],
      ['malware', `${import.meta.env.VITE_MALWARE_API_URL || '/malware-api'}/health`],
    ];
    const results = await Promise.allSettled(targets.map(([, url]) => checkHealth(url, signal)));
    if (!mounted.current || signal?.aborted) return;
    const updatedAt = new Date().toISOString();
    results.forEach((result, index) => {
      updateSource(targets[index][0], result.status === 'fulfilled'
        ? { status: 'online', updatedAt }
        : { status: 'error', updatedAt: null, message: 'Detector service is offline' });
    });
  }, [updateSource]);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    refreshHistories();
    await Promise.allSettled([loadNetwork(), loadVulnerability(), loadIntel(), loadDetectorHealth()]);
    if (mounted.current) {
      setLastSync(new Date().toISOString());
      setIsRefreshing(false);
    }
  }, [loadDetectorHealth, loadIntel, loadNetwork, loadVulnerability, refreshHistories]);

  useEffect(() => {
    mounted.current = true;
    const initialController = new AbortController();
    void Promise.allSettled([
      loadNetwork(initialController.signal),
      loadVulnerability(initialController.signal),
      loadIntel(initialController.signal),
      loadDetectorHealth(initialController.signal),
    ]).then(() => mounted.current && setLastSync(new Date().toISOString()));

    const networkTimer = window.setInterval(() => {
      if (!document.hidden) void loadNetwork();
    }, 2_000);
    const backgroundNetworkTimer = window.setInterval(() => {
      if (document.hidden) void loadNetwork();
    }, 15_000);
    const vulnerabilityTimer = window.setInterval(() => void loadVulnerability(), 30_000);
    const detectorTimer = window.setInterval(() => void loadDetectorHealth(), 30_000);
    const intelTimer = window.setInterval(() => void loadIntel(), 15 * 60_000);
    const historyTimer = window.setInterval(refreshHistories, 5_000);
    const onHistoryChange = () => refreshHistories();
    window.addEventListener('storage', onHistoryChange);
    window.addEventListener('cyberium:scan-history-updated', onHistoryChange);

    return () => {
      mounted.current = false;
      initialController.abort();
      [networkTimer, backgroundNetworkTimer, vulnerabilityTimer, detectorTimer, intelTimer, historyTimer]
        .forEach(window.clearInterval);
      window.removeEventListener('storage', onHistoryChange);
      window.removeEventListener('cyberium:scan-history-updated', onHistoryChange);
    };
  }, [loadDetectorHealth, loadIntel, loadNetwork, loadVulnerability, refreshHistories]);

  const summary = useMemo(() => {
    const online = Object.values(sources).filter(source => source.status === 'online').length;
    const loading = Object.values(sources).filter(source => source.status === 'loading').length;
    return { online, loading, offline: 6 - online - loading };
  }, [sources]);

  return { ...histories, network, vulnerability, intel, sources, summary, lastSync, isRefreshing, refreshAll };
}
