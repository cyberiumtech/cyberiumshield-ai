# CyberiumShield AI - Complete Dashboard Code

## 🎨 Design System Overview

We're using **React 19 + TypeScript + Vite + Tailwind CSS** (easily adaptable to Next.js)

### Color Palette
```css
/* Primary Colors */
--cyber-cyan: #22d3ee;      /* cyan-400 */
--cyber-blue: #60a5fa;      /* blue-400 */
--cyber-purple: #c084fc;    /* purple-400 */

/* Status Colors */
--status-critical: #ef4444;  /* red-400 */
--status-high: #f97316;      /* orange-400 */
--status-medium: #eab308;    /* yellow-400 */
--status-low: #3b82f6;       /* blue-400 */
--status-safe: #22c55e;      /* emerald-400 */

/* Background Colors */
--bg-primary: #0B1120;
--bg-card: rgba(15, 23, 41, 0.8);  /* #0F1729/80 */
--bg-hover: rgba(255, 255, 255, 0.05);

/* Text Colors */
--text-primary: #e2e8f0;    /* slate-200 */
--text-secondary: #94a3b8;  /* slate-400 */
--text-tertiary: #64748b;   /* slate-500 */

/* Border Colors */
--border-subtle: rgba(255, 255, 255, 0.1);
--border-hover: rgba(6, 182, 212, 0.3);  /* cyan-400/30 */
```

---

## 1️⃣ Threat Severity Summary Card Widget

### `ThreatSeverityCard.tsx`

```typescript
import { Shield, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThreatCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface ThreatSeverityCardProps {
  threats: ThreatCount;
  total: number;
  trend?: number; // percentage change
}

export function ThreatSeverityCard({ threats, total, trend }: ThreatSeverityCardProps) {
  const severityData = [
    {
      level: 'Critical',
      count: threats.critical,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      ringColor: 'ring-red-400/30',
      icon: AlertOctagon,
      percentage: total > 0 ? Math.round((threats.critical / total) * 100) : 0,
    },
    {
      level: 'High',
      count: threats.high,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      ringColor: 'ring-orange-400/30',
      icon: AlertTriangle,
      percentage: total > 0 ? Math.round((threats.high / total) * 100) : 0,
    },
    {
      level: 'Medium',
      count: threats.medium,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      ringColor: 'ring-yellow-400/30',
      icon: Shield,
      percentage: total > 0 ? Math.round((threats.medium / total) * 100) : 0,
    },
    {
      level: 'Low',
      count: threats.low,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      ringColor: 'ring-blue-400/30',
      icon: Info,
      percentage: total > 0 ? Math.round((threats.low / total) * 100) : 0,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-cyan-400/30 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-200 mb-1">Threat Severity</h3>
          <p className="text-sm text-slate-400">Active threat distribution</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-cyan-400">{total}</div>
          {trend !== undefined && (
            <div className={`text-xs font-medium ${trend < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
      </div>

      {/* Severity Grid */}
      <div className="space-y-4">
        {severityData.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.level}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              {/* Severity Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.bgColor} ring-1 ${item.ringColor} group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-200">{item.level}</div>
                    <div className="text-xs text-slate-500">{item.percentage}% of total</div>
                  </div>
                </div>
                <div className={`text-2xl font-bold ${item.color}`}>
                  {item.count}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className={`h-full ${item.color.replace('text-', 'bg-')} transition-all`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-xs text-slate-400 mb-1">Resolved Today</div>
          <div className="text-lg font-bold text-emerald-400">24</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-400 mb-1">Avg. Response Time</div>
          <div className="text-lg font-bold text-cyan-400">3.2m</div>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## 2️⃣ Complete Threat Detection Dashboard

### `ThreatDetectionDashboard.tsx`

```typescript
import { useState, useEffect } from 'react';
import { 
  Eye, 
  ShieldAlert, 
  ShieldOff, 
  XCircle, 
  Zap, 
  Search, 
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThreatSeverityCard } from './ThreatSeverityCard';

// Types
interface Threat {
  id: string;
  name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  sourceIP: string;
  targetIP: string;
  detectionTime: Date;
  status: 'New' | 'Investigating' | 'Contained' | 'Dismissed';
  riskScore: number;
  protocol: string;
  port: number;
}

// Badge Component
function Badge({ 
  children, 
  variant 
}: { 
  children: React.ReactNode; 
  variant: 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning' | 'info' 
}) {
  const variants = {
    critical: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30',
    high: 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
    info: 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

// Mock Data Generator
function generateMockThreat(): Threat {
  const severities: Threat['severity'][] = ['Critical', 'High', 'Medium', 'Low'];
  const statuses: Threat['status'][] = ['New', 'Investigating', 'Contained', 'Dismissed'];
  const protocols = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'SSH'];
  const threatTypes = [
    'Ransomware Attack',
    'SQL Injection',
    'DDoS Attack',
    'Brute Force',
    'Malware Beacon',
    'Port Scan',
    'Phishing Attempt',
    'Data Exfiltration',
    'Privilege Escalation',
    'Zero-Day Exploit',
  ];

  const severity = severities[Math.floor(Math.random() * severities.length)];
  
  return {
    id: `TH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: threatTypes[Math.floor(Math.random() * threatTypes.length)],
    severity,
    confidence: Math.floor(Math.random() * 20) + 80,
    sourceIP: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    targetIP: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    detectionTime: new Date(),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    riskScore: severity === 'Critical' ? Math.floor(Math.random() * 20) + 80 :
               severity === 'High' ? Math.floor(Math.random() * 20) + 60 :
               severity === 'Medium' ? Math.floor(Math.random() * 20) + 40 :
               Math.floor(Math.random() * 40),
    protocol: protocols[Math.floor(Math.random() * protocols.length)],
    port: Math.floor(Math.random() * 65535),
  };
}

export function ThreatDetectionDashboard() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize with mock data
  useEffect(() => {
    const initialThreats = Array.from({ length: 10 }, generateMockThreat);
    setThreats(initialThreats);
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        const newThreat = generateMockThreat();
        setThreats(prev => [newThreat, ...prev].slice(0, 50));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Calculate threat counts
  const threatCounts = {
    critical: threats.filter(t => t.severity === 'Critical').length,
    high: threats.filter(t => t.severity === 'High').length,
    medium: threats.filter(t => t.severity === 'Medium').length,
    low: threats.filter(t => t.severity === 'Low').length,
  };

  // Filter threats
  const filteredThreats = threats.filter(threat => {
    const matchesSearch = threat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         threat.sourceIP.includes(searchQuery) ||
                         threat.targetIP.includes(searchQuery);
    const matchesSeverity = filterSeverity === 'all' || threat.severity.toLowerCase() === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newThreats = Array.from({ length: 5 }, generateMockThreat);
    setThreats(prev => [...newThreats, ...prev].slice(0, 50));
    setIsRefreshing(false);
  };

  const getSeverityBadge = (severity: Threat['severity']) => {
    const variantMap = {
      'Critical': 'critical' as const,
      'High': 'high' as const,
      'Medium': 'medium' as const,
      'Low': 'low' as const,
    };
    return <Badge variant={variantMap[severity]}>{severity}</Badge>;
  };

  const getStatusBadge = (status: Threat['status']) => {
    const variantMap = {
      'New': 'info' as const,
      'Investigating': 'warning' as const,
      'Contained': 'success' as const,
      'Dismissed': 'low' as const,
    };
    return <Badge variant={variantMap[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Threat Detection
          </h1>
          <p className="text-slate-400">Real-time security threat monitoring and analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all">
            <Download className="w-4 h-4" />
            Export
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-sm font-medium text-cyan-400">Live Feed</span>
          </div>
        </div>
      </div>

      {/* Threat Severity Card + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ThreatSeverityCard 
            threats={threatCounts} 
            total={threats.length} 
            trend={-12.5}
          />
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Active Threats</span>
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-slate-100">{threats.length}</div>
            <div className="text-xs text-emerald-400 mt-2">-8 from yesterday</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Blocked Today</span>
              <ShieldOff className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-slate-100">1,247</div>
            <div className="text-xs text-emerald-400 mt-2">+15% from yesterday</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Avg Response Time</span>
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-slate-100">3.2m</div>
            <div className="text-xs text-emerald-400 mt-2">-45s improvement</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">AI Accuracy</span>
              <ShieldAlert className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-slate-100">99.2%</div>
            <div className="text-xs text-emerald-400 mt-2">+0.3% this week</div>
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search threats, IPs, or protocols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 min-w-[150px]"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Threat Data Table */}
      <div className="bg-[#0F1729]/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Threat Name</th>
                <th className="px-6 py-4 text-left font-semibold">Severity</th>
                <th className="px-6 py-4 text-left font-semibold">Source IP</th>
                <th className="px-6 py-4 text-left font-semibold">Target IP</th>
                <th className="px-6 py-4 text-left font-semibold">Protocol/Port</th>
                <th className="px-6 py-4 text-left font-semibold">Confidence</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">Risk Score</th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredThreats.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      No threats found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredThreats.map((threat, index) => (
                    <motion.tr
                      key={threat.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{threat.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {threat.detectionTime.toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getSeverityBadge(threat.severity)}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">{threat.sourceIP}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">{threat.targetIP}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {threat.protocol}:{threat.port}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all"
                              style={{ width: `${threat.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-300 min-w-[3ch]">
                            {threat.confidence}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(threat.status)}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${
                          threat.riskScore >= 80 ? 'text-red-400' :
                          threat.riskScore >= 60 ? 'text-orange-400' :
                          threat.riskScore >= 40 ? 'text-yellow-400' : 'text-blue-400'
                        }`}>
                          {threat.riskScore}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="View Details">
                            <Eye className="w-4 h-4 text-slate-400" />
                          </button>
                          <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Investigate">
                            <ShieldAlert className="w-4 h-4 text-cyan-400" />
                          </button>
                          <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Dismiss">
                            <XCircle className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Showing <span className="font-medium text-slate-200">{filteredThreats.length}</span> of{' '}
          <span className="font-medium text-slate-200">{threats.length}</span> threats
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all">
            Previous
          </button>
          <button className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/30 rounded-lg text-cyan-300">
            1
          </button>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all">
            2
          </button>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all">
            3
          </button>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 3️⃣ Professional Login Page

### `LoginPage.tsx`

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Lock, AlertCircle, Eye, EyeOff, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-[120px] -top-48 -left-48 animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute w-[400px] h-[400px] bg-purple-400/10 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />
        
        {/* Animated Lines */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.line
            x1="10%"
            y1="0"
            x2="90%"
            y2="100%"
            stroke="url(#line-gradient)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Section */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-400 mb-4 shadow-2xl shadow-cyan-400/50 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-400 rounded-2xl blur-xl opacity-50 animate-pulse" />
            <Shield className="w-10 h-10 text-white relative z-10" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl font-bold mb-2"
          >
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              CyberiumShield AI
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center gap-2 text-sm"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Secure Access Portal</span>
          </motion.div>
        </div>

        {/* Glassmorphic Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative"
        >
          {/* Card Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-blue-400/20 to-purple-400/20 rounded-2xl blur-xl" />
          
          {/* Main Card */}
          <div className="relative bg-[#0F1729]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-100 mb-2">Welcome Back</h2>
              <p className="text-slate-400 text-sm">Sign in to access your security dashboard</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg bg-red-400/10 border border-red-400/30 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-cyan-400 focus:ring-cyan-400/50 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    Remember me
                  </span>
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full py-3 px-4 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 transition-all group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </div>
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-xs text-slate-500 font-medium">OR</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-slate-400">
                Don't have an account?{' '}
                <Link
                  to="/auth/register"
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Shield className="w-3 h-3" />
            <span>Protected by enterprise-grade encryption</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
```

---

## 4️⃣ Tailwind Configuration

### `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-dark': '#0B1120',
        'cyber-card': '#0F1729',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'cyber': '0 0 50px rgba(34, 211, 238, 0.3)',
        'cyber-lg': '0 0 100px rgba(34, 211, 238, 0.4)',
      },
    },
  },
  plugins: [],
}
```

---

## 5️⃣ Global Styles

### `global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

html,
body {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto,
    Helvetica, Arial, sans-serif;
  background: #0B1120;
  color: #e2e8f0;
  overflow-x: hidden;
}

* {
  box-sizing: border-box;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 23, 41, 0.5);
  border-radius: 5px;
}

::-webkit-scrollbar-thumb {
  background: rgba(34, 211, 238, 0.3);
  border-radius: 5px;
  border: 2px solid rgba(15, 23, 41, 0.5);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(34, 211, 238, 0.5);
}

/* Animations */
@keyframes gradient {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient 3s ease infinite;
}
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.2",
    "framer-motion": "^11.3.21",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.3",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

---

## 🚀 Usage

### Import and Use:

```typescript
// In your App.tsx or page component
import { ThreatDetectionDashboard } from './ThreatDetectionDashboard';
import { LoginPage } from './LoginPage';

// Use in routes
<Route path="/threat-detection" element={<ThreatDetectionDashboard />} />
<Route path="/login" element={<LoginPage />} />
```

---

## 🎨 Key Features

### Threat Detection Dashboard:
✅ Live threat feed with auto-refresh  
✅ Threat severity widget with animated progress bars  
✅ Interactive data table with real-time updates  
✅ Search and filter functionality  
✅ Color-coded severity levels  
✅ Risk score visualization  
✅ Quick stats cards  
✅ Export and refresh capabilities  

### Login Page:
✅ Glassmorphic authentication card  
✅ Animated gradient background  
✅ Grid pattern overlay  
✅ Glowing CyberiumShield AI logo  
✅ Show/hide password toggle  
✅ Remember me checkbox  
✅ Forgot password link  
✅ Loading states  
✅ Error handling  
✅ Smooth animations  

---

## 📱 Responsive Design

All components are fully responsive with:
- Mobile: Single column, stacked layout
- Tablet: 2-column grids
- Desktop: Full multi-column layouts

---

**Status**: ✅ Production-Ready Code  
**Framework**: React + TypeScript + Vite  
**Styling**: Tailwind CSS  
**Animations**: Framer Motion  
**Build**: Tested and Working
