import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  deriveIncidentAnalytics,
  getIncidents,
  loadIncidents,
  subscribeToIncidents,
  type IncidentSeverity,
  type IncidentStatus,
} from '../../services/incident-community.service';

const severityColors: Record<IncidentSeverity, string> = {
  critical: '#fb7185',
  high: '#fb923c',
  medium: '#fcd34d',
  low: '#64748b',
};

const statusColors: Record<IncidentStatus, string> = {
  investigating: '#fb7185',
  monitoring: '#22d3ee',
  resolved: '#34d399',
};

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`border border-white/[0.09] bg-[#0b1424]/90 shadow-[0_22px_70px_rgba(0,0,0,.2)] ${className}`}>{children}</section>;
}

function ChartHeader({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div className="border-b border-white/[0.08] px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">{eyebrow}</p><div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><h2 className="text-lg font-semibold text-white">{title}</h2><p className="text-xs text-slate-500">{detail}</p></div></div>;
}

function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

const tooltipStyle = {
  background: '#07101e',
  border: '1px solid rgba(255,255,255,.14)',
  borderRadius: 0,
  fontSize: 12,
};

export function AnalyticsPage() {
  const [incidents, setIncidents] = useState(() => getIncidents());
  useEffect(() => {
    const unsubscribe = subscribeToIncidents(() => setIncidents([...getIncidents()]));
    void loadIncidents().then(value => setIncidents([...value]));
    return unsubscribe;
  }, []);
  const analytics = useMemo(() => deriveIncidentAnalytics(incidents), [incidents]);

  if (!incidents.length) {
    return (
      <div className="mx-auto max-w-[1640px] pb-10 text-slate-200">
        <header className="border-b border-white/[0.08] pb-5"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Community intelligence</p><h1 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-white sm:text-4xl">Incident analytics</h1><p className="mt-3 max-w-3xl text-sm text-slate-400">Operational patterns calculated from incident field notes and their remediation threads.</p></header>
        <Surface className="mt-5 grid min-h-[460px] place-items-center px-6 text-center"><div><BarChart3 className="mx-auto h-10 w-10 text-slate-600" /><h2 className="mt-4 text-xl font-semibold text-white">No community data to analyze</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">Analytics remain empty until an incident is published in this browser. No figures are estimated or fabricated.</p><Link to="/incidents?publish=1" className="mt-5 inline-flex min-h-11 items-center gap-2 bg-cyan-300 px-5 text-sm font-bold text-slate-950">Publish an incident <ArrowRight className="h-4 w-4" /></Link></div></Surface>
      </div>
    );
  }

  const summary = [
    { label: 'Published', value: analytics.total, note: 'local records', icon: Activity, tone: 'text-cyan-300' },
    { label: 'Active', value: analytics.active, note: 'need attention', icon: AlertOctagon, tone: 'text-rose-300' },
    { label: 'Resolved', value: analytics.resolved, note: `${analytics.resolutionRate}% resolution rate`, icon: CheckCircle2, tone: 'text-emerald-300' },
    { label: 'Solutions', value: analytics.totalSolutions, note: 'published remediations', icon: MessageSquareText, tone: 'text-violet-300' },
    { label: 'Contributors', value: analytics.contributors, note: 'incident + solution authors', icon: UsersRound, tone: 'text-amber-200' },
  ];

  const categorySummary = analytics.categories.map(item => `${item.name}: ${item.value}`).join(', ');
  const severitySummary = analytics.severity.map(item => `${item.name}: ${item.value}`).join(', ');
  const statusSummary = analytics.status.map(item => `${item.name}: ${item.value}`).join(', ');

  return (
    <div className="relative mx-auto min-w-0 max-w-[1640px] pb-10 text-slate-200">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(34,211,238,.022)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.022)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300"><BarChart3 className="h-4 w-4" />Community intelligence</div><h1 className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.04em] text-white sm:text-4xl">Incident analytics</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">Live operational patterns calculated only from incident field notes and community remediation in this browser.</p></div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center"><div className="border-l-2 border-amber-300/50 px-3 text-[11px] leading-relaxed text-slate-400"><span className="block font-semibold text-amber-200">Local analysis</span>Updates immediately when this browser’s community store changes.</div><Link to="/incidents?publish=1" className="inline-flex min-h-11 items-center gap-2 border border-cyan-300/35 bg-cyan-300/[0.08] px-4 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Publish field note <ArrowRight className="h-4 w-4" /></Link></div>
      </header>

      <section aria-label="Operational summary" className="mt-5 grid grid-cols-2 gap-px border border-white/[0.09] bg-white/[0.09] lg:grid-cols-5">
        {summary.map(metric => <div key={metric.label} className="min-w-0 bg-[#0b1424] px-4 py-4 sm:px-5"><div className="flex items-center justify-between gap-3"><metric.icon className={`h-4 w-4 ${metric.tone}`} /><span className="font-mono text-2xl text-white">{metric.value}</span></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">{metric.label}</p><p className="mt-1 text-[10px] text-slate-500">{metric.note}</p></div>)}
      </section>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
        <Surface className="min-w-0 overflow-hidden"><ChartHeader eyebrow="Activity signal" title="Incident and response timeline" detail="Events by recorded date" /><div className="h-[330px] min-w-0 px-2 pb-3 pt-5 sm:px-4" role="img" aria-label={`Timeline with ${analytics.total} incidents, ${analytics.resolved} resolutions, and ${analytics.totalSolutions} solutions.`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.activity} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}><defs><linearGradient id="incidents-area" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} /><stop offset="95%" stopColor="#22d3ee" stopOpacity={0} /></linearGradient><linearGradient id="solutions-area" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c4b5fd" stopOpacity={0.25} /><stop offset="95%" stopColor="#c4b5fd" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(148,163,184,.1)" vertical={false} /><XAxis dataKey="date" tickFormatter={formatDay} stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} labelFormatter={formatDay} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} /><Area type="monotone" dataKey="incidents" name="Published" stroke="#22d3ee" fill="url(#incidents-area)" strokeWidth={2} /><Area type="monotone" dataKey="solutions" name="Solutions" stroke="#c4b5fd" fill="url(#solutions-area)" strokeWidth={2} /><Area type="monotone" dataKey="resolved" name="Resolved" stroke="#34d399" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></Surface>
        <Surface className="min-w-0 overflow-hidden"><ChartHeader eyebrow="Severity pressure" title="Current distribution" detail={`${analytics.total} total incidents`} /><div className="h-[270px] min-w-0" role="img" aria-label={`Severity distribution. ${severitySummary}`}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.severity} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} stroke="transparent">{analytics.severity.map(entry => <Cell key={entry.name} fill={severityColors[entry.name]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-px border-t border-white/[0.08] bg-white/[0.08]">{analytics.severity.map(item => <div key={item.name} className="flex items-center justify-between bg-[#0b1424] px-4 py-3 text-xs"><span className="inline-flex items-center gap-2 capitalize text-slate-400"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: severityColors[item.name] }} />{item.name}</span><span className="font-mono text-slate-200">{item.value}</span></div>)}</div></Surface>
      </div>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2">
        <Surface className="min-w-0 overflow-hidden"><ChartHeader eyebrow="Work state" title="Response status" detail={statusSummary} /><div className="h-[280px] min-w-0 px-2 py-5 sm:px-4" role="img" aria-label={`Incident response status. ${statusSummary}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.status} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 0 }}><CartesianGrid stroke="rgba(148,163,184,.1)" horizontal={false} /><XAxis type="number" allowDecimals={false} stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis dataKey="name" type="category" width={84} stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" name="Incidents" radius={[0, 2, 2, 0]}>{analytics.status.map(entry => <Cell key={entry.name} fill={statusColors[entry.name]} />)}</Bar></BarChart></ResponsiveContainer></div></Surface>
        <Surface className="min-w-0 overflow-hidden"><ChartHeader eyebrow="Exposure vectors" title="Categories reported" detail={categorySummary} /><div className="h-[280px] min-w-0 px-2 py-5 sm:px-4" role="img" aria-label={`Category breakdown. ${categorySummary}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.categories} margin={{ top: 8, right: 12, left: -24, bottom: 22 }}><CartesianGrid stroke="rgba(148,163,184,.1)" vertical={false} /><XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={58} /><YAxis allowDecimals={false} stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" name="Incidents" fill="#22d3ee" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div></Surface>
      </div>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-3">
        <Surface className="overflow-hidden"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Knowledge pull</p><h2 className="mt-1 text-lg font-semibold text-white">Most discussed</h2></div><MessageSquareText className="h-5 w-5 text-violet-300" /></div><div className="divide-y divide-white/[0.06]">{analytics.mostDiscussed.map(incident => <Link key={incident.id} to={`/incidents?incident=${encodeURIComponent(incident.id)}`} aria-label={`Open incident ${incident.id}: ${incident.title}`} className="group block px-5 py-4 transition hover:bg-white/[0.025] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"><div className="flex items-center gap-2"><span className="font-mono text-[10px] text-cyan-300">{incident.id}</span><span className="ml-auto font-mono text-[10px] text-violet-300">{incident.solutions.length} solutions</span></div><p className="mt-2 text-sm font-semibold leading-snug text-slate-200 group-hover:text-cyan-100">{incident.title}</p></Link>)}</div></Surface>
        <Surface className="overflow-hidden"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Community signal</p><h2 className="mt-1 text-lg font-semibold text-white">Leading contributors</h2></div><UsersRound className="h-5 w-5 text-amber-200" /></div>{analytics.leadingContributors.length ? <ol className="divide-y divide-white/[0.06]">{analytics.leadingContributors.map((contributor, index) => <li key={contributor.name} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4"><span className="font-mono text-xs text-slate-600">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-200">{contributor.name}</p><p className="mt-1 text-[10px] text-slate-500">{contributor.solutions} published solution{contributor.solutions === 1 ? '' : 's'}</p></div><span className="font-mono text-xs text-cyan-300">{contributor.helpful} helpful</span></li>)}</ol> : <div className="px-5 py-10 text-center text-sm text-slate-400">No solution contributors yet.</div>}</Surface>
        <Surface className="overflow-hidden"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300">Response gaps</p><h2 className="mt-1 text-lg font-semibold text-white">Needs community input</h2></div><Clock3 className="h-5 w-5 text-rose-300" /></div>{analytics.responseGaps.length ? <div className="divide-y divide-white/[0.06]">{analytics.responseGaps.map(incident => <Link key={incident.id} to={`/incidents?incident=${encodeURIComponent(incident.id)}`} aria-label={`Open response gap ${incident.id}: ${incident.title}`} className="group block px-5 py-4 transition hover:bg-white/[0.025] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /><span className="font-mono text-[10px] text-slate-500">{incident.id}</span><span className="ml-auto text-[10px] uppercase tracking-wider text-rose-300">{incident.status}</span></div><p className="mt-2 text-sm font-semibold leading-snug text-slate-200 group-hover:text-cyan-100">{incident.title}</p></Link>)}</div> : <div className="px-5 py-10 text-center"><ShieldCheck className="mx-auto h-6 w-6 text-emerald-300" /><p className="mt-3 text-sm font-semibold text-slate-200">Every active incident has a proposed solution</p></div>}</Surface>
      </div>

      <footer className="mt-5 flex flex-col gap-2 border-t border-white/[0.08] pt-4 text-[10px] uppercase tracking-[0.12em] text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Derived from {analytics.total} browser-saved incident records</span><span>No server-wide community synchronization</span></footer>
    </div>
  );
}
