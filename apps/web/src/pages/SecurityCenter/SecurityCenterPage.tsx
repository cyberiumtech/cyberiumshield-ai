import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Eye, FileText } from 'lucide-react';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/shared/Badge';
import { DataTable } from '../../components/shared/DataTable';

const stats = [
  { title: 'Security Posture', value: '92/100', delta: '+3 pts', icon: Shield, trend: 'up' as const, color: 'text-emerald-400' },
  { title: 'Open Alerts', value: '23', delta: '-5 Today', icon: AlertTriangle, trend: 'down' as const, color: 'text-yellow-400' },
  { title: 'Compliant Systems', value: '98.5%', delta: '+0.3%', icon: CheckCircle, trend: 'up' as const, color: 'text-emerald-400' },
  { title: 'Policy Violations', value: '7', delta: '-2 Today', icon: XCircle, trend: 'down' as const, color: 'text-red-400' },
];

interface SecurityAlert {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  affected: string;
  timestamp: string;
  status: 'new' | 'investigating' | 'resolved';
  assignee?: string;
}

const alerts: SecurityAlert[] = [
  {
    id: 'SEC-001',
    title: 'Unauthorized Access Attempt',
    severity: 'critical',
    category: 'Access Control',
    affected: 'Admin Portal',
    timestamp: '2 minutes ago',
    status: 'new',
  },
  {
    id: 'SEC-002',
    title: 'Firewall Rule Misconfiguration',
    severity: 'high',
    category: 'Network Security',
    affected: 'DMZ Firewall',
    timestamp: '15 minutes ago',
    status: 'investigating',
    assignee: 'J. Anderson',
  },
  {
    id: 'SEC-003',
    title: 'Weak Password Detected',
    severity: 'medium',
    category: 'Identity & Access',
    affected: 'user@example.com',
    timestamp: '1 hour ago',
    status: 'investigating',
    assignee: 'M. Smith',
  },
  {
    id: 'SEC-004',
    title: 'SSL Certificate Expiring Soon',
    severity: 'low',
    category: 'Certificates',
    affected: 'api.company.com',
    timestamp: '3 hours ago',
    status: 'new',
  },
  {
    id: 'SEC-005',
    title: 'Suspicious File Upload',
    severity: 'high',
    category: 'Data Security',
    affected: 'File Server 02',
    timestamp: '5 hours ago',
    status: 'resolved',
    assignee: 'K. Johnson',
  },
];

const policyCategories = [
  { name: 'Access Control', compliant: 145, total: 150, score: 97 },
  { name: 'Data Protection', compliant: 88, total: 90, score: 98 },
  { name: 'Network Security', compliant: 200, total: 205, score: 98 },
  { name: 'Encryption', compliant: 95, total: 100, score: 95 },
  { name: 'Audit & Logging', compliant: 75, total: 80, score: 94 },
];

export function SecurityCenterPage() {
  const [selectedTab, setSelectedTab] = useState<'alerts' | 'policies' | 'compliance'>('alerts');

  const columns = [
    { header: 'Alert ID', accessor: 'id' as keyof SecurityAlert, className: 'font-mono' },
    { header: 'Title', accessor: 'title' as keyof SecurityAlert },
    {
      header: 'Severity',
      accessor: (row: SecurityAlert) => <Badge variant={row.severity}>{row.severity}</Badge>,
    },
    { header: 'Category', accessor: 'category' as keyof SecurityAlert },
    { header: 'Affected', accessor: 'affected' as keyof SecurityAlert, className: 'font-mono text-xs' },
    { header: 'Time', accessor: 'timestamp' as keyof SecurityAlert },
    {
      header: 'Status',
      accessor: (row: SecurityAlert) => {
        const variants = {
          new: 'info' as const,
          investigating: 'warning' as const,
          resolved: 'success' as const,
        };
        return <Badge variant={variants[row.status]}>{row.status}</Badge>;
      },
    },
    {
      header: 'Actions',
      accessor: (row: SecurityAlert) => (
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
            <FileText className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'text-center',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Security Center</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor security alerts, policies, and compliance status</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 rounded-lg text-cyan-300 transition-all">
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10">
        {[
          { id: 'alerts' as const, label: 'Security Alerts', count: 23 },
          { id: 'policies' as const, label: 'Policy Compliance', count: 5 },
          { id: 'compliance' as const, label: 'Compliance Score', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-all relative ${
              selectedTab === tab.id
                ? 'text-cyan-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-cyan-400/10 text-cyan-400">
                {tab.count}
              </span>
            )}
            {selectedTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {selectedTab === 'alerts' && (
        <div>
          <DataTable columns={columns} data={alerts} onRowClick={(row) => console.log('View alert:', row.id)} />
        </div>
      )}

      {selectedTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {policyCategories.map((category) => (
            <div
              key={category.name}
              className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-200">{category.name}</h3>
                <span className={`text-2xl font-bold ${
                  category.score >= 95 ? 'text-emerald-400' :
                  category.score >= 90 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {category.score}%
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Compliant</span>
                  <span className="text-slate-200 font-medium">{category.compliant} / {category.total}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      category.score >= 95 ? 'bg-emerald-400' :
                      category.score >= 90 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${category.score}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{category.total - category.compliant} non-compliant</span>
                  <button className="text-cyan-400 hover:text-cyan-300">View Details →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTab === 'compliance' && (
        <div className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-emerald-400/10 border-4 border-emerald-400/30 mb-4">
              <span className="text-4xl font-bold text-emerald-400">92</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2">Overall Compliance Score</h3>
            <p className="text-sm text-slate-400">Your organization meets 92% of security standards</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { framework: 'ISO 27001', score: 94, status: 'Compliant' },
              { framework: 'SOC 2', score: 91, status: 'Compliant' },
              { framework: 'GDPR', score: 89, status: 'Needs Attention' },
            ].map((framework) => (
              <div key={framework.framework} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h4 className="text-sm font-semibold text-slate-200 mb-2">{framework.framework}</h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-cyan-400">{framework.score}%</span>
                  <Badge variant={framework.score >= 90 ? 'success' : 'warning'}>
                    {framework.status}
                  </Badge>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-500"
                    style={{ width: `${framework.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
