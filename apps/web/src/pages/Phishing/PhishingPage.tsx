import { FormEvent, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PhishingScanResult, scanPhishingUrl } from '../../services/api';

interface ScanLog extends PhishingScanResult {
  id: string;
  scannedAt: string;
}

const riskStyles: Record<PhishingScanResult['risk_level'], string> = {
  critical: 'border-red-400/30 bg-red-400/10 text-red-300',
  high: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
  low: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
  minimal: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
};

const verdictStyles: Record<PhishingScanResult['prediction'], string> = {
  phishing: 'text-red-300',
  suspicious: 'text-orange-300',
  legitimate: 'text-emerald-300',
};

const verdictLabels: Record<PhishingScanResult['prediction'], string> = {
  phishing: 'Phishing',
  suspicious: 'Suspicious',
  legitimate: 'Legitimate',
};

function normalizeUrl(value: string) {
  return /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`;
}

function formatRisk(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function PhishingPage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<PhishingScanResult | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('phishing_scan_logs') || '[]') as ScanLog[];
    } catch {
      return [];
    }
  });
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedUrl = normalizeUrl(url.trim());
    if (!url.trim()) return setError('Enter a URL to scan.');
    if (normalizedUrl.length > 2048) return setError('URL must be 2048 characters or fewer.');

    setIsScanning(true);
    setError(null);
    try {
      const scan = await scanPhishingUrl(normalizedUrl);
      const log: ScanLog = { ...scan, id: `${Date.now()}-${scan.url}`, scannedAt: new Date().toISOString() };
      const nextLogs = [log, ...logs].slice(0, 25);
      setResult(scan);
      setLogs(nextLogs);
      localStorage.setItem('phishing_scan_logs', JSON.stringify(nextLogs));
      window.dispatchEvent(new Event('cyberium:scan-history-updated'));
      if (scan.prediction === 'phishing') {
        toast.error('Phishing indicators detected.');
      } else if (scan.prediction === 'suspicious') {
        toast.warning('Suspicious URL indicators detected.');
      } else {
        toast.success('No phishing pattern detected.');
      }
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : 'Unable to reach the phishing detector.';
      setError(message);
      toast.error('Phishing scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const clearLogs = () => {
    localStorage.removeItem('phishing_scan_logs');
    window.dispatchEvent(new Event('cyberium:scan-history-updated'));
    setLogs([]);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">URL analysis</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">Phishing Detection</h1>
        <p className="mt-2 text-sm text-slate-400">Analyze a URL without visiting it and inspect the signals behind the decision.</p>
      </header>

      <section className="rounded-2xl border border-cyan-400/20 bg-[#0F1729]/70 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="example.com/login" className="w-full rounded-lg border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60" aria-label="URL to scan" />
          </label>
          <button type="submit" disabled={isScanning} className="flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">
            {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {isScanning ? 'Scanning...' : 'Scan URL'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <p className="mt-3 text-xs text-slate-500">The detector analyzes URL structure only. It never fetches or opens the submitted address.</p>
      </section>

      {result && (
        <section className="rounded-2xl border border-white/10 bg-[#0F1729]/70 p-6">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-5">
            <div className="flex min-w-0 items-start gap-3">
              {result.prediction === 'legitimate' ? <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-emerald-300" /> : <AlertTriangle className={`mt-1 h-6 w-6 shrink-0 ${verdictStyles[result.prediction]}`} />}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Latest result</p>
                <p className="mt-1 flex items-center gap-2 break-all text-lg font-semibold text-slate-100">{result.url} <ExternalLink className="h-4 w-4 shrink-0 text-slate-600" /></p>
                <p className="mt-2 text-sm text-slate-400">Prediction: <span className={verdictStyles[result.prediction]}>{verdictLabels[result.prediction]}</span></p>
              </div>
            </div>
            <div className={`rounded-lg border px-4 py-3 text-center ${riskStyles[result.risk_level]}`}>
              <p className="text-2xl font-bold">{Math.round(result.phishing_probability * 100)}%</p>
              <p className="text-xs">{formatRisk(result.risk_level)} risk</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[['Confidence', `${Math.round(result.confidence * 100)}%`], ['Model', result.model], ['Signals flagged', String(result.signals.filter((signal) => signal.flagged).length)]].map(([label, value]) => <div key={label} className="rounded-lg bg-white/5 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-200">{value}</p></div>)}
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Detection signals</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {result.signals.map((signal) => <div key={signal.label} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${signal.flagged ? 'border-orange-400/20 bg-orange-400/5 text-orange-200' : 'border-white/5 text-slate-500'}`}><span>{signal.label}</span><span className="text-xs">{signal.flagged ? `Flagged · ${signal.value}` : 'Clear'}</span></div>)}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#0F1729]/70 p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Recent activity</p><h2 className="mt-1 text-lg font-semibold text-slate-100">Scan logs</h2></div>{logs.length > 0 && <button type="button" onClick={clearLogs} className="text-xs text-slate-500 transition hover:text-red-300">Clear logs</button>}</div>
        {logs.length === 0 ? <p className="mt-5 rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No URLs have been scanned yet.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3 font-medium">URL</th><th className="px-3 py-3 font-medium">Result</th><th className="px-3 py-3 font-medium">Risk</th><th className="px-3 py-3 font-medium">Scanned</th></tr></thead><tbody className="divide-y divide-white/5">{logs.map((log) => <tr key={log.id} className="text-slate-300"><td className="max-w-[360px] truncate px-3 py-3 font-mono text-xs text-slate-200" title={log.url}>{log.url}</td><td className={`px-3 py-3 ${verdictStyles[log.prediction]}`}>{verdictLabels[log.prediction]}</td><td className="px-3 py-3">{formatRisk(log.risk_level)}</td><td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{new Date(log.scannedAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
