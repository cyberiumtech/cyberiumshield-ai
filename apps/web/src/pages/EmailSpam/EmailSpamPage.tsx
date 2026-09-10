import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Activity,
  AtSign,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  Copy,
  Crosshair,
  Eye,
  FileWarning,
  Fingerprint,
  History,
  KeyRound,
  Layers,
  Link2,
  Loader2,
  MailSearch,
  Paperclip,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { clearDetectorHistory, getDetectorHistory, scanEmailSpam } from '../../services/api';
import type { EmailSpamAnalysis } from '../../services/api';

/* ------------------------------------------------------------------ */
/* Typography — matches the rest of the redesign                       */
/* ------------------------------------------------------------------ */
export const FONT_SANS =
  "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
export const FONT_MONO =
  "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

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
  stroke: string;
  bar: string;
  Icon: LucideIcon;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
const MAX_LOGS = 25;
const MAX_CONTENT_LENGTH = 100_000;
const MAX_FIELD_LENGTH = 320;
const VERDICT_KEYS = ['spam', 'suspicious', 'legitimate'] as const;

const SCAN_PHASES = [
  'Parsing message headers',
  'Checking sender alignment (SPF / DKIM / DMARC)',
  'Extracting embedded links',
  'Scanning lexical spam indicators',
  'Scoring message and generating verdict',
];

const VERDICT_META: Record<Verdict, VerdictMeta> = {
  spam: {
    label: 'Likely spam',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    soft: 'bg-rose-500/[0.08]',
    stroke: '#f43f5e',
    bar: 'bg-rose-500',
    Icon: AlertTriangle,
  },
  suspicious: {
    label: 'Suspicious',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    soft: 'bg-amber-500/[0.08]',
    stroke: '#f59e0b',
    bar: 'bg-amber-500',
    Icon: CircleAlert,
  },
  legitimate: {
    label: 'Likely legitimate',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    soft: 'bg-emerald-500/[0.08]',
    stroke: '#10b981',
    bar: 'bg-emerald-500',
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
/* Shared style strings                                                */
/* ------------------------------------------------------------------ */
const BTN =
  'inline-flex h-9 items-center justify-center gap-2 border border-white/[0.08] bg-[#0b1424] px-3.5 text-xs font-medium text-slate-300 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_PRIMARY =
  'inline-flex h-10 items-center justify-center gap-2 border border-cyan-500/40 bg-cyan-500/[0.08] px-5 text-xs font-medium text-cyan-400 transition hover:border-cyan-400 hover:bg-cyan-500/[0.14] hover:text-cyan-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const FIELD =
  'w-full border border-white/[0.08] bg-[#07101e] px-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 hover:border-white/[0.12] focus:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-60';

const INPUT = `${FIELD} h-9`;
const TEXTAREA = `${FIELD} py-2.5 leading-6 resize-y`;

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

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
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
        <p className={`font-mono text-[10px] font-medium uppercase tracking-[0.18em] ${tone}`}>
          {kicker}
        </p>
        <h2 className="mt-1 text-[15px] font-semibold text-slate-100">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Risk Gauge — flat SVG ring                                          */
/* ------------------------------------------------------------------ */
function RiskGauge({ score, tone }: { score: number; tone: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} className="fill-none stroke-white/[0.06]" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="relative flex flex-col items-center">
        <span className="font-mono text-2xl font-semibold leading-none text-slate-100">{score}</span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-slate-500">
          risk / 100
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scan animation — staged progress                                    */
/* ------------------------------------------------------------------ */
function ScanAnimation({ subject, sender }: { subject: string; sender: string }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhase(current => (current + 1) % SCAN_PHASES.length);
    }, 900);
    return () => window.clearInterval(timer);
  }, []);

  const label = subject.trim() || sender.trim() || 'Untitled message';

  return (
    <Panel className="overflow-hidden">
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col items-center">
          <div className="relative grid h-24 w-24 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full border border-cyan-500/30" />
            <span
              className="absolute inset-2 rounded-full border border-cyan-500/20"
              style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite', animationDelay: '0.5s' }}
            />
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                className="fill-none stroke-cyan-500/40"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="70 220"
                style={{ animation: 'spin 1.5s linear infinite', transformOrigin: '50% 50%' }}
              />
            </svg>
            <div className="relative grid h-16 w-16 place-items-center border border-cyan-500/40 bg-cyan-500/[0.06]">
              <MailSearch className="h-6 w-6 text-cyan-400" />
            </div>
          </div>

          <p className="mt-6 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400">
            Analysing message
          </p>
          <h2
            className="mt-2 max-w-lg truncate text-center text-sm font-semibold text-slate-100"
            title={label}
          >
            {label}
          </h2>
          {sender.trim() && (
            <p className="mt-1 max-w-lg truncate font-mono text-[11px] text-slate-500" title={sender}>
              {sender}
            </p>
          )}
        </div>

        <ol className="mx-auto mt-8 max-w-lg space-y-1.5">
          {SCAN_PHASES.map((item, index) => {
            const isDone = index < phase;
            const isActive = index === phase;
            return (
              <li
                key={item}
                className={`flex items-center gap-3 px-3 py-2 transition ${
                  isActive ? 'bg-cyan-500/[0.06]' : ''
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center border ${
                    isDone
                      ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400'
                      : isActive
                        ? 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-400'
                        : 'border-white/[0.08] bg-[#07101e] text-slate-600'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3 w-3" />
                  ) : isActive ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                  )}
                </span>
                <span
                  className={`font-mono text-[11px] uppercase tracking-wider ${
                    isDone ? 'text-slate-500' : isActive ? 'text-cyan-300' : 'text-slate-600'
                  }`}
                >
                  {item}
                </span>
                {isDone && (
                  <span className="ml-auto font-mono text-[10px] text-emerald-500">done</span>
                )}
                {isActive && (
                  <span className="ml-auto font-mono text-[10px] text-cyan-400">running</span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mx-auto mt-6 max-w-lg">
          <div className="h-1 w-full overflow-hidden bg-white/[0.06]">
            <div
              className="h-full bg-cyan-500 transition-all duration-500"
              style={{ width: `${((phase + 1) / SCAN_PHASES.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-slate-500">
            The message is processed locally — nothing is stored by the detector
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Email threat surface — educational panel                            */
/* ------------------------------------------------------------------ */
function EmailThreatSurface({ verdict }: { verdict: Verdict }) {
  const categories = [
    {
      icon: KeyRound,
      label: 'Credential phishing',
      detail: 'Fake login pages or reply chains harvest passwords and MFA codes.',
      vectors: [
        'Microsoft 365, Google Workspace, and SSO portals',
        'Banking and payment platforms',
        'Corporate VPN and remote access portals',
        'Password reset and account-verification flows',
      ],
    },
    {
      icon: Paperclip,
      label: 'Malicious attachments',
      detail: 'Attachments can execute code or deliver second-stage payloads when opened.',
      vectors: [
        'Macro-enabled Office documents (.docm, .xlsm)',
        'Archive containers (.zip, .iso, .img) with bundled executables',
        'HTML smuggling and LNK shortcut files',
        'Fake invoice PDFs with embedded links',
      ],
    },
    {
      icon: Link2,
      label: 'Link redirects and tracking',
      detail: 'Embedded links route through attacker-controlled infrastructure to reach the payload.',
      vectors: [
        'Open redirects on trusted domains',
        'URL shorteners masking the final destination',
        'Unique per-recipient tracking links (spear-phishing)',
        'QR codes in the message body leading off-device',
      ],
    },
    {
      icon: UserCheck,
      label: 'Business email compromise (BEC)',
      detail: 'Impersonation of executives or vendors drives fraudulent payments or data release.',
      vectors: [
        'Invoice fraud with updated bank details',
        'CEO / CFO urgent payment requests',
        'Payroll diversion and tax-form requests',
        'Vendor account takeover and reply-chain hijacking',
      ],
    },
    {
      icon: FileWarning,
      label: 'Malware and ransomware delivery',
      detail: 'Some campaigns lead to infostealers, RATs, or ransomware deployment.',
      vectors: [
        'Infostealers harvesting credentials and cookies',
        'Remote access trojans (RATs) for lateral movement',
        'Ransomware loaders (QakBot, IcedID, Emotet-style)',
        'Loader chains with defence evasion and persistence',
      ],
    },
    {
      icon: Zap,
      label: 'Social engineering',
      detail: 'Pressure, urgency, and authority cues push the recipient past their normal caution.',
      vectors: [
        'Urgency language ("act now", "final notice")',
        'Threats of account suspension or legal action',
        'Authority impersonation (IT, HR, executive)',
        'Gift card, crypto, or wire-transfer pretexts',
      ],
    },
  ];

  const relevance =
    verdict === 'spam'
      ? 'High — treat every vector below as plausibly active for this message.'
      : verdict === 'suspicious'
        ? 'Moderate — some vectors may apply; verify the sender and links before acting.'
        : 'Low — no strong spam indicators, but stay alert to unusual requests.';

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        kicker="Threat surface analysis"
        kickerTone="rose"
        title="Where email-borne attacks typically land"
        hint={relevance}
        right={<Crosshair className="h-4 w-4 text-slate-500" />}
      />

      <div className="divide-y divide-white/[0.05]">
        {categories.map(entry => {
          const Icon = entry.icon;
          return (
            <article key={entry.label} className="px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
                <div className="flex min-w-0 items-start gap-3 lg:w-[280px] lg:shrink-0">
                  <span className="grid h-8 w-8 shrink-0 place-items-center border border-rose-500/40 bg-rose-500/[0.06] text-rose-400">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-slate-100">{entry.label}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      {entry.detail}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    Common exposure vectors
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {entry.vectors.map(vector => (
                      <li
                        key={vector}
                        className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-500" />
                        <span>{vector}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 border-t border-white/[0.08] bg-white/[0.015] px-5 py-3 text-[11px] leading-relaxed text-slate-500">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        <p>
          This section describes <strong className="font-medium text-slate-300">potential</strong>{' '}
          threat categories for email-borne attacks in general. The verdict above is based on the
          specific signals extracted from this message — do not treat this panel as confirmation
          that any vector is active.
        </p>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export function EmailSpamPage() {
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const [result, setResult] = useState<EmailSpamAnalysis | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | Verdict>('all');

  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const copyTimer = useRef<number | null>(null);

  /* ----------------------------- effects ---------------------------- */
  useEffect(() => {
    void getDetectorHistory<ScanLog>('email-spam', MAX_LOGS)
      .then(setLogs)
      .catch(() => setError('Unable to load scan history from MySQL.'));
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
  const clearSignals = useMemo(
    () => result?.signals.filter(signal => !signal.detected) ?? [],
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
  const refreshLogs = useCallback(async () => {
    setLogs(await getDetectorHistory<ScanLog>('email-spam', MAX_LOGS));
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
    setResult(null);

    try {
      const raw = await scanEmailSpam({
        sender: sender.trim().slice(0, MAX_FIELD_LENGTH),
        subject: trimmedSubject.slice(0, MAX_FIELD_LENGTH),
        content,
      });

      const analysis = normaliseAnalysis(raw);
      setResult(analysis);

      await refreshLogs();

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
  }, [content, isScanning, refreshLogs, sender, subject]);

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
      style={{ fontFamily: FONT_SANS }}
      className="relative mx-auto w-full min-w-0 max-w-[1400px] space-y-5 pb-10 text-slate-200"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center border border-white/[0.08] bg-[#0b1424]">
            <MailSearch className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Message intelligence
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Email Spam Detector
            </h1>
            <p className="mt-1 hidden max-w-xl text-xs leading-relaxed text-slate-500 sm:block">
              Inspect message language, embedded links, sender alignment, authentication headers,
              and attachment names — scored by the locally hosted detection model.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 hidden border-l border-white/[0.08] pl-4 sm:block">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Messages analysed
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-100">{logs.length}</p>
          </div>
          <button type="button" className={BTN} onClick={() => loadSample(SAFE_SAMPLE)}>
            <ShieldCheck className="h-3.5 w-3.5" />
            Safe sample
          </button>
          <button
            type="button"
            className={`${BTN} border-amber-500/40 bg-amber-500/[0.06] text-amber-400 hover:border-amber-400 hover:bg-amber-500/[0.12] hover:text-amber-300`}
            onClick={() => loadSample(SPAM_SAMPLE)}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Spam sample
          </button>
        </div>
      </header>

      {/* ═══════════════ MAIN GRID ═══════════════ */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        {/* ─── FORM ─── */}
        <Panel className="overflow-hidden">
          <PanelHeader
            kicker="Analyzer input"
            kickerTone="cyan"
            title="Analyze an email"
            hint="Raw headers are supported — paste them straight into the message field."
            right={<MailSearch className="h-4 w-4 text-slate-500" />}
          />

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 p-5" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  Sender <span className="font-sans normal-case tracking-normal text-slate-600">(optional)</span>
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
                  className={`${INPUT} font-mono`}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  Subject <span className="font-sans normal-case tracking-normal text-slate-600">(optional)</span>
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
                  className={INPUT}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  Message or raw email{' '}
                  <span className="font-sans normal-case tracking-normal text-slate-600">(required)</span>
                </span>
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    isOverLimit ? 'text-rose-400' : 'text-slate-600'
                  }`}
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
                rows={13}
                spellCheck={false}
                aria-invalid={isOverLimit}
                placeholder="Paste the email body here, or include raw headers such as From, Reply-To, Subject and Authentication-Results…"
                className={`${TEXTAREA} font-mono text-[11px]`}
                style={{ fontFamily: FONT_MONO }}
              />
            </label>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 border-l-2 border-rose-500 bg-rose-500/[0.04] px-3.5 py-3"
              >
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                <span className="text-xs leading-relaxed text-rose-300">{error}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                Processed locally
              </p>

              <div className="flex items-center gap-2">
                <button type="button" onClick={reset} disabled={isScanning} className={BTN}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>

                <button type="submit" disabled={isScanning} className={BTN_PRIMARY}>
                  {isScanning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {isScanning ? 'Analyzing…' : 'Analyze email'}
                </button>
              </div>
            </div>

            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
              Tip: press{' '}
              <kbd className="border border-white/[0.08] bg-[#07101e] px-1.5 py-0.5 text-[10px] text-slate-400">
                Ctrl
              </kbd>{' '}
              +{' '}
              <kbd className="border border-white/[0.08] bg-[#07101e] px-1.5 py-0.5 text-[10px] text-slate-400">
                Enter
              </kbd>{' '}
              to run the analysis
            </p>
          </form>
        </Panel>

        {/* ─── RESULT ─── */}
        {isScanning ? (
          <ScanAnimation subject={subject} sender={sender} />
        ) : result && verdictMeta ? (
          <Panel className={`overflow-hidden ${verdictMeta.border}`}>
            {/* Verdict hero */}
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <RiskGauge score={result.score} tone={verdictMeta.stroke} />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${verdictMeta.border} ${verdictMeta.soft} ${verdictMeta.text}`}
                  >
                    <verdictMeta.Icon className="h-3 w-3" />
                    {verdictMeta.label}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {result.confidence}% confidence
                  </span>
                </div>
                <h2 className="mt-2 truncate text-sm font-semibold text-slate-100" title={result.subject || undefined}>
                  {result.subject?.trim() || 'No subject'}
                </h2>
                <p className="mt-1 truncate font-mono text-[11px] text-slate-500" title={result.sender || undefined}>
                  {result.sender?.trim() || 'Unknown sender'}
                </p>
              </div>
            </div>

            {/* Quick facts */}
            <div className="grid grid-cols-3 divide-x divide-y divide-white/[0.08] border-t border-white/[0.08] sm:divide-y-0">
              {[
                { label: 'Confidence', value: `${result.confidence}%`, icon: Activity },
                { label: 'Links', value: String(result.linkCount), icon: Link2 },
                { label: 'Flags', value: String(detectedSignals.length), icon: ShieldAlert },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="min-w-0 px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-slate-600" />
                      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        {item.label}
                      </p>
                    </div>
                    <p className="mt-1.5 font-mono text-sm font-semibold text-slate-100">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Recommended actions */}
            <div className="border-t border-white/[0.08] px-5 py-4">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                What to do
              </p>
              <ul className="mt-2.5 space-y-2">
                {RECOMMENDED_ACTIONS[result.verdict].map(action => (
                  <li key={action} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                    <ChevronRight className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${verdictMeta.text}`} />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5">
              <span className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate" title={formatFull(result.scannedAt)}>
                  Analyzed {formatRelative(result.scannedAt)}
                </span>
              </span>
              <button
                type="button"
                onClick={copySummary}
                className={`${BTN} h-7 px-2.5 text-[10px]`}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </Panel>
        ) : (
          <Panel className="border-dashed bg-[#0b1424]/50">
            <div className="flex min-h-[22rem] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="grid h-14 w-14 place-items-center border border-white/[0.08] bg-[#07101e] text-slate-600">
                <MailSearch className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-sm font-medium text-slate-300">Your result will appear here</h2>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-500">
                The detector returns an explainable risk score, the signals it matched, and
                practical next steps.
              </p>
            </div>
          </Panel>
        )}
      </div>

      {/* ═══════════════ SIGNAL BREAKDOWN ═══════════════ */}
      {result && !isScanning && (
        <Panel className="overflow-hidden">
          <PanelHeader
            kicker="Explainable detection"
            kickerTone="violet"
            title="Signal breakdown"
            hint="Each signal is a lexical, structural, or authentication property of the message."
            right={
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {detectedSignals.length} detected
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                  {clearSignals.length} clear
                </span>
              </div>
            }
          />

          {result.signals.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Layers className="mx-auto h-5 w-5 text-slate-600" />
              <p className="mt-2 text-xs text-slate-500">No individual signals were returned for this message.</p>
            </div>
          ) : (
            <>
              {detectedSignals.length > 0 && (
                <div className="border-b border-white/[0.08]">
                  <div className="bg-amber-500/[0.03] px-5 py-2">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-amber-400">
                      Detected signals
                    </p>
                  </div>
                  <ul className="divide-y divide-white/[0.05]">
                    {detectedSignals.map(signal => (
                      <li key={signal.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-amber-300">{signal.label}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            {signal.detail}
                          </p>
                        </div>
                        <span className="shrink-0 border border-amber-500/40 bg-amber-500/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-amber-400 sm:justify-self-end">
                          Detected
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {clearSignals.length > 0 && (
                <div>
                  <div className="bg-white/[0.015] px-5 py-2">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Clear signals
                    </p>
                  </div>
                  <ul className="grid gap-px bg-white/[0.06] sm:grid-cols-2">
                    {clearSignals.map(signal => (
                      <li
                        key={signal.id}
                        className="flex items-center justify-between gap-3 bg-[#0b1424] px-5 py-2.5"
                      >
                        <span className="truncate text-[11px] text-slate-400" title={signal.label}>
                          {signal.label}
                        </span>
                        <span className="shrink-0 border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
                          Clear
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
            <span>{result.signals.length} signals evaluated</span>
            <span>Local analysis · no external queries</span>
          </div>
        </Panel>
      )}

      {/* ═══════════════ THREAT SURFACE ═══════════════ */}
      {result && !isScanning && <EmailThreatSurface verdict={result.verdict} />}

      {/* ═══════════════ HISTORY ═══════════════ */}
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Recent activity
            </p>
            <h2 className="mt-1 text-[15px] font-semibold text-slate-100">Email scan history</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Your last {MAX_LOGS} analyses on this device. Stored locally in the browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap border border-white/[0.08] bg-[#07101e]">
              {(['all', 'spam', 'suspicious', 'legitimate'] as const).map(key => {
                const active = historyFilter === key;
                const label = key === 'all' ? 'All' : VERDICT_META[key].label;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setHistoryFilter(key)}
                    aria-pressed={active}
                    className={`border-r border-white/[0.08] px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider transition last:border-r-0 focus:outline-none focus-visible:bg-white/[0.03] ${
                      active
                        ? 'bg-white/[0.06] text-slate-100'
                        : 'text-slate-500 hover:bg-white/[0.02] hover:text-slate-300'
                    }`}
                  >
                    {label}
                    <span className="ml-1.5 font-mono text-[9px] text-slate-600">
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
                className={`${BTN} h-7 px-2.5 text-[10px] hover:border-rose-500/40 hover:bg-rose-500/[0.06] hover:text-rose-400`}
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <History className="mx-auto h-5 w-5 text-slate-600" />
            <p className="mt-2 text-xs text-slate-500">
              {logs.length === 0
                ? 'No emails have been analyzed yet.'
                : 'No scans match the selected filter.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col />
                  <col className="w-[220px]" />
                  <col className="w-[160px]" />
                  <col className="w-[140px]" />
                  <col className="w-[140px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.015] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-5 py-2.5 font-medium">Subject</th>
                    <th className="px-4 py-2.5 font-medium">Sender</th>
                    <th className="px-4 py-2.5 font-medium">Verdict</th>
                    <th className="px-4 py-2.5 font-medium">Score</th>
                    <th className="px-5 py-2.5 font-medium">Analyzed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredLogs.map(log => {
                    const meta = VERDICT_META[log.verdict];
                    return (
                      <tr key={log.id} className="transition hover:bg-white/[0.025]">
                        <td className="px-5 py-3">
                          <p
                            className="truncate text-[12px] font-medium text-slate-200"
                            title={log.subject || 'No subject'}
                          >
                            {log.subject?.trim() || (
                              <span className="italic text-slate-500">No subject</span>
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p
                            className="truncate font-mono text-[11px] text-slate-400"
                            title={log.sender || 'Unknown sender'}
                          >
                            {log.sender?.trim() || (
                              <span className="italic text-slate-600">Unknown</span>
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${meta.border} ${meta.soft} ${meta.text}`}
                          >
                            <meta.Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-12 font-mono text-[11px] tabular-nums text-slate-300">
                              {log.score}/100
                            </span>
                            <span className="hidden h-1 w-16 overflow-hidden bg-white/[0.06] sm:block">
                              <span
                                className={`block h-full ${meta.bar}`}
                                style={{ width: `${Math.max(4, log.score)}%` }}
                              />
                            </span>
                          </div>
                        </td>
                        <td
                          className="px-5 py-3 font-mono text-[10px] text-slate-500"
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

            {/* Mobile cards */}
            <div className="divide-y divide-white/[0.06] md:hidden">
              {filteredLogs.map(log => {
                const meta = VERDICT_META[log.verdict];
                return (
                  <div key={log.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className="min-w-0 truncate text-xs font-medium text-slate-200"
                        title={log.subject || 'No subject'}
                      >
                        {log.subject?.trim() || (
                          <span className="italic text-slate-500">No subject</span>
                        )}
                      </p>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${meta.border} ${meta.soft} ${meta.text}`}
                      >
                        <meta.Icon className="h-3 w-3" />
                        {log.score}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-mono text-[10px] text-slate-500">
                      {log.sender?.trim() || 'Unknown sender'}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-wider text-slate-600">
                      <span className={meta.text}>{meta.label}</span>
                      <span>{formatRelative(log.scannedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
              <span>
                {filteredLogs.length} record{filteredLogs.length === 1 ? '' : 's'}
              </span>
              <span>Newest first</span>
            </div>
          </>
        )}
      </Panel>

      {/* ═══════════════ FOOTER NOTE ═══════════════ */}
      <aside className="flex items-start gap-2.5 border-t border-white/[0.08] pt-4 text-[11px] leading-relaxed text-slate-500">
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        <p>
          Automated analysis can be wrong. A "Likely legitimate" verdict means no strong spam
          indicators were detected — it is not a guarantee the message is safe. Treat this as
          decision support, especially for sophisticated or targeted messages.
        </p>
      </aside>
    </div>
  );
}

export default EmailSpamPage;
