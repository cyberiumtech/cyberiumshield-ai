import React from 'react';
import {
  Shield,
  AlertTriangle,
  Bug,
  Activity,
  TrendingUp,
  Server,
  Users,
  FileText,
} from 'lucide-react';
import { StatCard } from '../../components/shared/StatCard';
import { ChartCard } from '../../components/shared/ChartCard';
import { Badge } from '../../components/shared/Badge';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const stats = [
  { title: 'Security Score', value: '92/100', delta: '+2.5%', icon: Shield, trend: 'up' as const },
  { title: 'Active Threats', value: '12', delta: '-10.2%', icon: AlertTriangle, trend: 'down' as const, color: 'text-red-400' },
  { title: 'Vulnerabilities', value: '48', delta: '+5 New', icon: Bug, trend: 'neutral' as const, color: 'text-yellow-400' },
  { title: 'System Health', value: '99.8%', delta: 'Excellent', icon: Activity, trend: 'up' as const, color: 'text-emerald-400' },
];

const threatTimelineData = [
  { time: '00:00', threats: 12, blocked: 10 },
  { time: '04:00', threats: 8, blocked: 7 },
  { time: '08:00', threats: 25, blocked: 22 },
  { time: '12:00', threats: 35, blocked: 30 },
  { time: '16:00', threats: 28, blocked: 25 },
  { time: '20:00', threats: 18, blocked: 16 },
];

const threatCategoriesData = [
  { name: 'Malware', value: 35, color: '#ef4444' },
  { name: 'Phishing', value: 28, color: '#f59e0b' },
  { name: 'DDoS', value: 18, color: '#eab308' },
  { name: 'SQL Injection', value: 12, color: '#06b6d4' },
  { name: 'Other', value: 7, color: '#6366f1' },
];

const attackSourceData = [
  { country: 'Russia', attacks: 245 },
  { country: 'China', attacks: 198 },
  { country: 'USA', attacks: 142 },
  { country: 'Brazil', attacks: 98 },
  { country: 'India', attacks: 76 },
];

const recentIncidents = [
  { id: '1', title: 'Ransomware Detected', severity: 'critical', target: 'Server-01', time: '5m ago', status: 'Active' },
  { id: '2', title: 'SQL Injection Attempt', severity: 'high', target: 'Web-App', time: '12m ago', status: 'Investigating' },
  { id: '3', title: 'Unusual Login Activity', severity: 'medium', target: 'Admin Portal', time: '1h ago', status: 'Contained' },
  { id: '4', title: 'Port Scan Detected', severity: 'low', target: 'Firewall', time: '2h ago', status: 'Dismissed' },
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Security Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time security monitoring and threat intelligence</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/30">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-emerald-400">All Systems Operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Threat Timeline (24h)" value="12" change={-10.2} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={threatTimelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="threats" stroke="#ef4444" fill="#ef444420" />
              <Area type="monotone" dataKey="blocked" stroke="#22c55e" fill="#22c55e20" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Threat Categories" value="5" change={12.5}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={threatCategoriesData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {threatCategoriesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Attack Sources" value="5 Countries">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={attackSourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis type="category" dataKey="country" stroke="#64748b" width={80} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="attacks" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="System Resources" value="Normal">
          <div className="space-y-4">
            {[
              { label: 'CPU Usage', value: 45, color: 'bg-cyan-400' },
              { label: 'Memory', value: 68, color: 'bg-blue-400' },
              { label: 'Network', value: 32, color: 'bg-emerald-400' },
              { label: 'Disk I/O', value: 55, color: 'bg-yellow-400' },
            ].map((resource) => (
              <div key={resource.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-400">{resource.label}</span>
                  <span className="text-slate-200 font-medium">{resource.value}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${resource.color} transition-all duration-500`}
                    style={{ width: `${resource.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Recent Incidents Table */}
      <div className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-200">Recent Incidents</h3>
          <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            View All →
          </button>
        </div>
        <div className="space-y-3">
          {recentIncidents.map((incident) => (
            <div
              key={incident.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4 flex-1">
                <AlertTriangle className={`w-5 h-5 ${
                  incident.severity === 'critical' ? 'text-red-400' :
                  incident.severity === 'high' ? 'text-orange-400' :
                  incident.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">{incident.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Target: {incident.target}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={incident.severity as any}>{incident.severity}</Badge>
                <span className="text-xs text-slate-400">{incident.time}</span>
                <Badge variant="info">{incident.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
