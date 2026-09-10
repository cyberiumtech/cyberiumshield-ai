import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  Copy,
  History,
  Loader2,
  MailSearch,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { scanEmailSpam } from '../../services/api';
import type { EmailSpamAnalysis } from '../../services/api';

/* ------------------------------------------------------------------ */
/* Typography — single source of truth                                 */
/* ------------------------------------------------------------------ */

/**
 * Brand font for the whole page.
 * Loaded via <link> in index.html. Change this ONE string to swap fonts.
 * Example alternatives: '"Inter", sans-serif', '"Space Grotesk", sans-serif',
 * '"DM Sans", sans-serif', '"Manrope", sans-serif'.
 */
export const FONT_SANS =
  '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Monospace font for the raw email textarea and code-like fields. */
export const FONT_MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Verdict = EmailSpamAnalysis['verdict'];
type ScanLog = EmailSpamAnalysis & { id: string };

interface VerdictMeta {
  label: string;
  text: string;
  border: string;
  soft: string;
  ring: string;
  bar: string;
  Icon: LucideIcon;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'email_spam_scan_logs';
const MAX_LOGS = 25;
const MAX_CONTENT_LENGTH = 100_000;
const MAX_FIELD_LENGTH = 320;

const VERDICT_KEYS = ['spam', 'suspicious', 'legitimate'] as const;

const VERDICT_META: Record<Verdict, VerdictMeta> = {
  spam: {
    label: 'Likely spam',
    text: 'text-rose-300',
    border: 'border-rose-400/30',
    soft: 'bg-rose-500/10',
    ring: 'ring-rose-400/25',
    bar: 'bg-rose-400',
    Icon: AlertTriangle,
  },
  suspicious: {
    label: 'Suspicious',
    text: 'text-amber-300',
    border: 'border-amber-400/30',
    soft: 'bg-amber-500/10',
    ring: 'ring-amber-400/25',
    bar: 'bg-amber-400',
    Icon: CircleAlert,
  },
  legitimate: {
    label: 'Likely legitimate',
    text: 'text-emerald-300',
    border: 'border-emerald-400/30',
    soft: 'bg-emerald-500/10',
    ring: 'ring-emerald-400/25',
    bar: 'bg-emerald-400',
    Icon: CheckCircle2,
  },
};

const RECOMMENDED_ACTIONS: Record<Verdict, string[]> = {
  spam: [
    'Do not reply, click any links, or open attachments.',
    'Verify the request through a trusted contact channel.',
    'Report the message and move it to quarantine.',
  ],
  suspicious: [
    'Treat every embedded link and attachment as untrusted.',
    'Confirm the sender through a channel you already trust.',
    'Never share credentials, payment details, or one-time codes.',
  ],
  legitimate: [
    'Confirm the sender if the request is unusual.',
    'Open links only when the destination is expected.',
    'Keep the authentication headers for future reference.',
  ],
};

const SPAM_SAMPLE = {
  sender: 'Prize Center <winner@claim-rewards.example>',
  subject: 'URGENT!!! You won a $1,000,000 cash prize!!!',
  content: `Reply-To: collect@instant-payout.test
Authentication-Results: mx.example; spf=fail; dkim=fail; dmarc=fail

ACT NOW! This is your final warning. You won a million dollars.
Confirm your password and bank details immediately at http://192.168.10.20/claim.`,
};

const SAFE_SAMPLE = {
  sender: 'Maya Chen <maya@cyber.example>',
  subject: "Notes from today's security review",
  content: `Authentication-Results: mx.cyber.example; spf=pass; dkim=pass; dmarc=pass

Hi team,

I added the action items from today's review to our project board. Please leave comments before Thursday's stand-up.

Thanks,
Maya`,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const isVerdict = (value: unknown): value is Verdict =>
  typeof value === 'string' && (VERDICT_KEYS as readonly string[]).includes(value);

const clampScore = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
};

const toCount = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.trunc(numeric));
};

const createId = (): string => {
  const cryptoApi = typeof crypto !== 'undefined' ? crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

function normaliseAnalysis(analysis: EmailSpamAnalysis): EmailSpamAnalysis {
  return {
    ...analysis,
    verdict: isVerdict(analysis.verdict) ? analysis.verdict : 'suspicious',
    score: clampScore(analysis.score),
    confidence: clampScore(analysis.confidence),
    linkCount: toCount(analysis.linkCount),
    signals: Array.isArray(analysis.signals) ? analysis.signals.filter(Boolean) : [],
  };
}

function isStoredLog(value: unknown): value is ScanLog {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ScanLog>;
  return (
    typeof candidate.id === 'string' &&
    isVerdict(candidate.verdict) &&
    Number.isFinite(Number(candidate.score))
  );
}

function readLogs(): ScanLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isStoredLog)
      .map(log => ({ ...normaliseAnalysis(log), id: log.id }))
      .slice(0, MAX_LOGS);
  } catch {
    return [];
  }
}

function formatRelative(value: unknown): string {
  const date = new Date(value as string);
  const time = date.getTime();
  if (!Number.isFinite(time)) return '—';

  const diffSeconds = Math.round((time - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  if (abs < 45) return 'Just now';
  if (abs < 3_600) return relativeFormatter.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86_400) return relativeFormatter.format(Math.round(diffSeconds / 3_600), 'hour');
  if (abs < 604_800) return relativeFormatter.format(Math.round(diffSeconds / 86_400), 'day');
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFull(value: unknown): string {
  const date = new Date(value as string);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Unknown time';
}

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5 text-sm font-normal text-slate-100 outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60';

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function EmailSpamPage() {
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const [result, setResult] = useState<EmailSpamAnalysis | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>(readLogs);
  const [historyFilter, setHistoryFilter] = useState<'all' | Verdict>('all');

  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const copyTimer = useRef<number | null>(null);

  /* ----------------------------- effects ---------------------------- */

  useEffect(() => {
    const sync = () => setLogs(readLogs());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    []
  );

  /* ---------------------------- derived ----------------------------- */

  const verdictMeta = result ? VERDICT_META[result.verdict] : null;

  const detectedSignals = useMemo(
    () => result?.signals.filter(signal => signal.detected) ?? [],
    [result]
  );

  const filteredLogs = useMemo(
    () => (historyFilter === 'all' ? logs : logs.filter(log => log.verdict === historyFilter)),
    [logs, historyFilter]
  );

  const historyCounts = useMemo(
    () => ({
      all: logs.length,
      spam: logs.filter(log => log.verdict === 'spam').length,
      suspicious: logs.filter(log => log.verdict === 'suspicious').length,
      legitimate: logs.filter(log => log.verdict === 'legitimate').length,
    }),
    [logs]
  );

  /* ---------------------------- actions ----------------------------- */

  const persistLogs = useCallback((next: ScanLog[]) => {
    setLogs(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      toast.error('Scan history could not be saved in this browser.');
    }
    window.dispatchEvent(new Event('cyber:scan-history-updated'));
  }, []);

  const loadSample = useCallback((sample: typeof SPAM_SAMPLE) => {
    setSender(sample.sender);
    setSubject(sample.subject);
    setContent(sample.content);
    setResult(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setSender('');
    setSubject('');
    setContent('');
    setResult(null);
    setError(null);
  }, []);

  const runScan = useCallback(async () => {
    if (isScanning) return;

    const trimmedSubject = subject.trim();
    const trimmedContent = content.trim();

    if (!trimmedSubject && !trimmedContent) {
      setError('Add a subject or paste the email body before running the analysis.');
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`Email content must be ${MAX_CONTENT_LENGTH.toLocaleString()} characters or fewer.`);
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const raw = await scanEmailSpam({
        sender: sender.trim().slice(0, MAX_FIELD_LENGTH),
        subject: trimmedSubject.slice(0, MAX_FIELD_LENGTH),
        content,
      });

      const analysis = normaliseAnalysis(raw);
      setResult(analysis);

      const log: ScanLog = {
        ...analysis,
        id: createId(),
        scannedAt: analysis.scannedAt || new Date().toISOString(),
      };

      persistLogs([log, ...logs].slice(0, MAX_LOGS));

      toast.success(
        analysis.verdict === 'spam'
          ? 'Spam indicators detected in this message.'
          : analysis.verdict === 'suspicious'
            ? 'Suspicious traits found — review the signals.'
            : 'No strong spam indicators found.'
      );
    } catch (scanError) {
      const message =
        scanError instanceof Error
          ? scanError.message
          : 'Unable to reach the email spam detector. Please try again.';
      setError(message);
      toast.error('Email analysis failed.');
    } finally {
      setIsScanning(false);
    }
  }, [content, isScanning, logs, persistLogs, sender, subject]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runScan();
  };

  const handleFieldKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const copySummary = useCallback(async () => {
    if (!result || !verdictMeta) return;

    const summary = [
      `Verdict: ${verdictMeta.label}`,
      `Risk score: ${result.score}/100`,
      `Confidence: ${result.confidence}%`,
      `Links detected: ${result.linkCount}`,
      `Subject: ${result.subject?.trim() || '(none)'}`,
      `Sender: ${result.sender?.trim() || '(none)'}`,
      detectedSignals.length
        ? `Signals: ${detectedSignals.map(signal => signal.label).join(', ')}`
        : 'Signals: none detected',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success('Analysis summary copied.');
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error('Clipboard access is unavailable in this browser.');
    }
  }, [detectedSignals, result, verdictMeta]);

  const clearHistory = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — state reset is still applied below */
    }
    setLogs([]);
    setHistoryFilter('all');
    window.dispatchEvent(new Event('cyber:scan-history-updated'));
    toast.success('Scan history cleared.');
  }, []);

  const characterCount = content.length;
  const isOverLimit = characterCount > MAX_CONTENT_LENGTH;

  /* ------------------------------ view ------------------------------ */

  return (
    <div
      className="mx-auto max-w-6xl space-y-6 antialiased"
      style={{ fontFamily: FONT_SANS }}
    >
      {/* ------------------------------ header ------------------------------ */}
      <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#121D35] via-[#0F1729] to-[#0B1220] p-6 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <MailSearch className="h-3.5 w-3.5" aria-hidden />
              Message intelligence
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-50 sm:text-3xl">
              Email Spam Detector
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Inspect message language, embedded links, sender alignment, authentication headers
              and attachment names — scored by the locally hosted detection model.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadSample(SAFE_SAMPLE)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.07] hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/30"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Safe sample
            </button>
            <button
              type="button"
              onClick={() => loadSample(SPAM_SAMPLE)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3.5 py-2 text-xs font-semibold text-amber-300 transition hover:border-amber-400/40 hover:bg-amber-400/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/30"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Spam sample
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------- form + result --------------------------- */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        {/* form */}
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1729]/70 backdrop-blur">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <MailSearch className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-100">Analyze an email</h2>
              <p className="truncate text-xs text-slate-500">
                Raw headers are supported — paste them straight into the message field.
              </p>
            </div>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">
                  Sender <span className="font-normal text-slate-600">(optional)</span>
                </span>
                <input
                  type="text"
                  name="sender"
                  autoComplete="off"
                  spellCheck={false}
                  value={sender}
                  maxLength={MAX_FIELD_LENGTH}
                  onChange={event => setSender(event.target.value)}
                  disabled={isScanning}
                  placeholder="Name <sender@example.com>"
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">
                  Subject <span className="font-normal text-slate-600">(optional)</span>
                </span>
                <input
                  type="text"
                  name="subject"
                  autoComplete="off"
                  value={subject}
                  maxLength={MAX_FIELD_LENGTH}
                  onChange={event => setSubject(event.target.value)}
                  disabled={isScanning}
                  placeholder="Email subject"
                  className={INPUT_CLASS}
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-400">
                <span>
                  Message or raw email <span className="font-normal text-slate-600">(required)</span>
                </span>
                <span
                  className={
                    isOverLimit
                      ? 'font-mono text-[11px] font-normal text-rose-300'
                      : 'font-mono text-[11px] font-normal text-slate-600'
                  }
                  style={{ fontFamily: FONT_MONO }}
                >
                  {characterCount.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
                </span>
              </span>
              <textarea
                name="content"
                value={content}
                onChange={event => setContent(event.target.value)}
                onKeyDown={handleFieldKeyDown}
                disabled={isScanning}
                rows={12}
                spellCheck={false}
                aria-invalid={isOverLimit}
                placeholder={
                  'Paste the email body here, or include raw headers such as From, Reply-To, Subject and Authentication-Results…'
                }
                className={`${INPUT_CLASS} resize-y leading-6 placeholder:font-sans`}
                style={{ fontFamily: FONT_MONO }}
              />
            </label>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/[0.08] px-3.5 py-3 text-sm text-rose-200"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="leading-5">{error}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                Processed locally — nothing is stored by the detector
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={reset}
                  disabled={isScanning}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={isScanning}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/15 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1729] disabled:cursor-wait disabled:opacity-60 disabled:shadow-none"
                >
                  {isScanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden />
                  )}
                  {isScanning ? 'Analyzing…' : 'Analyze email'}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-600">
              Tip: press{' '}
              <kbd
                className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400"
                style={{ fontFamily: FONT_MONO }}
              >
                Ctrl
              </kbd>{' '}
              +{' '}
              <kbd
                className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400"
                style={{ fontFamily: FONT_MONO }}
              >
                Enter
              </kbd>{' '}
              to run the analysis.
            </p>
          </form>
        </section>

        {/* result */}
        <aside
          aria-live="polite"
          aria-busy={isScanning}
          className={`flex flex-col overflow-hidden rounded-2xl border bg-[#0F1729]/70 backdrop-blur transition-colors ${
            verdictMeta ? verdictMeta.border : 'border-white/[0.08]'
          }`}
        >
          {isScanning ? (
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 animate-pulse rounded-xl bg-white/[0.06]" />
                  <div className="space-y-2">
                    <div className="h-2.5 w-20 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-3.5 w-28 animate-pulse rounded bg-white/[0.06]" />
                  </div>
                </div>
                <div className="h-10 w-16 animate-pulse rounded bg-white/[0.06]" />
              </div>
              <div className="h-2 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map(index => (
                  <div key={index} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.05]" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-white/[0.05]" />
              </div>
              <p className="pt-1 text-center text-xs text-slate-500">
                Running heuristics over the message…
              </p>
            </div>
          ) : !result || !verdictMeta ? (
            <div className="flex min-h-[22rem] flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-500">
                <MailSearch className="h-7 w-7" aria-hidden />
              </div>
              <h2 className="mt-5 text-sm font-bold text-slate-200">
                Your result will appear here
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                The detector returns an explainable risk score, the signals it matched, and
                practical next steps.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-start justify-between gap-4">
                <div className={`flex items-center gap-3 ${verdictMeta.text}`}>
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ${verdictMeta.soft} ${verdictMeta.ring}`}
                  >
                    <verdictMeta.Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Assessment
                    </p>
                    <p className="text-lg font-extrabold leading-tight">{verdictMeta.label}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-4xl font-extrabold tabular-nums leading-none ${verdictMeta.text}`}
                  >
                    {result.score}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">risk score / 100</p>
                </div>
              </div>

              <div
                className="mt-5 h-2 overflow-hidden rounded-full bg-black/30"
                role="progressbar"
                aria-valuenow={result.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Risk score"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out ${verdictMeta.bar}`}
                  style={{ width: `${Math.min(100, Math.max(3, result.score))}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: 'Confidence', value: `${result.confidence}%` },
                  { label: 'Links', value: String(result.linkCount) },
                  { label: 'Flags', value: String(detectedSignals.length) },
                ].map(metric => (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3 text-center"
                  >
                    <p className="text-lg font-bold tabular-nums text-slate-100">
                      {metric.value}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{metric.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  What to do
                </p>
                <ul className="mt-3 space-y-2">
                  {RECOMMENDED_ACTIONS[result.verdict].map(action => (
                    <li key={action} className="flex gap-2 text-sm leading-5 text-slate-300">
                      <ChevronRight
                        className={`mt-0.5 h-4 w-4 shrink-0 ${verdictMeta.text}`}
                        aria-hidden
                      />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto space-y-3 pt-6">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate" title={formatFull(result.scannedAt)}>
                      Analyzed {formatRelative(result.scannedAt)}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={copySummary}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.08] hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <p className="border-t border-white/[0.06] pt-4 text-[11px] leading-5 text-slate-500">
                  Automated analysis can be wrong. Treat this as decision support, especially for
                  sophisticated or targeted messages.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* --------------------------- signal breakdown --------------------------- */}
      {result && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1729]/70 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Explainable detection
              </p>
              <h2 className="mt-1 text-sm font-bold text-slate-100">Signal breakdown</h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${verdictMeta?.soft ?? ''} ${verdictMeta?.text ?? ''}`}
            >
              {detectedSignals.length} of {result.signals.length} signals detected
            </span>
          </div>

          {result.signals.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">
              No individual signals were returned for this message.
            </p>
          ) : (
            <div className="grid gap-3 p-5 sm:p-6 md:grid-cols-2">
              {result.signals.map(signal => (
                <div
                  key={signal.id}
                  className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors ${
                    signal.detected
                      ? 'border-amber-400/20 bg-amber-400/[0.05]'
                      : 'border-white/[0.06] bg-white/[0.02]'
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        signal.detected ? 'text-amber-200' : 'text-slate-400'
                      }`}
                    >
                      {signal.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{signal.detail}</p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      signal.detected
                        ? 'bg-amber-400/10 text-amber-300'
                        : 'bg-white/[0.05] text-slate-500'
                    }`}
                  >
                    {signal.detected ? 'Detected' : 'Clear'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ------------------------------- history ------------------------------- */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F1729]/70 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-slate-400">
              <History className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Recent activity
              </p>
              <h2 className="mt-0.5 text-sm font-bold text-slate-100">Email scan history</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-1">
              {(['all', 'spam', 'suspicious', 'legitimate'] as const).map(key => {
                const active = historyFilter === key;
                const label = key === 'all' ? 'All' : VERDICT_META[key].label;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setHistoryFilter(key)}
                    aria-pressed={active}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 ${
                      active
                        ? 'bg-white/[0.09] text-slate-100'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {label}
                    <span className="ml-1 tabular-nums font-normal text-slate-600">
                      {historyCounts[key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="m-5 rounded-xl border border-dashed border-white/[0.08] px-6 py-10 text-center text-sm text-slate-500 sm:m-6">
            {logs.length === 0
              ? 'No emails have been analyzed yet.'
              : 'No scans match the selected filter.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <caption className="sr-only">Previously analyzed emails</caption>
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-5 py-3 font-semibold sm:px-6">
                    Subject
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Sender
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Verdict
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Score
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold sm:px-6">
                    Analyzed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredLogs.map(log => {
                  const meta = VERDICT_META[log.verdict];
                  return (
                    <tr key={log.id} className="transition-colors hover:bg-white/[0.02]">
                      <td
                        className="max-w-[16rem] truncate px-5 py-3 font-medium text-slate-200 sm:px-6"
                        title={log.subject || 'No subject'}
                      >
                        {log.subject?.trim() || (
                          <span className="italic text-slate-500">No subject</span>
                        )}
                      </td>

                      <td
                        className="max-w-[14rem] truncate px-3 py-3 text-slate-400"
                        title={log.sender || 'Unknown sender'}
                      >
                        {log.sender?.trim() || (
                          <span className="italic text-slate-600">Unknown sender</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.soft} ${meta.text}`}
                        >
                          <meta.Icon className="h-3 w-3" aria-hidden />
                          {meta.label}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-12 tabular-nums text-slate-300">{log.score}/100</span>
                          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-black/30 sm:block">
                            <span
                              className={`block h-full rounded-full ${meta.bar}`}
                              style={{ width: `${Math.max(4, log.score)}%` }}
                            />
                          </span>
                        </div>
                      </td>

                      <td
                        className="whitespace-nowrap px-5 py-3 text-xs text-slate-500 sm:px-6"
                        title={formatFull(log.scannedAt)}
                      >
                        {formatRelative(log.scannedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}