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

/* ─────────────────────────────────────────────────────────────
   FONT STACK
   ───────────────────────────────────────────────────────────── */
const FONT_SANS = "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

/* ─────────────────────────────────────────────────────────────
   SHARED STYLE STRINGS
   ───────────────────────────────────────────────────────────── */
const BTN_PRIMARY =
  'inline-flex h-10 items-center justify-center gap-2 border border-cyan-500/40 bg-cyan-500/[0.08] px-5 text-xs font-medium text-cyan-400 transition hover:border-cyan-400 hover:bg-cyan-500/[0.14] hover:text-cyan-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

/* ─────────────────────────────────────────────────────────────
   CHART COLORS — muted, consistent with the palette
   ───────────────────────────────────────────────────────────── */
const severityColors: Record<IncidentSeverity, string> = {
  critical: '#f43f5e',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#64748b',
};

const statusColors: Record<IncidentStatus, string> = {
  investigating: '#f43f5e',
  monitoring: '#22d3ee',
  resolved: '#10b981',
};

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */
function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

const tooltipStyle = {
  background: '#0b1424',
  border: '1px solid rgba(148,163,184,0.15)',
  borderRadius: 0,
  fontSize: 11,
  fontFamily: FONT_MONO,
} as const;

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

/* ═════════════════════════════════════════════════════════════
   ANALYTICS PAGE
   ═════════════════════════════════════════════════════════════ */
export function AnalyticsPage() {
  const [incidents, setIncidents] = useState(() => getIncidents());

  useEffect(() => {
    const unsubscribe = subscribeToIncidents(() => setIncidents([...getIncidents()]));
    void loadIncidents().then(value => setIncidents([...value]));
    return unsubscribe;
  }, []);

  const analytics = useMemo(() => deriveIncidentAnalytics(incidents), [incidents]);

  /* ─── Empty state ───────────────────────────────────────── */
  if (!incidents.length) {
    return (
      <div
        style={{ fontFamily: FONT_SANS }}
        className="relative mx-auto w-full min-w-0 max-w-[1640px] space-y-5 pb-10 text-slate-200"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

        <header className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 place-items-center border border-white/[0.08] bg-[#0b1424]">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Community intelligence
              </p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Incident Analytics
              </h1>
              <p className="mt-1 hidden max-w-2xl text-xs leading-relaxed text-slate-500 sm:block">
                Operational patterns calculated from incident field notes and their remediation
                threads.
              </p>
            </div>
          </div>
        </header>

        <Panel className="px-6 py-16 text-center">
          <BarChart3 className="mx-auto h-6 w-6 text-slate-600" />
          <h2 className="mt-3 text-sm font-medium text-slate-300">
            No community data to analyze
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            Analytics remain empty until an incident is published in this browser. No figures are
            estimated or fabricated.
          </p>
          <Link to="/incidents?publish=1" className={`${BTN_PRIMARY} mt-5`}>
            Publish an incident
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Panel>
      </div>
    );
  }

  /* ─── Derived values ────────────────────────────────────── */
  const summary = [
    {
      label: 'Published',
      value: analytics.total,
      note: 'Local records',
      icon: Activity,
      tone: 'text-cyan-400',
    },
    {
      label: 'Active',
      value: analytics.active,
      note: 'Need attention',
      icon: AlertOctagon,
      tone: 'text-rose-400',
    },
    {
      label: 'Resolved',
      value: analytics.resolved,
      note: `${analytics.resolutionRate}% resolution rate`,
      icon: CheckCircle2,
      tone: 'text-emerald-400',
    },
    {
      label: 'Solutions',
      value: analytics.totalSolutions,
      note: 'Published remediations',
      icon: MessageSquareText,
      tone: 'text-violet-400',
    },
    {
      label: 'Contributors',
      value: analytics.contributors,
      note: 'Incident + solution authors',
      icon: UsersRound,
      tone: 'text-amber-400',
    },
  ];

  const categorySummary = analytics.categories.map(item => `${item.name}: ${item.value}`).join(', ');
  const severitySummary = analytics.severity.map(item => `${item.name}: ${item.value}`).join(', ');
  const statusSummary = analytics.status.map(item => `${item.name}: ${item.value}`).join(', ');

  /* ─── Render ────────────────────────────────────────────── */
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
            <BarChart3 className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Community intelligence
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Incident Analytics
            </h1>
            <p className="mt-1 hidden max-w-2xl text-xs leading-relaxed text-slate-500 sm:block">
              Live operational patterns calculated only from incident field notes and community
              remediation in this browser.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden border-l border-white/[0.08] pl-4 sm:block">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Data source
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Local browser store only</p>
          </div>
          <Link to="/incidents?publish=1" className={BTN_PRIMARY}>
            Publish field note
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* ═══════════════ METRICS STRIP ═══════════════ */}
      <div className="grid grid-cols-2 gap-px border border-white/[0.08] bg-white/[0.06] lg:grid-cols-5">
        {summary.map(metric => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="min-w-0 bg-[#0b1424] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <Icon className={`h-3.5 w-3.5 ${metric.tone}`} />
                <span className="font-mono text-2xl font-semibold leading-none tracking-tight text-white">
                  {metric.value}
                </span>
              </div>
              <p className="mt-4 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                {metric.label}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">{metric.note}</p>
            </div>
          );
        })}
      </div>

      {/* ═══════════════ TIMELINE + SEVERITY ═══════════════ */}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
        {/* Timeline */}
        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            kicker="Activity signal"
            kickerTone="cyan"
            title="Incident and response timeline"
            hint="Events by recorded date"
            right={<Activity className="h-4 w-4 text-slate-500" />}
          />
          <div
            className="h-[320px] min-w-0 px-3 pb-3 pt-5 sm:px-5"
            role="img"
            aria-label={`Timeline with ${analytics.total} incidents, ${analytics.resolved} resolutions, and ${analytics.totalSolutions} solutions.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.activity}
                margin={{ top: 10, right: 12, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="incidents-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="solutions-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDay}
                  stroke="#64748b"
                  tick={{ fontSize: 10, fontFamily: FONT_MONO }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#64748b"
                  tick={{ fontSize: 10, fontFamily: FONT_MONO }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={formatDay} />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    paddingTop: 10,
                    fontFamily: FONT_MONO,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="incidents"
                  name="Published"
                  stroke="#22d3ee"
                  fill="url(#incidents-area)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="solutions"
                  name="Solutions"
                  stroke="#a78bfa"
                  fill="url(#solutions-area)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Resolved"
                  stroke="#10b981"
                  fill="transparent"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Severity distribution */}
        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            kicker="Severity pressure"
            kickerTone="rose"
            title="Current distribution"
            hint={`${analytics.total} total incidents`}
          />
          <div
            className="h-[260px] min-w-0"
            role="img"
            aria-label={`Severity distribution. ${severitySummary}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.severity}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {analytics.severity.map(entry => (
                    <Cell key={entry.name} fill={severityColors[entry.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-white/[0.08] bg-white/[0.06]">
            {analytics.severity.map(item => (
              <div
                key={item.name}
                className="flex items-center justify-between bg-[#0b1424] px-5 py-2.5"
              >
                <span className="inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: severityColors[item.name] }}
                  />
                  {item.name}
                </span>
                <span className="font-mono text-xs font-semibold text-slate-200">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ═══════════════ STATUS + CATEGORIES ═══════════════ */}
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            kicker="Work state"
            kickerTone="emerald"
            title="Response status"
            hint={statusSummary}
          />
          <div
            className="h-[280px] min-w-0 px-3 py-5 sm:px-5"
            role="img"
            aria-label={`Incident response status. ${statusSummary}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.status}
                layout="vertical"
                margin={{ top: 8, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid stroke="rgba(148,163,184,.08)" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  stroke="#64748b"
                  tick={{ fontSize: 10, fontFamily: FONT_MONO }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={88}
                  stroke="#94a3b8"
                  tick={{ fontSize: 10, fontFamily: FONT_MONO }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Incidents">
                  {analytics.status.map(entry => (
                    <Cell key={entry.name} fill={statusColors[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            kicker="Exposure vectors"
            kickerTone="cyan"
            title="Categories reported"
            hint={categorySummary}
          />
          <div
            className="h-[280px] min-w-0 px-3 py-5 sm:px-5"
            role="img"
            aria-label={`Category breakdown. ${categorySummary}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.categories}
                margin={{ top: 8, right: 12, left: -24, bottom: 30 }}
              >
                <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fontSize: 9, fontFamily: FONT_MONO }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={58}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#64748b"
                  tick={{ fontSize: 10, fontFamily: FONT_MONO }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Incidents" fill="#22d3ee" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ═══════════════ LISTS ═══════════════ */}
      <div className="grid min-w-0 gap-5 lg:grid-cols-3">
        {/* Most discussed */}
        <Panel className="overflow-hidden">
          <PanelHeader
            kicker="Knowledge pull"
            kickerTone="violet"
            title="Most discussed"
            right={<MessageSquareText className="h-4 w-4 text-slate-500" />}
          />
          <div className="divide-y divide-white/[0.05]">
            {analytics.mostDiscussed.map(incident => (
              <Link
                key={incident.id}
                to={`/incidents?incident=${encodeURIComponent(incident.id)}`}
                aria-label={`Open incident ${incident.id}: ${incident.title}`}
                className="group block px-5 py-3.5 transition hover:bg-white/[0.02] focus:outline-none focus-visible:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-wider text-cyan-400">
                    {incident.id}
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-violet-400">
                    {incident.solutions.length} solutions
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-slate-200">
                  {incident.title}
                </p>
              </Link>
            ))}
          </div>
        </Panel>

        {/* Leading contributors */}
        <Panel className="overflow-hidden">
          <PanelHeader
            kicker="Community signal"
            kickerTone="amber"
            title="Leading contributors"
            right={<UsersRound className="h-4 w-4 text-slate-500" />}
          />
          {analytics.leadingContributors.length ? (
            <ol className="divide-y divide-white/[0.05]">
              {analytics.leadingContributors.map((contributor, index) => (
                <li
                  key={contributor.name}
                  className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5"
                >
                  <span className="font-mono text-[10px] tracking-wider text-slate-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">
                      {contributor.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      {contributor.solutions} solution
                      {contributor.solutions === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400">
                    {contributor.helpful} helpful
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="px-5 py-12 text-center">
              <UsersRound className="mx-auto h-5 w-5 text-slate-600" />
              <p className="mt-2 text-xs text-slate-500">No solution contributors yet.</p>
            </div>
          )}
        </Panel>

        {/* Response gaps */}
        <Panel className="overflow-hidden">
          <PanelHeader
            kicker="Response gaps"
            kickerTone="rose"
            title="Needs community input"
            right={<Clock3 className="h-4 w-4 text-slate-500" />}
          />
          {analytics.responseGaps.length ? (
            <div className="divide-y divide-white/[0.05]">
              {analytics.responseGaps.map(incident => (
                <Link
                  key={incident.id}
                  to={`/incidents?incident=${encodeURIComponent(incident.id)}`}
                  aria-label={`Open response gap ${incident.id}: ${incident.title}`}
                  className="group block px-5 py-3.5 transition hover:bg-white/[0.02] focus:outline-none focus-visible:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <span className="font-mono text-[10px] tracking-wider text-slate-500">
                      {incident.id}
                    </span>
                    <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-rose-400">
                      {incident.status}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-slate-200">
                    {incident.title}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <ShieldCheck className="mx-auto h-5 w-5 text-emerald-500" />
              <p className="mt-2 text-xs font-medium text-slate-300">
                Every active incident has a proposed solution
              </p>
            </div>
          )}
        </Panel>
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="flex flex-col gap-2 border-t border-white/[0.08] pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Derived from {analytics.total} browser-saved incident
          {analytics.total === 1 ? '' : 's'}
        </span>
        <span>No server-wide community synchronization</span>
      </footer>
    </div>
  );
}

export default AnalyticsPage;