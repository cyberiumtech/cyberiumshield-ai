import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Server,
  Monitor,
  Database,
  Cpu,
  ArrowRight,
  Radar,
  Sparkles,
  Terminal,
  Clock3,
  LockKeyhole,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';

import { Badge } from '../../components/shared/Badge';

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  Sphere,
  Graticule,
} from 'react-simple-maps';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type Severity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

type LogStatusType =
  | 'success'
  | 'blocked'
  | 'warning'
  | 'investigating';

/* ------------------------------------------------------------------ */
/* Data                                                               */
/* ------------------------------------------------------------------ */

const riskScore = {
  value: 72,
  max: 100,
  label: 'Medium Risk',
  delta: '8 pts vs yesterday',
  trend: 'up' as const,
  spark: [61, 58, 64, 60, 66, 70, 68, 72],
};

const headlineStats = [
  {
    title: 'Threats Detected',
    value: '348',
    delta: '+28% vs yesterday',
    trend: 'up' as const,
    icon: Radar,
    accent: '#38bdf8',
    spark: [18, 22, 19, 26, 24, 30, 27, 34],
  },
  {
    title: 'Incidents',
    value: '27',
    delta: '+17% vs yesterday',
    trend: 'up' as const,
    icon: AlertTriangle,
    accent: '#fb923c',
    spark: [12, 14, 13, 15, 18, 16, 20, 21],
  },
  {
    title: 'Assets Monitored',
    value: '1,247',
    delta: '+6% vs yesterday',
    trend: 'up' as const,
    icon: Monitor,
    accent: '#818cf8',
    spark: [
      1100,
      1120,
      1140,
      1160,
      1190,
      1210,
      1230,
      1247,
    ],
  },
  {
    title: 'Designated Safe',
    value: '98.3%',
    delta: '+2.1% vs yesterday',
    trend: 'up' as const,
    icon: ShieldCheck,
    accent: '#34d399',
    spark: [95, 95.5, 96, 96.8, 97.2, 97.6, 98, 98.3],
  },
];

/* ------------------------------------------------------------------ */
/* Global Threat Map Data                                             */
/* ------------------------------------------------------------------ */

const threatMapPoints = [
  {
    name: 'Moscow',
    coordinates: [37.6173, 55.7558] as [number, number],
    level: 'high' as const,
  },
  {
    name: 'Beijing',
    coordinates: [116.4074, 39.9042] as [number, number],
    level: 'high' as const,
  },
  {
    name: 'New York',
    coordinates: [-74.006, 40.7128] as [number, number],
    level: 'medium' as const,
  },
  {
    name: 'São Paulo',
    coordinates: [-46.6333, -23.5505] as [number, number],
    level: 'medium' as const,
  },
  {
    name: 'Lagos',
    coordinates: [3.3792, 6.5244] as [number, number],
    level: 'low' as const,
  },
  {
    name: 'Mumbai',
    coordinates: [72.8777, 19.076] as [number, number],
    level: 'high' as const,
  },
  {
    name: 'London',
    coordinates: [-0.1276, 51.5074] as [number, number],
    level: 'low' as const,
  },
  {
    name: 'Sydney',
    coordinates: [151.2093, -33.8688] as [number, number],
    level: 'low' as const,
  },
  {
    name: 'Tokyo',
    coordinates: [139.6917, 35.6895] as [number, number],
    level: 'medium' as const,
  },
  {
    name: 'Cairo',
    coordinates: [31.2357, 30.0444] as [number, number],
    level: 'medium' as const,
  },
];

const levelColor: Record<string, string> = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#38bdf8',
};

const threatsByType = [
  {
    name: 'Malware',
    value: 132,
    pct: '37.9%',
    color: '#ef4444',
  },
  {
    name: 'Phishing',
    value: 86,
    pct: '24.7%',
    color: '#38bdf8',
  },
  {
    name: 'Ransomware',
    value: 54,
    pct: '15.5%',
    color: '#f59e0b',
  },
  {
    name: 'Exploits',
    value: 41,
    pct: '11.8%',
    color: '#a78bfa',
  },
  {
    name: 'DDoS',
    value: 24,
    pct: '6.9%',
    color: '#06b6d4',
  },
  {
    name: 'Others',
    value: 11,
    pct: '3.2%',
    color: '#6366f1',
  },
];

const criticalAlerts: Array<{
  title: string;
  detail: string;
  time: string;
  severity: Severity;
}> = [
  {
    title: 'Ransomware Attack Detected',
    detail: 'On endpoint: FIN-SRV-09',
    time: '2 min ago',
    severity: 'critical',
  },
  {
    title: 'Suspicious Login Attempt',
    detail: 'User: admin@company.com',
    time: '5 min ago',
    severity: 'medium',
  },
  {
    title: 'Malware Detected',
    detail: 'On endpoint: HR-LAPTOP-21',
    time: '10 min ago',
    severity: 'high',
  },
  {
    title: 'Unusual Data Exfiltration',
    detail: 'From: 192.168.1.45',
    time: '15 min ago',
    severity: 'high',
  },
];

const activityLogs: Array<{
  time: string;
  event: string;
  source: string;
  action: string;
  status: LogStatusType;
}> = [
  {
    time: '22:01:42',
    event: 'Ransomware signature detected',
    source: 'FIN-SRV-09',
    action: 'Blocked',
    status: 'blocked',
  },
  {
    time: '21:59:18',
    event: 'Suspicious authentication attempt',
    source: 'admin@company.com',
    action: 'Challenged',
    status: 'warning',
  },
  {
    time: '21:55:03',
    event: 'Malware payload detected',
    source: 'HR-LAPTOP-21',
    action: 'Quarantined',
    status: 'blocked',
  },
  {
    time: '21:49:27',
    event: 'Outbound data anomaly detected',
    source: '192.168.1.45',
    action: 'Inspected',
    status: 'investigating',
  },
  {
    time: '21:44:11',
    event: 'Firewall policy violation',
    source: 'EDGE-FW-01',
    action: 'Blocked',
    status: 'blocked',
  },
  {
    time: '21:39:56',
    event: 'Endpoint security scan completed',
    source: 'ENG-LAPTOP-14',
    action: 'Completed',
    status: 'success',
  },
];

const recentIncidents: Array<{
  id: string;
  title: string;
  severity: Severity;
  status: string;
  time: string;
}> = [
  {
    id: 'INC-2025-0729',
    title: 'Ransomware Attack',
    severity: 'critical',
    status: 'Investigating',
    time: '2 min ago',
  },
  {
    id: 'INC-2025-0728',
    title: 'Malware Infection',
    severity: 'high',
    status: 'Containment',
    time: '10 min ago',
  },
  {
    id: 'INC-2025-0727',
    title: 'Phishing Attempt',
    severity: 'medium',
    status: 'Resolved',
    time: '1 hr ago',
  },
  {
    id: 'INC-2025-0726',
    title: 'Brute Force Attempt',
    severity: 'low',
    status: 'Resolved',
    time: '3 hr ago',
  },
  {
    id: 'INC-2025-0725',
    title: 'Suspicious Activity',
    severity: 'medium',
    status: 'Investigating',
    time: '5 hr ago',
  },
];

const vulnerabilities = [
  {
    name: 'Critical',
    value: 23,
    pct: '12.5%',
    color: '#f87171',
  },
  {
    name: 'High',
    value: 61,
    pct: '33.2%',
    color: '#fb923c',
  },
  {
    name: 'Medium',
    value: 67,
    pct: '36.4%',
    color: '#fbbf24',
  },
  {
    name: 'Low',
    value: 23,
    pct: '12.5%',
    color: '#38bdf8',
  },
  {
    name: 'Info',
    value: 10,
    pct: '5.4%',
    color: '#94a3b8',
  },
];

const aiInsights = [
  {
    title: 'Anomaly Detected',
    body: 'Unusual network activity detected from IP 203.0.113.45',
    cta: 'View Insight',
    icon: Sparkles,
    tone: 'violet' as const,
  },
  {
    title: 'Threat Prediction',
    body: 'High probability of phishing attacks in HR department',
    cta: 'View Prediction',
    icon: Radar,
    tone: 'cyan' as const,
  },
];

const footerStats = [
  {
    label: 'Uptime',
    value: '99.98%',
    icon: Server,
  },
  {
    label: 'Threats Blocked',
    value: '12,449',
    icon: Shield,
  },
  {
    label: 'Data Analyzed',
    value: '2.45 TB',
    icon: Database,
  },
  {
    label: 'AI Model Version',
    value: 'v2.4.1',
    icon: Cpu,
  },
];

/* ------------------------------------------------------------------ */
/* Small Building Blocks                                              */
/* ------------------------------------------------------------------ */

function Sparkline({
  data,
  color,
  id,
}: {
  data: number[];
  color: string;
  id: string;
}) {
  const points = data.map((v, i) => ({
    i,
    v,
  }));

  const gradientId = `spark-${id}`;

  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart
        data={points}
        margin={{
          top: 4,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={color}
              stopOpacity={0.35}
            />

            <stop
              offset="100%"
              stopColor={color}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>

        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Panel({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#0F1729]/60 p-5 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function LogStatus({
  status,
}: {
  status: LogStatusType;
}) {
  const config: Record<
    LogStatusType,
    {
      label: string;
      className: string;
      icon: React.ElementType;
    }
  > = {
    success: {
      label: 'Success',
      className:
        'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
      icon: CheckCircle2,
    },
    blocked: {
      label: 'Blocked',
      className:
        'border-red-400/20 bg-red-400/10 text-red-300',
      icon: XCircle,
    },
    warning: {
      label: 'Warning',
      className:
        'border-amber-400/20 bg-amber-400/10 text-amber-300',
      icon: AlertTriangle,
    },
    investigating: {
      label: 'Investigating',
      className:
        'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
      icon: RefreshCw,
    },
  };

  const item = config[status];
  const Icon = item.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${item.className}`}
    >
      <Icon className="h-3 w-3" />
      {item.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Global Threat Globe                                                 */
/* ------------------------------------------------------------------ */

function GlobalThreatGlobe() {
  const [rotation, setRotation] = useState<
    [number, number, number]
  >([0, -8, 0]);

  const [seconds, setSeconds] = useState(30);

  const projectionConfig = useMemo(
    () => ({
      rotate: rotation,
      scale: 255,
    }),
    [rotation]
  );

  useEffect(() => {
    const rotationTimer = window.setInterval(() => {
      setRotation((current) => [
        current[0] + 0.35,
        current[1],
        current[2],
      ]);
    }, 80);

    return () => {
      window.clearInterval(rotationTimer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          return 30;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-white/5 bg-[#08111f]"
      style={{
        height: '500px',
      }}
    >
      {/* Main atmospheric glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0"
        style={{
          width: '620px',
          height: '620px',
          transform: 'translate(-50%, -50%)',
          borderRadius: '9999px',
          background:
            'radial-gradient(circle, rgba(14,165,233,0.14) 0%, rgba(14,165,233,0.07) 35%, rgba(14,165,233,0.025) 55%, transparent 72%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Outer globe halo */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0"
        style={{
          width: '535px',
          height: '535px',
          transform: 'translate(-50%, -50%)',
          borderRadius: '9999px',
          border: '1px solid rgba(56,189,248,0.06)',
          boxShadow:
            '0 0 70px rgba(14,165,233,0.06), inset 0 0 70px rgba(14,165,233,0.04)',
        }}
      />

      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={projectionConfig}
        width={900}
        height={500}
        className="relative z-10 h-full w-full"
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      >
        {/* Earth sphere */}
        <Sphere
          id="globe-sphere"
          fill="#0b1a2d"
          stroke="#1e4162"
          strokeWidth={1.2}
        />

        {/* Latitude / longitude grid */}
        <Graticule
          stroke="#1c4568"
          strokeWidth={0.35}
          strokeOpacity={0.28}
        />

        {/* World countries */}
        <Geographies
          geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
        >
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#10243a"
                stroke="#284766"
                strokeWidth={0.45}
                style={{
                  default: {
                    outline: 'none',
                  },
                  hover: {
                    outline: 'none',
                    fill: '#173553',
                  },
                  pressed: {
                    outline: 'none',
                  },
                }}
              />
            ))
          }
        </Geographies>

        {/* Threat connections */}
        {threatMapPoints.slice(0, 6).map((point, i) => {
          const target =
            threatMapPoints[
              (i + 4) % threatMapPoints.length
            ];

          return (
            <Line
              key={`${point.name}-${target.name}`}
              from={point.coordinates}
              to={target.coordinates}
              stroke="#38bdf8"
              strokeWidth={1.15}
              strokeLinecap="round"
              strokeDasharray="3 5"
              opacity={0.42}
            />
          );
        })}

        {/* Threat locations */}
        {threatMapPoints.map((point) => (
          <Marker
            key={point.name}
            coordinates={point.coordinates}
          >
            <g className="cursor-pointer">
              <circle
                r={9}
                fill={levelColor[point.level]}
                opacity={0.08}
              />

              <circle
                r={6}
                fill={levelColor[point.level]}
                opacity={0.16}
              />

              <circle
                r={4}
                fill={levelColor[point.level]}
                opacity={0.35}
              />

              <circle
                r={2.5}
                fill={levelColor[point.level]}
                stroke="#07111f"
                strokeWidth={1.3}
              />

              <title>{point.name}</title>
            </g>
          </Marker>
        ))}
      </ComposableMap>

      {/* Edge vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            'radial-gradient(circle at center, transparent 48%, rgba(8,17,31,0.18) 68%, rgba(8,17,31,0.72) 100%)',
        }}
      />

      {/* Live indicator */}
      <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-emerald-400/20 bg-[#08111f]/75 px-3 py-1.5 backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>

        <span className="text-[11px] font-medium text-emerald-300">
          LIVE
        </span>
      </div>

      {/* Globe status */}
      <div className="absolute bottom-4 left-4 z-30 rounded-lg border border-white/10 bg-[#08111f]/70 px-3 py-2 backdrop-blur-md">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Global Network
        </p>

        <p className="mt-0.5 text-xs font-medium text-slate-300">
          10 active threat locations
        </p>
      </div>

      {/* Feed status */}
      <div className="absolute bottom-4 right-4 z-30 rounded-lg border border-white/10 bg-[#08111f]/70 px-3 py-2 text-right backdrop-blur-md">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Threat Feed
        </p>

        <p className="mt-0.5 text-xs font-medium text-cyan-300">
          Next update in {seconds}s
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">
            Welcome back,
          </p>

          <div className="mt-0.5 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100">
              CyberShield Operator
            </h1>
          </div>
        </div>
      </div>

      {/* Top stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Risk gauge */}
        <Panel className="lg:col-span-1">
          <p className="mb-3 text-sm text-slate-400">
            Overall Risk Score
          </p>

          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <RadialBarChart
                  innerRadius="72%"
                  outerRadius="100%"
                  data={[
                    {
                      value: riskScore.value,
                      fill: '#f59e0b',
                    },
                  ]}
                  startAngle={90}
                  endAngle={-270}
                  cx="50%"
                  cy="50%"
                >
                  <RadialBar
                    dataKey="value"
                    background={{
                      fill: 'rgba(255,255,255,0.06)',
                    }}
                    cornerRadius={8}
                  />
                </RadialBarChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex items-baseline justify-center gap-0.5 whitespace-nowrap">
                <span className="text-lg font-bold leading-none text-slate-100">
                  {riskScore.value}
                </span>

                <span className="text-[10px] font-semibold leading-none text-slate-500">
                  /{riskScore.max}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-amber-400">
                {riskScore.label}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                ▲ {riskScore.delta}
              </p>
            </div>
          </div>

          <div className="-mx-1 mt-3">
            <Sparkline
              data={riskScore.spark}
              color="#f59e0b"
              id="risk"
            />
          </div>
        </Panel>

        {/* Headline statistics */}
        {headlineStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Panel key={stat.title}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {stat.title}
                </p>

                <Icon
                  className="h-4 w-4"
                  style={{
                    color: stat.accent,
                  }}
                />
              </div>

              <p className="mt-2 text-2xl font-bold text-slate-100">
                {stat.value}
              </p>

              <p className="mt-1 text-xs text-emerald-400">
                ▲ {stat.delta}
              </p>

              <div className="-mx-1 mt-2">
                <Sparkline
                  data={stat.spark}
                  color={stat.accent}
                  id={stat.title
                    .toLowerCase()
                    .replace(/\s+/g, '-')}
                />
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Threat map + breakdown + alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Global Threat Map */}
        <Panel className="lg:col-span-2 lg:row-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-200">
              Global Threat Map
            </h3>

            <span className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live · updates every 30s
            </span>
          </div>

          <GlobalThreatGlobe />

          {/* Legend */}
          <div className="mt-4 flex items-center gap-5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              High
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Medium
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Low
            </span>
          </div>
        </Panel>

        {/* Threats by type */}
        <Panel>
          <h3 className="mb-2 text-lg font-semibold text-slate-200">
            Threats by Type
          </h3>

          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={threatsByType}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={54}
                    paddingAngle={2}
                  >
                    {threatsByType.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-100">
                  348
                </span>

                <span className="text-[10px] text-slate-500">
                  Total
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              {threatsByType.map((threat) => (
                <div
                  key={threat.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: threat.color,
                      }}
                    />

                    {threat.name}
                  </span>

                  <span className="text-slate-300">
                    {threat.value}{' '}
                    <span className="text-slate-500">
                      ({threat.pct})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* AI Detection Engine */}
        <Panel>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10">
              <Sparkles className="h-4 w-4 text-cyan-300" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                AI Detection Engine
              </p>

              <p className="text-xs text-emerald-400">
                Active &amp; Learning
              </p>
            </div>
          </div>

          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>Model Accuracy</span>

            <span className="font-medium text-slate-200">
              98.7%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
              style={{
                width: '98.7%',
              }}
            />
          </div>
        </Panel>

        {/* Critical Alerts */}
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-200">
              Critical Alerts
            </h3>

            <button
              type="button"
              className="flex items-center gap-1 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.title}
                className="rounded-lg border-l-2 bg-white/5 p-3"
                style={{
                  borderColor:
                    alert.severity === 'critical' ||
                    alert.severity === 'high'
                      ? '#f87171'
                      : '#fbbf24',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-200">
                    {alert.title}
                  </p>

                  <Badge variant={alert.severity as any}>
                    {alert.severity}
                  </Badge>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  {alert.detail}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {alert.time}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Live Activity Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10">
                <Terminal className="h-4 w-4 text-cyan-300" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-200">
                  Live Activity Logs
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  Security events across monitored infrastructure
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                LIVE
              </span>

              <button
                type="button"
                className="ml-2 flex items-center gap-1 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#0B1220]/50">
            {/* Log Header */}
            <div className="hidden grid-cols-[90px_1fr_130px_110px_90px] gap-3 border-b border-white/5 bg-white/[0.025] px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 md:grid">
              <span>Time</span>
              <span>Event</span>
              <span>Source</span>
              <span>Action</span>
              <span>Status</span>
            </div>

            {/* Log Rows */}
            <div className="divide-y divide-white/5">
              {activityLogs.map((log, index) => (
                <div
                  key={`${log.time}-${index}`}
                  className="grid grid-cols-1 gap-2 px-4 py-3 transition-colors hover:bg-white/[0.035] md:grid-cols-[90px_1fr_130px_110px_90px] md:items-center md:gap-3"
                >
                  <span className="text-[11px] font-mono text-slate-500">
                    {log.time}
                  </span>

                  <div className="flex min-w-0 items-center gap-2">
                    <Activity className="h-3.5 w-3.5 shrink-0 text-cyan-400" />

                    <span className="truncate text-xs text-slate-300">
                      {log.event}
                    </span>
                  </div>

                  <span className="truncate text-[11px] font-mono text-slate-500">
                    {log.source}
                  </span>

                  <span className="text-[11px] text-slate-400">
                    {log.action}
                  </span>

                  <span className="text-[11px]">
                    <LogStatus status={log.status} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Log footer */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                Retention: 30 days
              </span>

              <span className="flex items-center gap-1.5">
                <LockKeyhole className="h-3.5 w-3.5" />
                Encrypted
              </span>
            </div>

            <span className="text-[11px] text-slate-500">
              1,842 events processed today
            </span>
          </div>
        </Panel>
      </div>

      {/* Recent incidents / vulnerability overview / AI insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Incidents */}
        <Panel className="h-full">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-200">
              Recent Incidents
            </h3>

            <button
              type="button"
              className="flex items-center gap-1 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentIncidents.map((incident) => (
              <div
                key={incident.id}
                className="flex cursor-pointer items-center justify-between rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <AlertTriangle
                    className="h-4 w-4 shrink-0"
                    style={{
                      color:
                        incident.severity === 'critical'
                          ? '#f87171'
                          : incident.severity === 'high'
                          ? '#fb923c'
                          : incident.severity === 'medium'
                          ? '#fbbf24'
                          : '#60a5fa',
                    }}
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {incident.title}
                    </p>

                    <p className="text-xs text-slate-500">
                      {incident.id}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <Badge
                    variant={incident.severity as any}
                  >
                    {incident.severity}
                  </Badge>

                  <p className="mt-1 text-[11px] text-slate-500">
                    {incident.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Vulnerability Overview */}
        <Panel className="h-full">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-200">
              Vulnerability Overview
            </h3>

            <button
              type="button"
              className="flex items-center gap-1 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={vulnerabilities}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={54}
                    paddingAngle={2}
                  >
                    {vulnerabilities.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-100">
                  184
                </span>

                <span className="text-[10px] text-slate-500">
                  Total
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              {vulnerabilities.map((vulnerability) => (
                <div
                  key={vulnerability.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          vulnerability.color,
                      }}
                    />

                    {vulnerability.name}
                  </span>

                  <span className="text-slate-300">
                    {vulnerability.value}{' '}
                    <span className="text-slate-500">
                      ({vulnerability.pct})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* AI Insights */}
        <Panel className="h-full space-y-3">
          <h3 className="mb-1 text-lg font-semibold text-slate-200">
            AI Insights
          </h3>

          {aiInsights.map((insight) => {
            const InsightIcon = insight.icon;

            return (
              <div
                key={insight.title}
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  insight.tone === 'violet'
                    ? 'border-violet-400/20 bg-violet-400/5'
                    : 'border-cyan-400/20 bg-cyan-400/5'
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-200">
                    {insight.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {insight.body}
                  </p>

                  <button
                    type="button"
                    className={`mt-2 flex items-center gap-1 text-xs font-medium ${
                      insight.tone === 'violet'
                        ? 'text-violet-300'
                        : 'text-cyan-300'
                    }`}
                  >
                    {insight.cta}

                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    insight.tone === 'violet'
                      ? 'bg-violet-500/20'
                      : 'bg-cyan-500/20'
                  }`}
                >
                  <InsightIcon
                    className={`h-4 w-4 ${
                      insight.tone === 'violet'
                        ? 'text-violet-300'
                        : 'text-cyan-300'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </Panel>
      </div>

      {/* Footer stat bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0F1729]/50 px-6 py-4 backdrop-blur-sm sm:flex-row">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />

          <span className="text-sm font-medium text-cyan-300">
            CyberShield AI
          </span>

          <span className="text-sm text-slate-400">
            is protecting your digital world
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {footerStats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4 text-emerald-400" />

                <div className="leading-tight">
                  <p className="text-[11px] text-slate-500">
                    {stat.label}
                  </p>

                  <p className="text-sm font-semibold text-slate-200">
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
