import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Activity,
  AtSign,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Copy,
  Crosshair,
  ExternalLink,
  Eye,
  FileWarning,
  Fingerprint,
  Globe,
  Hash,
  KeyRound,
  Link2,
  Lock,
  Network,
  Radar,
  RefreshCw,
  Scan,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Target,
  Terminal,
  Trash2,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { clearDetectorHistory, getDetectorHistory, PhishingScanResult, scanPhishingUrl } from '../../services/api';

/* ─────────────────────────────────────────────────────────────
   FONT STACK
   ───────────────────────────────────────────────────────────── */
const FONT_SANS = "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

/* ─────────────────────────────────────────────────────────────
   SHARED STYLE STRINGS
   ───────────────────────────────────────────────────────────── */
const BTN =
  'inline-flex h-9 items-center justify-center gap-2 border border-white/[0.08] bg-[#0b1424] px-3.5 text-xs font-medium text-slate-300 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_PRIMARY =
  'inline-flex h-10 items-center justify-center gap-2 border border-cyan-500/40 bg-cyan-500/[0.08] px-5 text-xs font-medium text-cyan-400 transition hover:border-cyan-400 hover:bg-cyan-500/[0.14] hover:text-cyan-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const FIELD =
  'w-full border border-white/[0.08] bg-[#07101e] px-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16] disabled:opacity-50';

/* ─────────────────────────────────────────────────────────────
   TONE MAPS
   ───────────────────────────────────────────────────────────── */
const riskStyles: Record<PhishingScanResult['risk_level'], string> = {
  critical: 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400',
  high: 'border-orange-500/40 bg-orange-500/[0.08] text-orange-400',
  low: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400',
  minimal: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400',
};

const verdictStyles: Record<PhishingScanResult['prediction'], string> = {
  phishing: 'text-rose-400',
  suspicious: 'text-amber-400',
  legitimate: 'text-emerald-400',
};

const verdictBorder: Record<PhishingScanResult['prediction'], string> = {
  phishing: 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400',
  suspicious: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400',
  legitimate: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400',
};

const verdictLabels: Record<PhishingScanResult['prediction'], string> = {
  phishing: 'Phishing',
  suspicious: 'Suspicious',
  legitimate: 'Legitimate',
};

const verdictStroke: Record<PhishingScanResult['prediction'], string> = {
  phishing: '#f43f5e',
  suspicious: '#f59e0b',
  legitimate: '#10b981',
};

/* ─────────────────────────────────────────────────────────────
   SCAN PHASES
   ───────────────────────────────────────────────────────────── */
const SCAN_PHASES = [
  'Normalizing URL syntax',
  'Extracting host and path components',
  'Checking brand impersonation patterns',
  'Scoring lexical and structural signals',
  'Computing phishing probability',
];

/* ─────────────────────────────────────────────────────────────
   UTILITIES
   ───────────────────────────────────────────────────────────── */
function normalizeUrl(value: string) {
  return /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`;
}

function formatRisk(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/* Parse a URL into its component parts for the anatomy view */
type ParsedUrl = {
  scheme: string;
  subdomain: string;
  domain: string;
  tld: string;
  port: string;
  path: string;
  query: string;
  fragment: string;
};

function parseUrl(raw: string): ParsedUrl | null {
  try {
    const url = new URL(raw);
    const hostParts = url.hostname.split('.');
    const tld = hostParts.length > 1 ? hostParts[hostParts.length - 1] : '';
    const domain = hostParts.length > 1 ? hostParts[hostParts.length - 2] : url.hostname;
    const subdomain = hostParts.length > 2 ? hostParts.slice(0, -2).join('.') : '';
    return {
      scheme: url.protocol.replace(':', ''),
      subdomain,
      domain,
      tld,
      port: url.port,
      path: url.pathname === '/' ? '' : url.pathname,
      query: url.search,
      fragment: url.hash,
    };
  } catch {
    return null;
  }
}

/* ═════════════════════════════════════════════════════════════
   PRIMITIVES
   ═════════════════════════════════════════════════════════════ */
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

/* ═════════════════════════════════════════════════════════════
   RISK GAUGE
   ═════════════════════════════════════════════════════════════ */
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
        <span className="font-mono text-2xl font-semibold leading-none text-slate-100">{score}%</span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-slate-500">
          phishing
        </span>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SCAN ANIMATION — staged progress display
   ═════════════════════════════════════════════════════════════ */
function ScanAnimation({ url }: { url: string }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhase(current => (current + 1) % SCAN_PHASES.length);
    }, 900);
    return () => window.clearInterval(timer);
  }, []);

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
              <Link2 className="h-6 w-6 text-cyan-400" />
            </div>
          </div>

          <p className="mt-6 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400">
            Analysing URL
          </p>
          <h2
            className="mt-2 max-w-lg truncate text-center font-mono text-base font-semibold text-slate-100"
            title={url}
          >
            {url}
          </h2>
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
            The detector analyzes URL structure only — it never fetches the address
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* ═════════════════════════════════════════════════════════════
   URL ANATOMY — visual breakdown of the URL components
   ═════════════════════════════════════════════════════════════ */
function UrlAnatomy({ url }: { url: string }) {
  const parts = useMemo(() => parseUrl(url), [url]);

  if (!parts) {
    return (
      <Panel className="px-6 py-8 text-center">
        <CircleAlert className="mx-auto h-5 w-5 text-amber-400" />
        <p className="mt-2 text-xs text-slate-400">Could not parse this URL into components.</p>
      </Panel>
    );
  }

  const segments: Array<{
    label: string;
    value: string;
    icon: typeof Globe;
    note: string;
    highlight?: 'cyan' | 'amber' | 'rose' | 'slate';
  }> = [];

  segments.push({
    label: 'Scheme',
    value: parts.scheme || '—',
    icon: Lock,
    note: parts.scheme === 'https' ? 'Encrypted transport' : 'Unencrypted transport',
    highlight: parts.scheme === 'https' ? 'cyan' : 'amber',
  });

  if (parts.subdomain) {
    segments.push({
      label: 'Subdomain',
      value: parts.subdomain,
      icon: Network,
      note: 'Nested host label — verify the parent domain before trusting',
      highlight: parts.subdomain.split('.').length > 2 ? 'rose' : 'slate',
    });
  }

  segments.push({
    label: 'Domain',
    value: parts.domain,
    icon: Globe,
    note: 'Registered hostname — check for typos and homoglyphs',
    highlight: 'cyan',
  });

  segments.push({
    label: 'Top-level domain',
    value: `.${parts.tld || '—'}`,
    icon: Globe,
    note: 'Public suffix — some TLDs are abused more heavily',
    highlight: ['tk', 'ml', 'ga', 'cf', 'gq', 'zip', 'mov'].includes(parts.tld) ? 'amber' : 'slate',
  });

  if (parts.port) {
    segments.push({
      label: 'Port',
      value: parts.port,
      icon: Network,
      note: 'Non-standard port for the scheme',
      highlight: 'amber',
    });
  }

  if (parts.path) {
    segments.push({
      label: 'Path',
      value: parts.path,
      icon: Terminal,
      note: 'Resource path on the host',
      highlight: 'slate',
    });
  }

  if (parts.query) {
    segments.push({
      label: 'Query string',
      value: parts.query,
      icon: Hash,
      note: 'Parameters passed to the destination — check for encoded redirects',
      highlight: 'slate',
    });
  }

  if (parts.fragment) {
    segments.push({
      label: 'Fragment',
      value: parts.fragment,
      icon: Hash,
      note: 'Client-side anchor — sometimes abused to hide payload text',
      highlight: 'slate',
    });
  }

  const toneMap = {
    cyan: 'border-cyan-500/40 bg-cyan-500/[0.06] text-cyan-400',
    amber: 'border-amber-500/40 bg-amber-500/[0.06] text-amber-400',
    rose: 'border-rose-500/40 bg-rose-500/[0.06] text-rose-400',
    slate: 'border-white/[0.08] bg-white/[0.02] text-slate-400',
  };

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        kicker="URL anatomy"
        kickerTone="cyan"
        title="Structural breakdown"
        hint="How the detector splits the URL into components before scoring."
        right={<Fingerprint className="h-4 w-4 text-slate-500" />}
      />

      {/* Segmented bar */}
      <div className="overflow-x-auto border-b border-white/[0.08] bg-[#07101e] px-5 py-4">
        <div className="flex items-center gap-1 whitespace-nowrap font-mono text-[11px]">
          <span className="text-slate-500">{parts.scheme}://</span>
          {parts.subdomain && (
            <>
              <span className="border-b-2 border-rose-500/60 text-slate-300">
                {parts.subdomain}
              </span>
              <span className="text-slate-500">.</span>
            </>
          )}
          <span className="border-b-2 border-cyan-500/60 font-semibold text-cyan-300">
            {parts.domain}
          </span>
          <span className="text-slate-500">.{parts.tld}</span>
          {parts.port && <span className="text-slate-400">:{parts.port}</span>}
          {parts.path && <span className="text-slate-400">{parts.path}</span>}
          {parts.query && <span className="text-amber-300">{parts.query}</span>}
          {parts.fragment && <span className="text-slate-500">{parts.fragment}</span>}
        </div>
      </div>

      {/* Component cards */}
      <ul className="divide-y divide-white/[0.05]">
        {segments.map(segment => {
          const Icon = segment.icon;
          const tone = toneMap[segment.highlight ?? 'slate'];
          return (
            <li
              key={segment.label}
              className="grid gap-2 px-5 py-3 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4"
            >
              <div className="flex items-center gap-2.5">
                <span className={`grid h-6 w-6 shrink-0 place-items-center border ${tone}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  {segment.label}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] text-slate-200" title={segment.value}>
                  {segment.value}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">{segment.note}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ═════════════════════════════════════════════════════════════
   TARGET SURFACE — educational panel: what phishing URLs target
   ═════════════════════════════════════════════════════════════ */
function TargetSurface({ prediction }: { prediction: PhishingScanResult['prediction'] }) {
  const targets = [
    {
      icon: KeyRound,
      label: 'Credential harvesting',
      detail:
        'Fake login forms collect usernames, passwords, and MFA codes submitted by the user.',
      vectors: [
        'Email and workspace credentials (Microsoft 365, Google Workspace)',
        'Corporate SSO, VPN, and remote-access portals',
        'Banking and financial institution logins',
        'Cryptocurrency exchange and wallet accounts',
      ],
    },
    {
      icon: Fingerprint,
      label: 'Session and token theft',
      detail:
        'Cookies and active session tokens captured by the page let attackers bypass passwords entirely.',
      vectors: [
        'Authentication cookies for already-signed-in users',
        'OAuth / SSO bearer tokens',
        'Session IDs from cloud storage and SaaS platforms',
        'Persistent refresh tokens with long expiry',
      ],
    },
    {
      icon: Network,
      label: 'Redirect chains and cloaking',
      detail:
        'URLs forward through attacker-controlled infrastructure to hide the final destination from scanners.',
      vectors: [
        'Open redirects on trusted domains abused as launch pads',
        'URL shorteners and tracking links masking the target',
        'Geo- or device-based conditional redirects',
        'JavaScript-based meta refresh chains',
      ],
    },
    {
      icon: FileWarning,
      label: 'Payload delivery',
      detail:
        'Some phishing URLs lead directly to a second stage that downloads an executable or script.',
      vectors: [
        'Macro-enabled Office documents',
        'ZIP and ISO containers with bundled payloads',
        'Signed-but-tampered installers',
        'Browser-based exploit kits and fake update pages',
      ],
    },
    {
      icon: UserCheck,
      label: 'Brand impersonation',
      detail:
        'Typosquatting, homoglyphs, and subdomain tricks make the URL look like a trusted brand.',
      vectors: [
        'Character substitution (rn → m, l → 1, 0 → O)',
        'Trusted brand name in subdomain (paypal.com.evil.tld)',
        'Hyphenated domains (secure-login-bank.com)',
        'IDN / punycode domains that render as Latin text',
      ],
    },
  ];

  const relevance =
    prediction === 'phishing'
      ? 'High — treat every vector below as active until the URL is verified.'
      : prediction === 'suspicious'
        ? 'Moderate — some vectors may not apply, but treat the URL with caution.'
        : 'Low — no strong phishing indicators were detected, but stay alert to unexpected URLs.';

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        kicker="Target surface analysis"
        kickerTone="rose"
        title="Where phishing URLs typically cause harm"
        hint={`Relevance for this verdict — ${relevance}`}
        right={<Crosshair className="h-4 w-4 text-slate-500" />}
      />

      <div className="divide-y divide-white/[0.05]">
        {targets.map(entry => {
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
          target categories for phishing URLs in general. The verdict above is based on the specific
          signals extracted from this URL — do not treat this panel as confirmation that any vector
          is active.
        </p>
      </div>
    </Panel>
  );
}

/* ═════════════════════════════════════════════════════════════
   SIGNALS PANEL
   ═════════════════════════════════════════════════════════════ */
function SignalsPanel({ signals }: { signals: PhishingScanResult['signals'] }) {
  const flagged = signals.filter(signal => signal.flagged);
  const clear = signals.filter(signal => !signal.flagged);

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        kicker="Detection signals"
        kickerTone="violet"
        title="What the model looked at"
        hint="Each signal is a lexical or structural property of the URL. Flagged signals contribute to the phishing probability."
        right={
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              {flagged.length} flagged
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              {clear.length} clear
            </span>
          </div>
        }
      />

      {flagged.length > 0 && (
        <div className="border-b border-white/[0.08]">
          <div className="bg-rose-500/[0.03] px-5 py-2">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-rose-400">
              Flagged signals
            </p>
          </div>
          <ul className="divide-y divide-white/[0.05]">
            {flagged.map(signal => (
              <li key={signal.label} className="grid gap-2 px-5 py-3 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200">{signal.label}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Observed value
                  </p>
                </div>
                <span className="break-all border border-rose-500/40 bg-rose-500/[0.08] px-2 py-1 font-mono text-[11px] text-rose-300 sm:justify-self-end">
                  {String(signal.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {clear.length > 0 && (
        <div>
          <div className="bg-white/[0.015] px-5 py-2">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Clear signals
            </p>
          </div>
          <ul className="grid gap-px bg-white/[0.06] sm:grid-cols-2">
            {clear.map(signal => (
              <li
                key={signal.label}
                className="flex items-center justify-between gap-3 bg-[#0b1424] px-5 py-2.5"
              >
                <span className="truncate text-[11px] text-slate-400">{signal.label}</span>
                <span className="shrink-0 border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Clear
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
        <span>{signals.length} signals evaluated</span>
        <span>URL structure only · no page fetch</span>
      </div>
    </Panel>
  );
}

/* ═════════════════════════════════════════════════════════════
   PHISHING PAGE
   ═════════════════════════════════════════════════════════════ */
interface ScanLog extends PhishingScanResult {
  id: string;
  scannedAt: string;
}

export function PhishingPage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<PhishingScanResult | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningUrl, setScanningUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getDetectorHistory<ScanLog>('phishing').then(setLogs).catch(() => setError('Unable to load scan history from MySQL.'));
  }, []);

  const runScan = useCallback(
    async (rawUrl: string) => {
      const normalizedUrl = normalizeUrl(rawUrl.trim());
      if (!rawUrl.trim()) {
        setError('Enter a URL to scan.');
        return;
      }
      if (normalizedUrl.length > 2048) {
        setError('URL must be 2048 characters or fewer.');
        return;
      }

      setIsScanning(true);
      setScanningUrl(normalizedUrl);
      setError(null);
      setResult(null);

      try {
        const scan = await scanPhishingUrl(normalizedUrl);
        setResult(scan);
        setLogs(await getDetectorHistory<ScanLog>('phishing'));
        window.dispatchEvent(new Event('cyber:scan-history-updated'));

        if (scan.prediction === 'phishing') {
          toast.error('Phishing indicators detected.');
        } else if (scan.prediction === 'suspicious') {
          toast.warning('Suspicious URL indicators detected.');
        } else {
          toast.success('No phishing pattern detected.');
        }
      } catch (scanError) {
        const message =
          scanError instanceof Error ? scanError.message : 'Unable to reach the phishing detector.';
        setError(message);
        toast.error('Phishing scan failed.');
      } finally {
        setIsScanning(false);
        setScanningUrl('');
      }
    },
    []
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await runScan(url);
  };

  const clearLogs = async () => {
    await clearDetectorHistory('phishing');
    window.dispatchEvent(new Event('cyber:scan-history-updated'));
    setLogs([]);
  };

  const flaggedCount = result ? result.signals.filter(s => s.flagged).length : 0;

  return (
    <div
      style={{ fontFamily: FONT_SANS }}
      className="relative mx-auto w-full min-w-0 max-w-[1200px] space-y-5 pb-10 text-slate-200"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center border border-white/[0.08] bg-[#0b1424]">
            <Link2 className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              URL analysis
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Phishing Detection
            </h1>
            <p className="mt-1 hidden max-w-xl text-xs leading-relaxed text-slate-500 sm:block">
              Analyse a URL without visiting it — inspect the lexical and structural signals behind
              the verdict.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden border-l border-white/[0.08] pl-4 sm:block">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              URLs scanned
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-100">{logs.length}</p>
          </div>
        </div>
      </header>

      {/* ═══════════════ SCANNING ═══════════════ */}
      {isScanning && <ScanAnimation url={scanningUrl} />}

      {/* ═══════════════ INPUT ZONE ═══════════════ */}
      {!isScanning && !result && (
        <Panel>
          <div className="px-5 py-10 sm:px-8 sm:py-14">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center border border-cyan-500/40 bg-cyan-500/[0.06]">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
              </div>
              <h2 className="mt-5 text-base font-semibold text-slate-100">
                Analyse a suspicious URL
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
                Paste any link to inspect its structure and receive a phishing risk assessment. The
                detector never fetches or opens the address.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-2xl">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">URL to scan</span>
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    value={url}
                    onChange={event => {
                      setUrl(event.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="example.com/login"
                    className={`${FIELD} h-11 pl-9 font-mono`}
                    aria-label="URL to scan"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
                <button type="submit" disabled={isScanning || !url.trim()} className={`${BTN_PRIMARY} h-11`}>
                  <Scan className="h-3.5 w-3.5" />
                  Scan URL
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3 w-3" /> Never fetched
                </span>
                <span className="h-3 w-px bg-white/[0.08]" />
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Structure only
                </span>
                <span className="h-3 w-px bg-white/[0.08]" />
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Lexical + ML signals
                </span>
              </div>
            </form>
          </div>
        </Panel>
      )}

      {/* ═══════════════ ERROR ═══════════════ */}
      {error && (
        <div className="flex items-start gap-3 border-l-2 border-rose-500 bg-rose-500/[0.04] px-4 py-3.5">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-rose-400">
              Scan error
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{error}</p>
          </div>
        </div>
      )}

      {/* ═══════════════ RESULT ═══════════════ */}
      {result && !isScanning && (
        <>
          {/* Verdict hero */}
          <Panel className="overflow-hidden">
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-6">
              <RiskGauge
                score={Math.round(result.phishing_probability * 100)}
                tone={verdictStroke[result.prediction]}
              />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${verdictBorder[result.prediction]}`}
                  >
                    {result.prediction === 'legitimate' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {verdictLabels[result.prediction]}
                  </span>
                  <span
                    className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${riskStyles[result.risk_level]}`}
                  >
                    {formatRisk(result.risk_level)} risk
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                </div>

                <h2
                  className="mt-2.5 break-all font-mono text-sm font-semibold leading-6 text-slate-100"
                  title={result.url}
                >
                  {result.url}
                </h2>
                <p className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                  <Shield className="h-3 w-3" />
                  Model: <span className="font-mono text-slate-300">{result.model}</span>
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                    setUrl('');
                  }}
                  className={BTN}
                >
                  <X className="h-3.5 w-3.5" />
                  New scan
                </button>
              </div>
            </div>

            {/* Quick facts */}
            <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.08] border-t border-white/[0.08] sm:grid-cols-4 sm:divide-y-0">
              {[
                {
                  label: 'Phishing probability',
                  value: `${Math.round(result.phishing_probability * 100)}%`,
                  icon: Target,
                },
                {
                  label: 'Model confidence',
                  value: `${Math.round(result.confidence * 100)}%`,
                  icon: Activity,
                },
                {
                  label: 'Signals flagged',
                  value: `${flaggedCount} / ${result.signals.length}`,
                  icon: ShieldAlert,
                },
                {
                  label: 'Risk level',
                  value: formatRisk(result.risk_level),
                  icon: Radar,
                },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="min-w-0 px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-slate-600" />
                      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        {item.label}
                      </p>
                    </div>
                    <p className="mt-1.5 truncate font-mono text-xs font-medium text-slate-200">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* URL anatomy */}
          <UrlAnatomy url={result.url} />

          {/* Signals */}
          <SignalsPanel signals={result.signals} />

          {/* Target surface */}
          <TargetSurface prediction={result.prediction} />
        </>
      )}

      {/* ═══════════════ SCAN LOGS ═══════════════ */}
      <Panel className="overflow-hidden">
        <PanelHeader
          kicker="Recent activity"
          kickerTone="slate"
          title="Scan logs"
          hint="Your last 25 URL scans on this device. Stored locally in the browser."
          right={
            logs.length > 0 ? (
              <button
                type="button"
                onClick={clearLogs}
                className={`${BTN} hover:border-rose-500/40 hover:bg-rose-500/[0.06] hover:text-rose-400`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear logs
              </button>
            ) : undefined
          }
        />

        {logs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Link2 className="mx-auto h-6 w-6 text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-300">No URLs scanned yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              Submit a URL above to populate the scan history with its verdict, risk level, and
              timestamp.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col />
                  <col className="w-[140px]" />
                  <col className="w-[120px]" />
                  <col className="w-[110px]" />
                  <col className="w-[180px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.015] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-5 py-2.5 font-medium">URL</th>
                    <th className="px-4 py-2.5 font-medium">Verdict</th>
                    <th className="px-4 py-2.5 font-medium">Risk</th>
                    <th className="px-4 py-2.5 font-medium">Probability</th>
                    <th className="px-5 py-2.5 font-medium">Scanned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {logs.map(log => (
                    <tr key={log.id} className="transition hover:bg-white/[0.025]">
                      <td className="px-5 py-3">
                        <p
                          className="truncate font-mono text-[11px] text-slate-200"
                          title={log.url}
                        >
                          {log.url}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-[11px] font-medium ${verdictStyles[log.prediction]}`}
                        >
                          {verdictLabels[log.prediction]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                        {formatRisk(log.risk_level)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                        {Math.round(log.phishing_probability * 100)}%
                      </td>
                      <td className="px-5 py-3 font-mono text-[10px] text-slate-500">
                        {new Date(log.scannedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-white/[0.06] md:hidden">
              {logs.map(log => (
                <div key={log.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className="min-w-0 truncate font-mono text-[11px] text-slate-200"
                      title={log.url}
                    >
                      {log.url}
                    </p>
                    <span
                      className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${verdictBorder[log.prediction]}`}
                    >
                      {Math.round(log.phishing_probability * 100)}%
                    </span>
                  </div>
                  <p className={`mt-1 font-mono text-[10px] ${verdictStyles[log.prediction]}`}>
                    {verdictLabels[log.prediction]} · {formatRisk(log.risk_level)} risk
                  </p>
                  <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-600">
                    {new Date(log.scannedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
              <span>
                {logs.length} record{logs.length === 1 ? '' : 's'}
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
          A "Legitimate" verdict means no phishing pattern was detected in the URL's structure — it
          is not a guarantee the destination is safe. Malicious sites can use clean URLs and rely on
          compromised servers or compromised certificates. Never enter credentials on a page reached
          through an unexpected link.
        </p>
      </aside>
    </div>
  );
}

export default PhishingPage;
