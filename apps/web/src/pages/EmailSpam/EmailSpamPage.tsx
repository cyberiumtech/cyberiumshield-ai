import { FormEvent, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  MailSearch,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { scanEmailSpam } from '../../services/api';
import type { EmailSpamAnalysis } from '../../services/api';

interface ScanLog extends EmailSpamAnalysis {
  id: string;
}

const SPAM_SAMPLE = {
  sender: 'Prize Center <winner@claim-rewards.example>',
  subject: 'URGENT!!! You won a $1,000,000 cash prize!!!',
  content: `Reply-To: collect@instant-payout.test
Authentication-Results: mx.example; spf=fail; dkim=fail; dmarc=fail

ACT NOW! This is your final warning. You won a million dollars.
Confirm your password and bank details immediately at http://192.168.10.20/claim.`,
};

const SAFE_SAMPLE = {
  sender: 'Maya Chen <maya@cyberium.example>',
  subject: 'Notes from today’s security review',
  content: `Authentication-Results: mx.cyberium.example; spf=pass; dkim=pass; dmarc=pass

Hi team,

I added the action items from today’s review to our project board. Please leave comments before Thursday’s stand-up.

Thanks,
Maya`,
};

const verdictStyles: Record<
  EmailSpamAnalysis['verdict'],
  { border: string; text: string; label: string }
> = {
  spam: { border: 'border-red-400/30 bg-red-400/10', text: 'text-red-300', label: 'Likely spam' },
  suspicious: {
    border: 'border-amber-400/30 bg-amber-400/10',
    text: 'text-amber-300',
    label: 'Suspicious',
  },
  legitimate: {
    border: 'border-emerald-400/30 bg-emerald-400/10',
    text: 'text-emerald-300',
    label: 'Likely legitimate',
  },
};

function readLogs(): ScanLog[] {
  try {
    return JSON.parse(localStorage.getItem('email_spam_scan_logs') || '[]') as ScanLog[];
  } catch {
    return [];
  }
}

export function EmailSpamPage() {
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [result, setResult] = useState<EmailSpamAnalysis | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>(readLogs);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const loadSample = (sample: typeof SPAM_SAMPLE) => {
    setSender(sample.sender);
    setSubject(sample.subject);
    setContent(sample.content);
    setResult(null);
    setError(null);
  };

  const reset = () => {
    setSender('');
    setSubject('');
    setContent('');
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim() && !subject.trim()) {
      setError('Paste the email body or enter a subject to analyze.');
      return;
    }
    if (content.length > 100_000) {
      setError('Email content must be 100,000 characters or fewer.');
      return;
    }

    setIsScanning(true);
    setError(null);
    try {
      const analysis = await scanEmailSpam({ sender, subject, content });
      const log = { ...analysis, id: `${Date.now()}-${analysis.subject}` };
      const nextLogs = [log, ...logs].slice(0, 25);
      localStorage.setItem('email_spam_scan_logs', JSON.stringify(nextLogs));
      setLogs(nextLogs);
      setResult(analysis);
      toast.success(
        analysis.verdict === 'spam' ? 'Spam indicators detected.' : 'Email analysis complete.'
      );
    } catch (scanError) {
      const message =
        scanError instanceof Error ? scanError.message : 'Unable to reach the email spam detector.';
      setError(message);
      toast.error('Email analysis failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const verdict = result ? verdictStyles[result.verdict] : null;
  const detectedSignals = result?.signals.filter(signal => signal.detected) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Message intelligence
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">Email Spam Detector</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Inspect message language, links, sender alignment, authentication headers, and
            attachment names with the locally hosted detection model.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadSample(SAFE_SAMPLE)}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5"
          >
            Try safe sample
          </button>
          <button
            type="button"
            onClick={() => loadSample(SPAM_SAMPLE)}
            className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-300 transition hover:bg-amber-400/10"
          >
            Try spam sample
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-2xl border border-cyan-400/20 bg-[#0F1729]/70 p-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300">
              <MailSearch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">Analyze an email</h2>
              <p className="text-xs text-slate-500">
                You may paste full raw headers into the message field.
              </p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium text-slate-400">
                Sender (optional)
                <input
                  value={sender}
                  onChange={event => setSender(event.target.value)}
                  placeholder="Name <sender@example.com>"
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
                />
              </label>
              <label className="space-y-1.5 text-xs font-medium text-slate-400">
                Subject (optional)
                <input
                  value={subject}
                  onChange={event => setSubject(event.target.value)}
                  placeholder="Email subject"
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-xs font-medium text-slate-400">
              Message or raw email
              <textarea
                value={content}
                onChange={event => setContent(event.target.value)}
                rows={12}
                placeholder={
                  'Paste the email body here, or include raw headers such as From, Reply-To, Subject, and Authentication-Results…'
                }
                className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-3 font-mono text-sm font-normal leading-6 text-slate-100 outline-none placeholder:font-sans placeholder:text-slate-600 focus:border-cyan-400/60"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Processed locally and never persisted by the detector
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-400 transition hover:bg-white/5"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isScanning}
                  className="flex items-center gap-2 rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  {isScanning ? 'Analyzing…' : 'Analyze email'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section
          aria-live="polite"
          className={`rounded-2xl border p-6 ${verdict ? verdict.border : 'border-white/10 bg-[#0F1729]/70'}`}
        >
          {!result || !verdict ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
              <div className="rounded-full border border-white/10 bg-white/5 p-4 text-slate-500">
                <MailSearch className="h-8 w-8" />
              </div>
              <h2 className="mt-4 font-semibold text-slate-200">Your result will appear here</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                The detector scores explainable signals and provides practical next steps.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className={`flex items-center gap-2 ${verdict.text}`}>
                  {result.verdict === 'legitimate' ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : result.verdict === 'spam' ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : (
                    <CircleAlert className="h-6 w-6" />
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] opacity-70">Assessment</p>
                    <h2 className="text-xl font-bold">{verdict.label}</h2>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-4xl font-bold ${verdict.text}`}>{result.score}</p>
                  <p className="text-xs text-slate-500">risk score / 100</p>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/20">
                <div
                  className={`h-full rounded-full transition-all ${result.verdict === 'spam' ? 'bg-red-400' : result.verdict === 'suspicious' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.max(3, result.score)}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Confidence', `${result.confidence}%`],
                  ['Links', String(result.linkCount)],
                  ['Flags', String(detectedSignals.length)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-black/10 p-3">
                    <p className="text-lg font-semibold text-slate-100">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  What to do
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {(result.verdict === 'legitimate'
                    ? [
                        'Confirm the sender if the request is unusual.',
                        'Open links only when their destination is expected.',
                      ]
                    : [
                        'Do not reply, click links, or open attachments.',
                        'Verify the request through a trusted contact method.',
                        'Report or quarantine the message.',
                      ]
                  ).map(item => (
                    <p key={item} className="flex gap-2">
                      <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 ${verdict.text}`} />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
                Automated analysis can be wrong. Treat this as decision support, especially for
                sophisticated or targeted messages.
              </p>
            </div>
          )}
        </section>
      </div>

      {result && (
        <section className="rounded-2xl border border-white/10 bg-[#0F1729]/70 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Explainable detection
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">Signal breakdown</h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {result.signals.map(signal => (
              <div
                key={signal.id}
                className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${signal.detected ? 'border-amber-400/20 bg-amber-400/5' : 'border-white/5 bg-white/[0.02]'}`}
              >
                <div>
                  <p
                    className={
                      signal.detected
                        ? 'text-sm font-medium text-amber-200'
                        : 'text-sm font-medium text-slate-400'
                    }
                  >
                    {signal.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{signal.detail}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs ${signal.detected ? 'bg-amber-400/10 text-amber-300' : 'bg-white/5 text-slate-600'}`}
                >
                  {signal.detected ? 'Detected' : 'Clear'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#0F1729]/70 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Recent activity
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">Email scan history</h2>
          </div>
          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('email_spam_scan_logs');
                setLogs([]);
              }}
              className="flex items-center gap-2 text-xs text-slate-500 transition hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear history
            </button>
          )}
        </div>
        {logs.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
            No emails have been analyzed yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Subject</th>
                  <th className="px-3 py-3 font-medium">Sender</th>
                  <th className="px-3 py-3 font-medium">Verdict</th>
                  <th className="px-3 py-3 font-medium">Score</th>
                  <th className="px-3 py-3 font-medium">Analyzed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map(log => (
                  <tr key={log.id}>
                    <td
                      className="max-w-64 truncate px-3 py-3 font-medium text-slate-200"
                      title={log.subject}
                    >
                      {log.subject}
                    </td>
                    <td className="max-w-60 truncate px-3 py-3 text-slate-400" title={log.sender}>
                      {log.sender}
                    </td>
                    <td className={`px-3 py-3 ${verdictStyles[log.verdict].text}`}>
                      {verdictStyles[log.verdict].label}
                    </td>
                    <td className="px-3 py-3 text-slate-300">{log.score}/100</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                      {new Date(log.scannedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
