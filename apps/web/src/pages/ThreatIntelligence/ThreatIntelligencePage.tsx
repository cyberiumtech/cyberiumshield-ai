import React from 'react';
import { Globe, MapPin, TrendingUp, AlertTriangle, Shield, Target } from 'lucide-react';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/shared/Badge';
import { ChartCard } from '../../components/shared/ChartCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const stats = [
  { title: 'Active Threat Actors', value: '142', delta: '+8 This Week', icon: Target, trend: 'neutral' as const, color: 'text-red-400' },
  { title: 'IOCs Tracked', value: '15,234', delta: '+1,205 New', icon: Shield, trend: 'up' as const },
  { title: 'Attack Campaigns', value: '23', delta: '5 Active', icon: TrendingUp, trend: 'neutral' as const, color: 'text-orange-400' },
  { title: 'Global Coverage', value: '98%', delta: '156 Countries', icon: Globe, trend: 'up' as const, color: 'text-emerald-400' },
];

const threatActors = [
  { name: 'APT28 (Fancy Bear)', origin: 'Russia', activity: 'High', targets: 'Government, Military', lastSeen: '2 hours ago' },
  { name: 'Lazarus Group', origin: 'North Korea', activity: 'Critical', targets: 'Financial, Crypto', lastSeen: '1 day ago' },
  { name: 'APT29 (Cozy Bear)', origin: 'Russia', activity: 'Medium', targets: 'Healthcare, Research', lastSeen: '3 days ago' },
  { name: 'Carbanak', origin: 'Ukraine', activity: 'High', targets: 'Banking, ATMs', lastSeen: '12 hours ago' },
];

const attackTrendsData = [
  { month: 'Jan', ransomware: 45, phishing: 78, malware: 32 },
  { month: 'Feb', ransomware: 52, phishing: 82, malware: 38 },
  { month: 'Mar', ransomware: 48, phishing: 95, malware: 42 },
  { month: 'Apr', ransomware: 65, phishing: 102, malware: 48 },
  { month: 'May', ransomware: 72, phishing: 88, malware: 55 },
  { month: 'Jun', ransomware: 68, phishing: 115, malware: 62 },
];

const geographicData = [
  { region: 'North America', incidents: 245 },
  { region: 'Europe', incidents: 198 },
  { region: 'Asia', incidents: 312 },
  { region: 'Middle East', incidents: 87 },
  { region: 'South America', incidents: 56 },
];

export function ThreatIntelligencePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Threat Intelligence</h1>
          <p className="text-sm text-slate-400 mt-1">Global threat landscape and emerging attack patterns</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
          <Globe className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-sm font-medium text-cyan-400">Live Intelligence Feed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Attack Trends (6 Months)" value="642" change={15.3}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={attackTrendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="ransomware" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="phishing" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="malware" stroke="#06b6d4" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Attacks by Region" value="898 Total">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={geographicData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="region" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="incidents" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-200">Active Threat Actors</h3>
          <Badge variant="critical">4 High Priority</Badge>
        </div>
        <div className="space-y-3">
          {threatActors.map((actor, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  actor.activity === 'Critical' ? 'bg-red-400' :
                  actor.activity === 'High' ? 'bg-orange-400' : 'bg-yellow-400'
                } animate-pulse`} />
                <div>
                  <p className="text-sm font-semibold text-slate-200">{actor.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {actor.origin}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{actor.targets}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Last seen: {actor.lastSeen}</span>
                <Badge variant={
                  actor.activity === 'Critical' ? 'critical' :
                  actor.activity === 'High' ? 'high' : 'medium'
                }>
                  {actor.activity}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
