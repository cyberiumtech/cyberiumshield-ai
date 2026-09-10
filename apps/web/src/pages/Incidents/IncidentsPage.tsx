import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FilterX,
  Flame,
  Heart,
  MessageSquareText,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  INCIDENT_CATEGORIES,
  addSolution,
  filterIncidents,
  getIncidents,
  getStorageNotice,
  loadIncidents,
  markSolutionHelpful,
  publishIncident,
  subscribeToIncidents,
  type CommunityIncident,
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStatus,
} from '../../services/incident-community.service';

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

const BTN_VIOLET =
  'inline-flex h-10 items-center justify-center gap-2 border border-violet-500/40 bg-violet-500/[0.08] px-4 text-xs font-medium text-violet-400 transition hover:border-violet-400 hover:bg-violet-500/[0.14] hover:text-violet-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-40';

const FIELD =
  'w-full border border-white/[0.08] bg-[#07101e] px-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 hover:border-white/[0.12] focus:border-white/[0.16] disabled:opacity-50';

const INPUT = `${FIELD} h-9`;
const TEXTAREA = `${FIELD} py-2.5 leading-relaxed resize-y`;
const LABEL = 'mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500';

/* ─────────────────────────────────────────────────────────────
   TONE MAPS
   ───────────────────────────────────────────────────────────── */
const severityTone: Record<IncidentSeverity, string> = {
  critical: 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400',
  high: 'border-orange-500/40 bg-orange-500/[0.08] text-orange-400',
  medium: 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400',
  low: 'border-slate-700 bg-slate-800/60 text-slate-400',
};

const statusTone: Record<IncidentStatus, { pill: string; dot: string; label: string }> = {
  investigating: {
    pill: 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400',
    dot: 'bg-rose-500',
    label: 'Investigating',
  },
  monitoring: {
    pill: 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-400',
    dot: 'bg-cyan-500',
    label: 'Monitoring',
  },
  resolved: {
    pill: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400',
    dot: 'bg-emerald-500',
    label: 'Resolved',
  },
};

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */
function formatDate(value: string, includeTime = false) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(
    undefined,
    includeTime
      ? { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  ).format(date);
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVES
   ───────────────────────────────────────────────────────────── */
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
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
  right?: ReactNode;
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

function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${severityTone[severity]}`}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const meta = statusTone[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${meta.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   PUBLISH DIALOG
   ───────────────────────────────────────────────────────────── */
interface PublishFormState {
  title: string;
  description: string;
  author: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: IncidentCategory;
  tags: string;
  affectedSystems: string;
}

const emptyPublishForm: PublishFormState = {
  title: '',
  description: '',
  author: '',
  severity: 'medium',
  status: 'investigating',
  category: 'Malware',
  tags: '',
  affectedSystems: '',
};

function PublishIncidentDialog({
  open,
  onClose,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  onPublished: (incident: CommunityIncident) => void;
}) {
  const [form, setForm] = useState<PublishFormState>(emptyPublishForm);
  const [error, setError] = useState('');
  const firstInput = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement;
    const timer = window.setTimeout(() => firstInput.current?.focus(), 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      returnFocus.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const tags = form.tags.split(',').map(value => value.trim()).filter(Boolean);
    const systems = form.affectedSystems.split(',').map(value => value.trim()).filter(Boolean);
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.author.trim() ||
      !tags.length ||
      !systems.length
    ) {
      setError('Complete every required field, including at least one tag and affected system.');
      return;
    }
    try {
      const incident = await publishIncident({ ...form, tags, affectedSystems: systems });
      setForm(emptyPublishForm);
      setError('');
      toast.success('Incident published to MySQL');
      onPublished(incident);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to publish this incident.');
    }
  };

  const update = <K extends keyof PublishFormState>(key: K, value: PublishFormState[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/80 px-3 py-5"
      role="presentation"
      onMouseDown={event => {
        if (event.currentTarget === event.target) onClose();
      }}
      style={{ fontFamily: FONT_SANS }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-incident-title"
        className="my-auto w-full max-w-3xl border border-white/[0.08] bg-[#0b1424]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-400">
              Community disclosure
            </p>
            <h2
              id="publish-incident-title"
              className="mt-1 text-lg font-semibold text-white"
            >
              Publish an incident
            </h2>
            <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-500">
              Share operational facts without credentials, personal data, or active exploit
              details. This post is saved in this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close publish incident dialog"
            className="grid h-8 w-8 shrink-0 place-items-center border border-white/[0.08] bg-[#0b1424] text-slate-400 transition hover:border-white/[0.16] hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <form
          onSubmit={submit}
          className="max-h-[calc(100vh-160px)] overflow-y-auto px-5 py-5 sm:px-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={LABEL}>
                Incident title <span className="text-rose-400">*</span>
              </span>
              <input
                ref={firstInput}
                value={form.title}
                onChange={event => update('title', event.target.value)}
                maxLength={140}
                placeholder="What happened and where?"
                className={INPUT}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className={LABEL}>
                Incident narrative <span className="text-rose-400">*</span>
              </span>
              <textarea
                value={form.description}
                onChange={event => update('description', event.target.value)}
                rows={5}
                maxLength={2400}
                placeholder="Describe discovery, impact, evidence, and containment already performed."
                className={TEXTAREA}
              />
            </label>

            <label className="block">
              <span className={LABEL}>
                Display name <span className="text-rose-400">*</span>
              </span>
              <input
                value={form.author}
                onChange={event => update('author', event.target.value)}
                maxLength={80}
                placeholder="Name or response team"
                className={INPUT}
              />
            </label>

            <label className="block">
              <span className={LABEL}>
                Category <span className="text-rose-400">*</span>
              </span>
              <select
                value={form.category}
                onChange={event => update('category', event.target.value as IncidentCategory)}
                className={`${INPUT} cursor-pointer appearance-none pr-8`}
              >
                {INCIDENT_CATEGORIES.map(category => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={LABEL}>
                Severity <span className="text-rose-400">*</span>
              </span>
              <select
                value={form.severity}
                onChange={event => update('severity', event.target.value as IncidentSeverity)}
                className={`${INPUT} cursor-pointer appearance-none pr-8`}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>

            <label className="block">
              <span className={LABEL}>
                Response status <span className="text-rose-400">*</span>
              </span>
              <select
                value={form.status}
                onChange={event => update('status', event.target.value as IncidentStatus)}
                className={`${INPUT} cursor-pointer appearance-none pr-8`}
              >
                <option value="investigating">Investigating</option>
                <option value="monitoring">Monitoring</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>

            <label className="block">
              <span className={LABEL}>
                Affected systems <span className="text-rose-400">*</span>
              </span>
              <input
                value={form.affectedSystems}
                onChange={event => update('affectedSystems', event.target.value)}
                placeholder="gateway-01, identity-provider"
                className={`${INPUT} font-mono`}
              />
              <span className="mt-1 block text-[10px] text-slate-500">
                Comma-separated, safe-to-disclose names.
              </span>
            </label>

            <label className="block">
              <span className={LABEL}>
                Tags <span className="text-rose-400">*</span>
              </span>
              <input
                value={form.tags}
                onChange={event => update('tags', event.target.value)}
                placeholder="oauth, credential-theft"
                className={`${INPUT} font-mono`}
              />
              <span className="mt-1 block text-[10px] text-slate-500">
                Comma-separated investigation topics.
              </span>
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 border-l-2 border-rose-500 bg-rose-500/[0.04] px-3 py-2 text-xs leading-relaxed text-rose-300"
            >
              {error}
            </p>
          )}

          <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={BTN}>
              Cancel
            </button>
            <button type="submit" className={BTN_PRIMARY}>
              <ShieldAlert className="h-3.5 w-3.5" />
              Publish disclosure
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FEED CARD
   ───────────────────────────────────────────────────────────── */
function IncidentFeedCard({
  incident,
  selected,
  onSelect,
}: {
  incident: CommunityIncident;
  selected: boolean;
  onSelect: () => void;
}) {
  const helpful = incident.solutions.reduce((sum, solution) => sum + solution.helpfulCount, 0);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group w-full px-5 py-4 text-left transition focus:outline-none focus-visible:bg-white/[0.03] ${
        selected ? 'bg-cyan-500/[0.04]' : 'hover:bg-white/[0.02]'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={incident.severity} />
        <StatusBadge status={incident.status} />
        <span className="ml-auto font-mono text-[10px] tracking-wider text-slate-500">
          {incident.id}
        </span>
      </div>

      <h3 className="mt-2.5 text-[13px] font-semibold leading-snug text-slate-100">
        {incident.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
        {incident.description}
      </p>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="font-mono uppercase tracking-wider text-cyan-500">
          {incident.category}
        </span>
        <span className="text-slate-500">{incident.author}</span>
        <span className="text-slate-600">{formatDate(incident.createdAt)}</span>
        {incident.demo && (
          <span className="border border-violet-500/40 bg-violet-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-violet-400">
            Demo
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-white/[0.06] pt-2.5 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText className="h-3 w-3 text-violet-400" />
          {incident.solutions.length} solutions
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Heart className="h-3 w-3 text-cyan-400" />
          {helpful} helpful
        </span>
        <ArrowRight
          className={`ml-auto h-3.5 w-3.5 transition ${
            selected ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-400'
          }`}
        />
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   INCIDENT DOSSIER
   ───────────────────────────────────────────────────────────── */
function IncidentDossier({ incident }: { incident: CommunityIncident }) {
  const [solutionAuthor, setSolutionAuthor] = useState('');
  const [solutionBody, setSolutionBody] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setSolutionBody('');
  }, [incident.id]);

  const submitSolution = async (event: FormEvent) => {
    event.preventDefault();
    if (!solutionAuthor.trim() || !solutionBody.trim()) {
      setError('Add your display name and a practical remediation before publishing.');
      return;
    }
    try {
      await addSolution(incident.id, { author: solutionAuthor, body: solutionBody });
      setSolutionBody('');
      setError('');
      toast.success('Solution published to this incident');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to publish the solution.');
    }
  };

  return (
    <Panel className="min-w-0 overflow-hidden xl:sticky xl:top-[92px]">
      {/* Header */}
      <div className="border-b border-white/[0.08] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
          <span className="ml-auto font-mono text-[10px] tracking-wider text-cyan-400">
            {incident.id}
          </span>
        </div>
        <p className="mt-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
          Response dossier
        </p>
        <h2 className="mt-1.5 text-lg font-semibold leading-tight text-white">
          {incident.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <UserRound className="h-3 w-3 text-cyan-400" />
            {incident.author}
          </span>
          <span className="font-mono">Opened {formatDate(incident.createdAt, true)}</span>
          {incident.demo && (
            <span className="border border-violet-500/40 bg-violet-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-violet-400">
              Demo record
            </span>
          )}
        </div>
      </div>

      {/* Facts + systems */}
      <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="bg-[#0b1424] px-5 py-5 sm:px-6">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-400">
            Incident facts
          </p>
          <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
            {incident.description}
          </p>
        </div>

        <aside className="bg-[#0b1424] px-5 py-5 sm:px-6">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Affected systems
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {incident.affectedSystems.map(system => (
              <span
                key={system}
                className="border border-white/[0.08] bg-[#07101e] px-1.5 py-0.5 font-mono text-[10px] text-slate-300"
              >
                {system}
              </span>
            ))}
          </div>

          <p className="mt-5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Evidence tags
          </p>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
            {incident.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-400"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        </aside>
      </div>

      {/* Solutions */}
      <div className="border-t border-white/[0.08] px-5 py-5 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-violet-400">
              Community remediation
            </p>
            <h3 className="mt-1 text-[15px] font-semibold text-white">Proposed solutions</h3>
          </div>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {incident.solutions.length} thread{incident.solutions.length === 1 ? '' : 's'}
          </span>
        </div>

        {incident.solutions.length ? (
          <div className="mt-4 space-y-3">
            {incident.solutions.map((solution, index) => (
              <article
                key={solution.id}
                className="border border-white/[0.08] bg-[#07101e] p-4"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px]">
                  <span className="text-violet-400">
                    REMEDIATION {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="font-medium text-slate-300">{solution.author}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500">{formatDate(solution.createdAt, true)}</span>
                  {solution.demo && (
                    <span className="ml-auto text-violet-400/70">DEMO</span>
                  )}
                </div>
                <p className="mt-2.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                  {solution.body}
                </p>
                <div className="mt-3 flex justify-end border-t border-white/[0.06] pt-2.5">
                  <button
                    type="button"
                    disabled={solution.helpfulByBrowser}
                    onClick={() => {
                      if (markSolutionHelpful(incident.id, solution.id))
                        toast.success('Marked as helpful');
                    }}
                    aria-label={`${solution.helpfulByBrowser ? 'Already marked' : 'Mark'} solution by ${solution.author} as helpful`}
                    className="inline-flex h-7 items-center gap-1.5 border border-white/[0.08] bg-[#0b1424] px-2 text-[10px] font-medium text-slate-400 transition hover:border-cyan-500/40 hover:bg-cyan-500/[0.06] hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/[0.08] disabled:hover:bg-[#0b1424] disabled:hover:text-slate-400"
                  >
                    <Heart
                      className={`h-3 w-3 ${solution.helpfulByBrowser ? 'fill-current' : ''}`}
                    />
                    {solution.helpfulByBrowser ? 'Helpful' : 'Mark helpful'} ·{' '}
                    {solution.helpfulCount}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 border border-dashed border-white/[0.08] px-6 py-10 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-violet-400" />
            <p className="mt-2 text-xs font-medium text-slate-300">
              No remediation published yet
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Be the first to propose a verified, practical next step.
            </p>
          </div>
        )}

        <form onSubmit={submitSolution} className="mt-5 border-t border-white/[0.08] pt-5">
          <p className="text-xs font-semibold text-white">Add a practical solution</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Describe containment, recovery, validation, or a preventative control. Avoid secrets
            and personal data.
          </p>

          <div className="mt-4 grid gap-3 xl:grid-cols-1 2xl:grid-cols-[200px_minmax(0,1fr)]">
            <label className="block">
              <span className={LABEL}>
                Display name <span className="text-rose-400">*</span>
              </span>
              <input
                value={solutionAuthor}
                onChange={event => setSolutionAuthor(event.target.value)}
                placeholder="Name or team"
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className={LABEL}>
                Proposed remediation <span className="text-rose-400">*</span>
              </span>
              <textarea
                value={solutionBody}
                onChange={event => setSolutionBody(event.target.value)}
                rows={4}
                maxLength={1600}
                placeholder="Explain the steps and how to verify them…"
                className={TEXTAREA}
              />
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-[11px] text-rose-400">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button type="submit" className={BTN_VIOLET}>
              <MessageSquareText className="h-3.5 w-3.5" />
              Publish solution
            </button>
          </div>
        </form>
      </div>
    </Panel>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
export function IncidentsPage() {
  const [incidents, setIncidents] = useState(() => getIncidents());
  const [selectedId, setSelectedId] = useState(() => getIncidents()[0]?.id ?? '');
  const [publishOpen, setPublishOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity | 'all'>('all');
  const [status, setStatus] = useState<IncidentStatus | 'all'>('all');
  const [category, setCategory] = useState<IncidentCategory | 'all'>('all');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeToIncidents(() => setIncidents([...getIncidents()]));
    void loadIncidents().then(value => {
      setIncidents([...value]);
      if (value.length) setSelectedId(current => current || value[0].id);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const linkedIncidentId = params.get('incident');
    if (linkedIncidentId && incidents.some(incident => incident.id === linkedIncidentId)) {
      setSelectedId(linkedIncidentId);
    }
    if (params.get('publish') === '1') {
      setPublishOpen(true);
      params.delete('publish');
      const nextSearch = params.toString();
      navigate(
        { pathname: '/incidents', search: nextSearch ? `?${nextSearch}` : '' },
        { replace: true }
      );
    }
  }, [incidents, location.search, navigate]);

  useEffect(() => {
    if (incidents.length && !incidents.some(incident => incident.id === selectedId))
      setSelectedId(incidents[0].id);
  }, [incidents, selectedId]);

  const visible = useMemo(
    () => filterIncidents(incidents, { query, severity, status, category }),
    [category, incidents, query, severity, status]
  );
  const selected = incidents.find(incident => incident.id === selectedId) ?? visible[0];

  const totals = useMemo(
    () => ({
      total: incidents.length,
      active: incidents.filter(incident => incident.status !== 'resolved').length,
      resolved: incidents.filter(incident => incident.status === 'resolved').length,
      solutions: incidents.reduce((sum, incident) => sum + incident.solutions.length, 0),
    }),
    [incidents]
  );

  const filtersActive = Boolean(
    query || severity !== 'all' || status !== 'all' || category !== 'all'
  );
  const clearFilters = () => {
    setQuery('');
    setSeverity('all');
    setStatus('all');
    setCategory('all');
  };
  const selectIncident = (incidentId: string) => {
    setSelectedId(incidentId);
    navigate(`/incidents?incident=${encodeURIComponent(incidentId)}`);
  };
  const notice = getStorageNotice();

  return (
    <div
      style={{ fontFamily: FONT_SANS }}
      className="relative mx-auto w-full min-w-0 max-w-[1640px] space-y-5 pb-10 text-slate-200"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center border border-white/[0.08] bg-[#0b1424]">
            <ShieldAlert className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Community response exchange
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Incident Field Notes
            </h1>
            <p className="mt-1 hidden max-w-2xl text-xs leading-relaxed text-slate-500 sm:block">
              Publish sanitized incident evidence, compare response paths, and turn operational
              lessons into reusable remediation knowledge.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden border-l border-white/[0.08] pl-4 sm:block">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Storage
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Saved in this browser only
            </p>
          </div>
          <button type="button" onClick={() => setPublishOpen(true)} className={BTN_PRIMARY}>
            <Plus className="h-3.5 w-3.5" />
            Publish incident
          </button>
        </div>
      </header>

      {/* Storage notice */}
      {notice && (
        <div
          role="status"
          className="border-l-2 border-amber-500 bg-amber-500/[0.04] px-4 py-3 text-xs leading-relaxed text-amber-400"
        >
          {notice}
        </div>
      )}

      {/* ═══════════════ METRICS ═══════════════ */}
      <div className="grid grid-cols-2 gap-px border border-white/[0.08] bg-white/[0.06] lg:grid-cols-4">
        {[
          { label: 'Published', value: totals.total, icon: ShieldAlert, tone: 'text-cyan-400' },
          {
            label: 'Active response',
            value: totals.active,
            icon: Flame,
            tone: 'text-rose-400',
          },
          {
            label: 'Resolved',
            value: totals.resolved,
            icon: CheckCircle2,
            tone: 'text-emerald-400',
          },
          {
            label: 'Community solutions',
            value: totals.solutions,
            icon: MessageSquareText,
            tone: 'text-violet-400',
          },
        ].map(metric => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="flex min-w-0 items-center gap-3 bg-[#0b1424] px-5 py-4"
            >
              <Icon className={`h-4 w-4 shrink-0 ${metric.tone}`} />
              <div className="min-w-0">
                <p className="font-mono text-xl font-semibold leading-none text-white sm:text-2xl">
                  {metric.value}
                </p>
                <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  {metric.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════ FILTERS ═══════════════ */}
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search incidents</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search incidents, systems, tags, or authors"
              className={`${INPUT} pl-9`}
            />
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <select
              value={severity}
              onChange={event => setSeverity(event.target.value as IncidentSeverity | 'all')}
              aria-label="Filter by severity"
              className={`${INPUT} cursor-pointer appearance-none pr-8 lg:w-36`}
            >
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={status}
              onChange={event => setStatus(event.target.value as IncidentStatus | 'all')}
              aria-label="Filter by status"
              className={`${INPUT} cursor-pointer appearance-none pr-8 lg:w-36`}
            >
              <option value="all">All statuses</option>
              <option value="investigating">Investigating</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={category}
              onChange={event => setCategory(event.target.value as IncidentCategory | 'all')}
              aria-label="Filter by category"
              className={`${INPUT} cursor-pointer appearance-none pr-8 lg:w-40`}
            >
              <option value="all">All categories</option>
              {INCIDENT_CATEGORIES.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!filtersActive}
              className={BTN}
            >
              <FilterX className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/[0.015] px-5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
          <span>
            {visible.length} of {incidents.length} incidents
          </span>
          <span>Updated locally</span>
        </div>
      </Panel>

      {/* ═══════════════ CONTENT ═══════════════ */}
      {incidents.length === 0 ? (
        <Panel className="px-6 py-16 text-center">
          <ShieldAlert className="mx-auto h-6 w-6 text-slate-600" />
          <h2 className="mt-3 text-sm font-medium text-slate-300">No incidents yet</h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            Publish the first sanitized incident to begin a local response exchange. Analytics will
            update from the same records.
          </p>
          <button
            type="button"
            onClick={() => setPublishOpen(true)}
            className={`${BTN_PRIMARY} mt-5`}
          >
            <Plus className="h-3.5 w-3.5" />
            Publish first incident
          </button>
        </Panel>
      ) : visible.length === 0 ? (
        <Panel className="px-6 py-16 text-center">
          <Search className="mx-auto h-6 w-6 text-slate-600" />
          <h2 className="mt-3 text-sm font-medium text-slate-300">No matching field notes</h2>
          <p className="mt-1 text-xs text-slate-500">
            Broaden the search or clear the current filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 text-xs font-medium text-cyan-400 hover:text-cyan-300"
          >
            Clear filters
          </button>
        </Panel>
      ) : (
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(330px,.72fr)_minmax(0,1.38fr)]">
          <Panel className="min-w-0 overflow-hidden">
            <PanelHeader
              kicker="Community feed"
              kickerTone="cyan"
              title="Published field notes"
              right={<Clock3 className="h-4 w-4 text-slate-500" />}
            />
            <div className="divide-y divide-white/[0.06]">
              {visible.map(incident => (
                <IncidentFeedCard
                  key={incident.id}
                  incident={incident}
                  selected={selected?.id === incident.id}
                  onSelect={() => selectIncident(incident.id)}
                />
              ))}
            </div>
          </Panel>

          {selected && <IncidentDossier incident={selected} />}
        </div>
      )}

      <PublishIncidentDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublished={incident => selectIncident(incident.id)}
      />
    </div>
  );
}

export default IncidentsPage;