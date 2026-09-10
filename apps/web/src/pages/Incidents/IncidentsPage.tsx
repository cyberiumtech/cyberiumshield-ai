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
  markSolutionHelpful,
  publishIncident,
  subscribeToIncidents,
  type CommunityIncident,
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStatus,
} from '../../services/incident-community.service';

const severityStyles: Record<IncidentSeverity, string> = {
  critical: 'border-rose-400/35 bg-rose-400/10 text-rose-300',
  high: 'border-orange-400/35 bg-orange-400/10 text-orange-300',
  medium: 'border-amber-300/35 bg-amber-300/10 text-amber-200',
  low: 'border-slate-500/40 bg-slate-400/[0.08] text-slate-300',
};

const statusStyles: Record<IncidentStatus, string> = {
  investigating: 'text-rose-300 before:bg-rose-400',
  monitoring: 'text-cyan-300 before:bg-cyan-300',
  resolved: 'text-emerald-300 before:bg-emerald-300',
};

function formatDate(value: string, includeTime = false) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`border border-white/[0.09] bg-[#0b1424]/90 shadow-[0_22px_70px_rgba(0,0,0,.2)] ${className}`}>{children}</section>;
}

function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return <span className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${severityStyles[severity]}`}>{severity}</span>;
}

function StatusLabel({ status }: { status: IncidentStatus }) {
  return <span className={`relative inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] before:h-1.5 before:w-1.5 before:rounded-full ${statusStyles[status]}`}>{status}</span>;
}

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

const fieldClass = 'mt-2 min-h-11 w-full border border-white/10 bg-[#07101e] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20';

function PublishIncidentDialog({ open, onClose, onPublished }: { open: boolean; onClose: () => void; onPublished: (incident: CommunityIncident) => void }) {
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const tags = form.tags.split(',').map(value => value.trim()).filter(Boolean);
    const systems = form.affectedSystems.split(',').map(value => value.trim()).filter(Boolean);
    if (!form.title.trim() || !form.description.trim() || !form.author.trim() || !tags.length || !systems.length) {
      setError('Complete every required field, including at least one tag and affected system.');
      return;
    }
    try {
      const incident = publishIncident({ ...form, tags, affectedSystems: systems });
      setForm(emptyPublishForm);
      setError('');
      toast.success('Incident published to this browser');
      onPublished(incident);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to publish this incident.');
    }
  };

  const update = <K extends keyof PublishFormState>(key: K, value: PublishFormState[K]) => setForm(current => ({ ...current, [key]: value }));

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/75 px-3 py-5 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="publish-incident-title" className="my-auto w-full max-w-3xl border border-cyan-300/25 bg-[#091321] shadow-[0_32px_120px_rgba(0,0,0,.65)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Community disclosure</p>
            <h2 id="publish-incident-title" className="mt-1 text-xl font-semibold text-white sm:text-2xl">Publish an incident</h2>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-400">Share operational facts without credentials, personal data, or active exploit details. This post is saved in this browser.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close publish incident dialog" className="grid h-10 w-10 shrink-0 place-items-center border border-white/10 text-slate-400 transition hover:border-white/25 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={submit} className="max-h-[calc(100vh-165px)] overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs font-semibold text-slate-300">Incident title <span className="text-rose-300">*</span><input ref={firstInput} value={form.title} onChange={event => update('title', event.target.value)} maxLength={140} placeholder="What happened and where?" className={fieldClass} /></label>
            <label className="sm:col-span-2 text-xs font-semibold text-slate-300">Incident narrative <span className="text-rose-300">*</span><textarea value={form.description} onChange={event => update('description', event.target.value)} rows={5} maxLength={2400} placeholder="Describe discovery, impact, evidence, and containment already performed." className={`${fieldClass} py-3 leading-relaxed`} /></label>
            <label className="text-xs font-semibold text-slate-300">Display name <span className="text-rose-300">*</span><input value={form.author} onChange={event => update('author', event.target.value)} maxLength={80} placeholder="Name or response team" className={fieldClass} /></label>
            <label className="text-xs font-semibold text-slate-300">Category <span className="text-rose-300">*</span><select value={form.category} onChange={event => update('category', event.target.value as IncidentCategory)} className={fieldClass}>{INCIDENT_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-300">Severity <span className="text-rose-300">*</span><select value={form.severity} onChange={event => update('severity', event.target.value as IncidentSeverity)} className={fieldClass}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
            <label className="text-xs font-semibold text-slate-300">Response status <span className="text-rose-300">*</span><select value={form.status} onChange={event => update('status', event.target.value as IncidentStatus)} className={fieldClass}><option value="investigating">Investigating</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option></select></label>
            <label className="text-xs font-semibold text-slate-300">Affected systems <span className="text-rose-300">*</span><input value={form.affectedSystems} onChange={event => update('affectedSystems', event.target.value)} placeholder="gateway-01, identity-provider" className={`${fieldClass} font-mono`} /><span className="mt-1.5 block text-[10px] font-normal text-slate-500">Comma-separated, safe-to-disclose names.</span></label>
            <label className="text-xs font-semibold text-slate-300">Tags <span className="text-rose-300">*</span><input value={form.tags} onChange={event => update('tags', event.target.value)} placeholder="oauth, credential-theft" className={`${fieldClass} font-mono`} /><span className="mt-1.5 block text-[10px] font-normal text-slate-500">Comma-separated investigation topics.</span></label>
          </div>
          {error && <p role="alert" className="mt-5 border-l-2 border-rose-400 bg-rose-400/[0.07] px-3 py-2 text-sm text-rose-200">{error}</p>}
          <footer className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="min-h-11 border border-white/10 px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Cancel</button>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091321]"><ShieldAlert className="h-4 w-4" />Publish disclosure</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function IncidentFeedCard({ incident, selected, onSelect }: { incident: CommunityIncident; selected: boolean; onSelect: () => void }) {
  const helpful = incident.solutions.reduce((sum, solution) => sum + solution.helpfulCount, 0);
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`group w-full border-l-2 px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:px-5 ${selected ? 'border-l-cyan-300 bg-cyan-300/[0.055]' : 'border-l-transparent hover:bg-white/[0.025]'}`}>
      <div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={incident.severity} /><StatusLabel status={incident.status} /><span className="ml-auto font-mono text-[10px] text-slate-500">{incident.id}</span></div>
      <h3 className="mt-3 text-[15px] font-semibold leading-snug text-slate-100 transition group-hover:text-cyan-100">{incident.title}</h3>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">{incident.description}</p>
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-slate-500">
        <span className="font-medium text-slate-300">{incident.category}</span>
        <span>{incident.author}</span>
        <span>{formatDate(incident.createdAt)}</span>
        {incident.demo && <span className="border border-violet-300/20 px-1.5 py-0.5 text-violet-300">DEMO</span>}
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-3 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5"><MessageSquareText className="h-3.5 w-3.5 text-violet-300" />{incident.solutions.length} solutions</span>
        <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-cyan-300" />{helpful} helpful</span>
        <ArrowRight className={`ml-auto h-4 w-4 ${selected ? 'text-cyan-300' : 'text-slate-600'}`} />
      </div>
    </button>
  );
}

function IncidentDossier({ incident }: { incident: CommunityIncident }) {
  const [solutionAuthor, setSolutionAuthor] = useState('');
  const [solutionBody, setSolutionBody] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setSolutionBody('');
  }, [incident.id]);

  const submitSolution = (event: FormEvent) => {
    event.preventDefault();
    if (!solutionAuthor.trim() || !solutionBody.trim()) {
      setError('Add your display name and a practical remediation before publishing.');
      return;
    }
    try {
      addSolution(incident.id, { author: solutionAuthor, body: solutionBody });
      setSolutionBody('');
      setError('');
      toast.success('Solution published to this incident');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to publish the solution.');
    }
  };

  return (
    <Surface className="min-w-0 overflow-hidden xl:sticky xl:top-[92px]">
      <div className="relative overflow-hidden border-b border-white/[0.09] px-5 py-5 sm:px-7">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.12),transparent_67%)]" />
        <div className="relative flex flex-wrap items-center gap-2"><SeverityBadge severity={incident.severity} /><StatusLabel status={incident.status} /><span className="ml-auto font-mono text-[10px] tracking-wider text-cyan-300">{incident.id}</span></div>
        <p className="relative mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Selected response dossier</p>
        <h2 className="relative mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl">{incident.title}</h2>
        <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400"><span className="inline-flex items-center gap-1.5 text-slate-200"><UserRound className="h-3.5 w-3.5 text-cyan-300" />{incident.author}</span><span className="font-mono">opened {formatDate(incident.createdAt, true)}</span>{incident.demo && <span className="border border-violet-300/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-300">Demo record</span>}</div>
      </div>
      <div className="px-5 py-5 sm:px-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_220px]">
          <article>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Incident facts</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{incident.description}</p>
          </article>
          <aside className="border-l border-white/[0.08] pl-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Affected systems</p>
            <div className="mt-3 flex flex-wrap gap-2">{incident.affectedSystems.map(system => <span key={system} className="border border-white/10 bg-black/10 px-2 py-1 font-mono text-[10px] text-slate-300">{system}</span>)}</div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Evidence tags</p>
            <div className="mt-3 flex flex-wrap gap-2">{incident.tags.map(tag => <span key={tag} className="inline-flex items-center gap-1 text-[10px] text-cyan-300"><Tag className="h-3 w-3" />{tag}</span>)}</div>
          </aside>
        </div>
      </div>
      <div className="border-t border-violet-300/15 bg-violet-400/[0.025] px-5 py-5 sm:px-7">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Community remediation</p><h3 className="mt-1 text-lg font-semibold text-white">Proposed solutions</h3></div><span className="font-mono text-xs text-slate-500">{incident.solutions.length} THREAD{incident.solutions.length === 1 ? '' : 'S'}</span></div>
        {incident.solutions.length ? (
          <div className="mt-4 space-y-3">
            {incident.solutions.map((solution, index) => (
              <article key={solution.id} className="border border-white/[0.08] bg-[#091321] p-4">
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><span className="font-mono text-violet-300">REMEDIATION {String(index + 1).padStart(2, '0')}</span><span>·</span><span className="font-semibold text-slate-300">{solution.author}</span><span>· {formatDate(solution.createdAt, true)}</span>{solution.demo && <span className="ml-auto text-violet-300/70">DEMO</span>}</div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{solution.body}</p>
                <div className="mt-4 flex justify-end border-t border-white/[0.06] pt-3"><button type="button" disabled={solution.helpfulByBrowser} onClick={() => { if (markSolutionHelpful(incident.id, solution.id)) toast.success('Marked as helpful'); }} aria-label={`${solution.helpfulByBrowser ? 'Already marked' : 'Mark'} solution by ${solution.author} as helpful`} className="inline-flex min-h-9 items-center gap-2 border border-cyan-300/20 px-3 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-300/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"><Heart className={`h-3.5 w-3.5 ${solution.helpfulByBrowser ? 'fill-current' : ''}`} />{solution.helpfulByBrowser ? 'Helpful marked' : 'Helpful'} · {solution.helpfulCount}</button></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 border border-dashed border-violet-300/20 px-5 py-7 text-center"><Sparkles className="mx-auto h-5 w-5 text-violet-300" /><p className="mt-3 text-sm font-semibold text-slate-200">No remediation published yet</p><p className="mt-1 text-xs text-slate-400">Be the first to propose a verified, practical next step.</p></div>
        )}
        <form onSubmit={submitSolution} className="mt-5 border-t border-white/[0.08] pt-5">
          <p className="text-sm font-semibold text-white">Add a practical solution</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">Describe containment, recovery, validation, or a preventative control. Avoid secrets and personal data.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[200px_minmax(0,1fr)]"><label className="text-xs font-semibold text-slate-300">Display name <span className="text-rose-300">*</span><input value={solutionAuthor} onChange={event => setSolutionAuthor(event.target.value)} placeholder="Name or team" className={fieldClass} /></label><label className="text-xs font-semibold text-slate-300">Proposed remediation <span className="text-rose-300">*</span><textarea value={solutionBody} onChange={event => setSolutionBody(event.target.value)} rows={4} maxLength={1600} placeholder="Explain the steps and how to verify them…" className={`${fieldClass} py-3 leading-relaxed`} /></label></div>
          {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
          <div className="mt-4 flex justify-end"><button type="submit" className="inline-flex min-h-11 items-center gap-2 bg-violet-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#091321]"><MessageSquareText className="h-4 w-4" />Publish solution</button></div>
        </form>
      </div>
    </Surface>
  );
}

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

  useEffect(() => subscribeToIncidents(() => setIncidents(getIncidents())), []);
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
      navigate({ pathname: '/incidents', search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
    }
  }, [incidents, location.search, navigate]);
  useEffect(() => {
    if (incidents.length && !incidents.some(incident => incident.id === selectedId)) setSelectedId(incidents[0].id);
  }, [incidents, selectedId]);

  const visible = useMemo(() => filterIncidents(incidents, { query, severity, status, category }), [category, incidents, query, severity, status]);
  const selected = incidents.find(incident => incident.id === selectedId) ?? visible[0];
  const totals = useMemo(() => ({
    total: incidents.length,
    active: incidents.filter(incident => incident.status !== 'resolved').length,
    resolved: incidents.filter(incident => incident.status === 'resolved').length,
    solutions: incidents.reduce((sum, incident) => sum + incident.solutions.length, 0),
  }), [incidents]);
  const filtersActive = Boolean(query || severity !== 'all' || status !== 'all' || category !== 'all');
  const clearFilters = () => { setQuery(''); setSeverity('all'); setStatus('all'); setCategory('all'); };
  const selectIncident = (incidentId: string) => {
    setSelectedId(incidentId);
    navigate(`/incidents?incident=${encodeURIComponent(incidentId)}`);
  };
  const notice = getStorageNotice();

  return (
    <div className="relative mx-auto min-w-0 max-w-[1640px] pb-10 text-slate-200">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(34,211,238,.022)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.022)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300"><ShieldAlert className="h-4 w-4" />Community response exchange</div>
          <h1 className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.04em] text-white sm:text-4xl">Incident field notes</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">Publish sanitized incident evidence, compare response paths, and turn operational lessons into reusable remediation knowledge.</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="border-l-2 border-amber-300/50 px-3 text-[11px] leading-relaxed text-slate-400"><span className="block font-semibold text-amber-200">Saved in this browser</span>Not synchronized with other people or devices.</div>
          <button type="button" onClick={() => setPublishOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1120]"><Plus className="h-4 w-4" />Publish incident</button>
        </div>
      </header>

      {notice && <div role="status" className="mt-4 border-l-2 border-amber-300 bg-amber-300/[0.07] px-4 py-3 text-xs text-amber-100">{notice}</div>}

      <section aria-label="Incident overview" className="mt-5 grid grid-cols-2 gap-px border border-white/[0.09] bg-white/[0.09] lg:grid-cols-4">
        {[
          { label: 'Published', value: totals.total, icon: ShieldAlert, tone: 'text-cyan-300' },
          { label: 'Active response', value: totals.active, icon: Flame, tone: 'text-rose-300' },
          { label: 'Resolved', value: totals.resolved, icon: CheckCircle2, tone: 'text-emerald-300' },
          { label: 'Community solutions', value: totals.solutions, icon: MessageSquareText, tone: 'text-violet-300' },
        ].map(metric => <div key={metric.label} className="flex min-w-0 items-center gap-3 bg-[#0b1424] px-4 py-4 sm:px-5"><metric.icon className={`h-4 w-4 shrink-0 ${metric.tone}`} /><div><p className="font-mono text-xl text-white sm:text-2xl">{metric.value}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 sm:text-[10px]">{metric.label}</p></div></div>)}
      </section>

      <Surface className="mt-5 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-4 py-4 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search incidents</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search incidents, systems, tags, or authors" className="min-h-11 w-full border border-white/10 bg-[#07101e] pl-10 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20" /></label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <label><span className="sr-only">Filter by severity</span><select value={severity} onChange={event => setSeverity(event.target.value as IncidentSeverity | 'all')} className="min-h-11 w-full border border-white/10 bg-[#07101e] px-3 text-xs text-slate-300 outline-none focus:border-cyan-300/60"><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
            <label><span className="sr-only">Filter by status</span><select value={status} onChange={event => setStatus(event.target.value as IncidentStatus | 'all')} className="min-h-11 w-full border border-white/10 bg-[#07101e] px-3 text-xs text-slate-300 outline-none focus:border-cyan-300/60"><option value="all">All statuses</option><option value="investigating">Investigating</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option></select></label>
            <label><span className="sr-only">Filter by category</span><select value={category} onChange={event => setCategory(event.target.value as IncidentCategory | 'all')} className="min-h-11 w-full border border-white/10 bg-[#07101e] px-3 text-xs text-slate-300 outline-none focus:border-cyan-300/60"><option value="all">All categories</option>{INCIDENT_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
            <button type="button" onClick={clearFilters} disabled={!filtersActive} className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/10 px-3 text-xs font-semibold text-slate-300 transition hover:border-white/25 hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-35"><FilterX className="h-4 w-4" />Clear</button>
          </div>
        </div>
        <div className="flex items-center justify-between bg-white/[0.015] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500"><span>{visible.length} of {incidents.length} incidents</span><span>Updated locally</span></div>
      </Surface>

      {incidents.length === 0 ? (
        <Surface className="mt-5 grid min-h-[420px] place-items-center px-6 text-center"><div><ShieldAlert className="mx-auto h-9 w-9 text-slate-600" /><h2 className="mt-4 text-xl font-semibold text-white">No incidents in this browser</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">Publish the first sanitized incident to begin a local response exchange. Analytics will update from the same records.</p><button type="button" onClick={() => setPublishOpen(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 bg-cyan-300 px-5 text-sm font-bold text-slate-950"><Plus className="h-4 w-4" />Publish first incident</button></div></Surface>
      ) : visible.length === 0 ? (
        <Surface className="mt-5 grid min-h-[300px] place-items-center px-6 text-center"><div><Search className="mx-auto h-7 w-7 text-slate-600" /><h2 className="mt-3 text-lg font-semibold text-white">No matching field notes</h2><p className="mt-1 text-sm text-slate-400">Broaden the search or clear the current filters.</p><button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-cyan-300 hover:text-cyan-200">Clear filters</button></div></Surface>
      ) : (
        <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(330px,.72fr)_minmax(0,1.38fr)]">
          <Surface className="min-w-0 overflow-hidden"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Community feed</p><h2 className="mt-1 text-lg font-semibold text-white">Published field notes</h2></div><Clock3 className="h-5 w-5 text-slate-500" /></div><div className="divide-y divide-white/[0.06]">{visible.map(incident => <IncidentFeedCard key={incident.id} incident={incident} selected={selected?.id === incident.id} onSelect={() => selectIncident(incident.id)} />)}</div></Surface>
          {selected && <IncidentDossier incident={selected} />}
        </div>
      )}

      <PublishIncidentDialog open={publishOpen} onClose={() => setPublishOpen(false)} onPublished={incident => selectIncident(incident.id)} />
    </div>
  );
}
