import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  Bug,
  Activity,
  Server,
  Search,
  Bell,
  Sparkles,
  Monitor,
  Database,
  Cpu,
  ArrowRight,
  Radar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
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
} from 'react-simple-maps';

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
    spark: [1100, 1120, 1140, 1160, 1190, 1210, 1230, 1247],
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

const criticalAlerts = [
  {
    title: 'Ransomware Attack Detected',
    detail: 'On endpoint: FIN-SRV-09',
    time: '2 min ago',
    severity: 'critical' as const,
  },
  {
    title: 'Suspicious Login Attempt',
    detail: 'User: admin@company.com',
    time: '5 min ago',
    severity: 'medium' as const,
  },
  {
    title: 'Malware Detected',
    detail: 'On endpoint: HR-LAPTOP-21',
    time: '10 min ago',
    severity: 'high' as const,
  },
  {
    title: 'Unusual Data Exfiltration',
    detail: 'From: 192.168.1.45',
    time: '15 min ago',
    severity: 'high' as const,
  },
];

const recentIncidents = [
  {
    id: 'INC-2025-0729',
    title: 'Ransomware Attack',
    severity: 'critical' as const,
    status: 'Investigating',
    time: '2 min ago',
  },
  {
    id: 'INC-2025-0728',
    title: 'Malware Infection',
    severity: 'high' as const,
    status: 'Containment',
    time: '10 min ago',
  },
  {
    id: 'INC-2025-0727',
    title: 'Phishing Attempt',
    severity: 'medium' as const,
    status: 'Resolved',
    time: '1 hr ago',
  },
  {
    id: 'INC-2025-0726',
    title: 'Brute Force Attempt',
    severity: 'low' as const,
    status: 'Resolved',
    time: '3 hr ago',
  },
  {
    id: 'INC-2025-0725',
    title: 'Suspicious Activity',
    severity: 'medium' as const,
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
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Sparkline({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  const points = data.map((v, i) => ({
    i,
    v,
  }));

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
            id={`spark-${color.replace('#', '')}`}
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
          fill={`url(#spark-${color.replace('#', '')})`}
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
      className={`bg-[#0F1729]/60 backdrop-blur-sm border border-white/10 rounded-2xl p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export function DashboardPage() {
  /*
   * Rotating globe state.
   * The globe moves every 50ms for a smooth rotation.
   */
  const [rotation, setRotation] = useState(0);

  /*
   * Live refresh countdown.
   * Starts at 30 and counts down every second.
   */
  const [refreshCountdown, setRefreshCountdown] = useState(30);

  /* ---------------------------------------------------------------- */
  /* Globe rotation                                                   */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const rotationTimer = window.setInterval(() => {
      setRotation((current) => (current + 0.35) % 360);
    }, 50);

    return () => {
      window.clearInterval(rotationTimer);
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* 30-second live countdown                                         */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setRefreshCountdown((current) => {
        if (current <= 1) {
          return 30;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(countdownTimer);
    };
  }, []);

  return (
    <div className="space-y-6">

      {/* ------------------------------------------------------------ */}

      {/* Header                                                       */}

      {/* ------------------------------------------------------------ */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">
            Welcome back,
          </p>

          <div className="flex items-center gap-3 mt-0.5">
            <h1 className="text-2xl font-bold text-slate-100">
              CyberShield Operator
            </h1>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}

      {/* Top stat row                                                 */}

      {/* ------------------------------------------------------------ */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">

        {/* Overall Risk Score */}

        <Panel className="lg:col-span-1 h-full">
          <p className="text-sm text-slate-400 mb-3">
            Overall Risk Score
          </p>

          <div className="flex items-center gap-3">
            <div className="relative w-24 h-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
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
                >
                  <RadialBar
                    dataKey="value"
                    background={{
                      fill: 'rgba(255,255,255,0.06)',
                    }}
                    cornerRadius={8}
                    max={100}
                  />
                </RadialBarChart>
              </ResponsiveContainer>

              {/* Centered 72/100 */}

              <div className="absolute inset-0 flex items-center justify-center whitespace-nowrap">
                <span className="text-xl font-bold leading-none text-slate-100">
                  {riskScore.value}
                </span>

                <span className="text-[11px] font-semibold leading-none text-slate-500 ml-0.5">
                  /{riskScore.max}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-400">
                {riskScore.label}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                ▲ {riskScore.delta}
              </p>
            </div>
          </div>

          <div className="mt-3 -mx-1">
            <Sparkline
              data={riskScore.spark}
              color="#f59e0b"
            />
          </div>
        </Panel>

        {/* Headline statistics */}

        {headlineStats.map((stat) => (
          <Panel
            key={stat.title}
            className="h-full"
          >
            <div className="flex items-center justify-between">

              <p className="text-sm text-slate-400">
                {stat.title}
              </p>

              <stat.icon
                className="w-4 h-4"
                style={{
                  color: stat.accent,
                }}
              />

            </div>

            <p className="text-2xl font-bold text-slate-100 mt-2">
              {stat.value}
            </p>

            <p className="text-xs text-emerald-400 mt-1">
              ▲ {stat.delta}
            </p>

            <div className="mt-2 -mx-1">
              <Sparkline
                data={stat.spark}
                color={stat.accent}
              />
            </div>
          </Panel>
        ))}

      </div>

      {/* ------------------------------------------------------------ */}

      {/* Threat map + breakdown + alerts                              */}

      {/* ------------------------------------------------------------ */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ---------------------------------------------------------- */}

        {/* Global Threat Map                                          */}

        {/* ---------------------------------------------------------- */}

        <Panel className="lg:col-span-2 lg:row-span-3 h-full">

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-200">
              Global Threat Map
            </h3>

            {/* REALTIME COUNTDOWN */}

            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />

              Live · {refreshCountdown}s
            </span>
          </div>

          <div
            className="relative w-full overflow-hidden rounded-xl border border-white/5 bg-[#0B1220]"
            style={{
              aspectRatio: '16 / 9',
            }}
          >

            {/* Globe background glow */}

            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(
                    circle at 50% 50%,
                    rgba(56,189,248,0.14) 0%,
                    rgba(56,189,248,0.06) 28%,
                    transparent 62%
                  )
                `,
              }}
            />

            {/* ------------------------------------------------------ */}

            {/* ROTATING EARTH                                          */}

            {/* ------------------------------------------------------ */}

            <ComposableMap
              projection="geoOrthographic"
              projectionConfig={{
                rotate: [rotation, -8, 0],
                scale: 215,
                center: [0, 0],
              }}
              width={900}
              height={500}
              className="relative z-10 h-full w-full"
              style={{
                background: 'transparent',
              }}
            >

              {/* Countries */}

              <Geographies
                geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
              >
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#132238"
                      stroke="#29415f"
                      strokeWidth={0.45}
                      style={{
                        default: {
                          outline: 'none',
                        },

                        hover: {
                          outline: 'none',
                          fill: '#19304c',
                        },

                        pressed: {
                          outline: 'none',
                        },
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* Threat connection lines */}

              {threatMapPoints.slice(0, 4).map((p, i) => {
                const target =
                  threatMapPoints[
                  (i + 5) % threatMapPoints.length
                  ];

                return (
                  <Line
                    key={`${p.name}-${target.name}`}
                    from={p.coordinates}
                    to={target.coordinates}
                    stroke="#38bdf8"
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    strokeDasharray="3 5"
                    opacity={0.35}
                  />
                );
              })}

              {/* Threat markers */}

              {threatMapPoints.map((p) => (
                <Marker
                  key={p.name}
                  coordinates={p.coordinates}
                >
                  <g className="cursor-pointer">

                    {/* Outer glow */}

                    <circle
                      r={8}
                      fill={levelColor[p.level]}
                      opacity={0.15}
                    />

                    {/* Middle glow */}

                    <circle
                      r={4.2}
                      fill={levelColor[p.level]}
                      opacity={0.28}
                    />

                    {/* Core */}

                    <circle
                      r={2.8}
                      fill={levelColor[p.level]}
                      stroke="#0B1220"
                      strokeWidth={1.5}
                    />

                    <title>
                      {p.name}
                    </title>

                  </g>
                </Marker>
              ))}

            </ComposableMap>

            {/* Globe edge/vignette */}

            <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(11,18,32,0.28)_100%)]" />

          </div>

          {/* Map legend */}

          <div className="flex items-center gap-5 mt-4 text-xs text-slate-400">

            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              High
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Medium
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Low
            </span>

          </div>

        </Panel>

        {/* ---------------------------------------------------------- */}

        {/* Threats by type                                            */}

        {/* ---------------------------------------------------------- */}

        <Panel>

          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            Threats by Type
          </h3>

          <div className="flex items-center gap-4">

            <div className="relative w-28 h-28 shrink-0">

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

            <div className="space-y-1.5 flex-1">

              {threatsByType.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between text-xs"
                >

                  <span className="flex items-center gap-1.5 text-slate-400">

                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: t.color,
                      }}
                    />

                    {t.name}

                  </span>

                  <span className="text-slate-300">
                    {t.value}

{' '}

                    <span className="text-slate-500">
                      ({t.pct})
                    </span>
                  </span>

                </div>
              ))}

            </div>

          </div>

        </Panel>

        {/* ---------------------------------------------------------- */}

        {/* AI detection engine                                        */}

        {/* ---------------------------------------------------------- */}

        <Panel>

          <div className="flex items-center gap-2 mb-3">

            <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">

              <Sparkles className="w-4 h-4 text-cyan-300" />

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

          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">

            <span>
              Model Accuracy
            </span>

            <span className="text-slate-200 font-medium">
              98.7%
            </span>

          </div>

          <div className="h-2 bg-white/5 rounded-full overflow-hidden">

            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
              style={{
                width: '98.7%',
              }}
            />

          </div>

        </Panel>

        {/* ---------------------------------------------------------- */}

        {/* Critical alerts                                            */}

        {/* ---------------------------------------------------------- */}

        <Panel className="h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-200">
              Critical Alerts
            </h3>

            <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.title}
                className="p-3 rounded-lg bg-white/5 border-l-2"
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

                <p className="text-xs text-slate-400 mt-1">
                  {alert.detail}
                </p>

                <p className="text-[11px] text-slate-500 mt-1">
                  {alert.time}
                </p>
              </div>
            ))}
          </div>
        </Panel>

      </div>

      {/* ------------------------------------------------------------ */}

      {/* Recent incidents / vulnerability overview / AI insights      */}

      {/* ------------------------------------------------------------ */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent incidents */}

        <Panel className="h-full">

          <div className="flex items-center justify-between mb-4">

            <h3 className="text-lg font-semibold text-slate-200">
              Recent Incidents
            </h3>

            <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

          </div>

          <div className="space-y-2">

            {recentIncidents.map((incident) => (
              <div
                key={incident.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >

                <div className="flex items-center gap-3 min-w-0">

                  <AlertTriangle
                    className="w-4 h-4 shrink-0"
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

                    <p className="text-sm font-medium text-slate-200 truncate">
                      {incident.title}
                    </p>

                    <p className="text-xs text-slate-500">
                      {incident.id}
                    </p>

                  </div>

                </div>

                <div className="text-right shrink-0">

                  <Badge
                    variant={incident.severity as any}
                  >
                    {incident.severity}
                  </Badge>

                  <p className="text-[11px] text-slate-500 mt-1">
                    {incident.time}
                  </p>

                </div>

              </div>
            ))}

          </div>

        </Panel>

        {/* Vulnerability overview */}

        <Panel className="h-full">

          <div className="flex items-center justify-between mb-2">

            <h3 className="text-lg font-semibold text-slate-200">
              Vulnerability Overview
            </h3>

            <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

          </div>

          <div className="flex items-center gap-4">

            <div className="relative w-28 h-28 shrink-0">

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

            <div className="space-y-1.5 flex-1">

              {vulnerabilities.map((v) => (
                <div
                  key={v.name}
                  className="flex items-center justify-between text-xs"
                >

                  <span className="flex items-center gap-1.5 text-slate-400">

                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: v.color,
                      }}
                    />

                    {v.name}

                  </span>

                  <span className="text-slate-300">

                    {v.value}

{' '}

                    <span className="text-slate-500">
                      ({v.pct})
                    </span>

                  </span>

                </div>
              ))}

            </div>

          </div>

        </Panel>

        {/* AI Insights */}

        <Panel className="h-full space-y-3">

          <h3 className="text-lg font-semibold text-slate-200 mb-1">
            AI Insights
          </h3>

          {aiInsights.map((insight) => (
            <div
              key={insight.title}
              className={`p-4 rounded-xl border flex items-start gap-3 ${insight.tone === 'violet'
                ? 'bg-violet-400/5 border-violet-400/20'
                : 'bg-cyan-400/5 border-cyan-400/20'
                }`}
            >

              <div className="flex-1">

                <p className="text-sm font-semibold text-slate-200">
                  {insight.title}
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  {insight.body}
                </p>

                <button
                  className={`text-xs font-medium mt-2 flex items-center gap-1 ${insight.tone === 'violet'
                    ? 'text-violet-300'
                    : 'text-cyan-300'
                    }`}
                >
                  {insight.cta}

                  <ArrowRight className="w-3 h-3" />
                </button>

              </div>

              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${insight.tone === 'violet'
                  ? 'bg-violet-500/20'
                  : 'bg-cyan-500/20'
                  }`}
              >

                <insight.icon
                  className={`w-4 h-4 ${insight.tone === 'violet'
                    ? 'text-violet-300'
                    : 'text-cyan-300'
                    }`}
                />

              </div>

            </div>
          ))}

        </Panel>

      </div>

      {/* ------------------------------------------------------------ */}

      {/* Footer stat bar                                              */}

      {/* ------------------------------------------------------------ */}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-4">

        <div className="flex items-center gap-2">

          <Shield className="w-4 h-4 text-cyan-400" />

          <span className="text-sm font-medium text-cyan-300">
            CyberShield AI
          </span>

          <span className="text-sm text-slate-400">
            is protecting your digital world
          </span>

        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">

          {footerStats.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2"
            >

              <s.icon className="w-4 h-4 text-emerald-400" />

              <div className="leading-tight">

                <p className="text-[11px] text-slate-500">
                  {s.label}
                </p>

                <p className="text-sm font-semibold text-slate-200">
                  {s.value}
                </p>

              </div>

            </div>
          ))}

        </div>

      </div>

    </div>
  );
}