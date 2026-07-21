import React from 'react';
import { Mail, Shield, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/shared/Badge';
import { DataTable } from '../../components/shared/DataTable';

const stats = [
  { title: 'Emails Scanned', value: '52,345', delta: '+2,340 Today', icon: Mail, trend: 'up' as const },
  { title: 'Phishing Detected', value: '289', delta: '+15 Today', icon: AlertTriangle, trend: 'neutral' as const, color: 'text-red-400' },
  { title: 'Blocked', value: '287', delta: '99.3%', icon: Shield, trend: 'up' as const, color: 'text-emerald-400' },
  { title: 'Reported by Users', value: '42', delta: '+8 Today', icon: Mail, trend: 'up' as const, color: 'text-cyan-400' },
];

interface PhishingAttempt {
  id: string;
  sender: string;
  subject: string;
  recipient: string;
  risk: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  status: 'blocked' | 'quarantined' | 'reported';
}

const attempts: PhishingAttempt[] = [
  { id: 'P-001', sender: 'security@paypa1.com', subject: 'Urgent: Verify Your Account', recipient: 'john@company.com', risk: 'critical', timestamp: '3m ago', status: 'blocked' },
  { id: 'P-002', sender: 'admin@microsoft-secure.net', subject: 'Password Expiration Notice', recipient: 'sarah@company.com', risk: 'high', timestamp: '15m ago', status: 'blocked' },
  { id: 'P-003', sender: 'noreply@invoice-payment.com', subject: 'Invoice #12345 Payment Required', recipient: 'finance@company.com', risk: 'high', timestamp: '28m ago', status: 'quarantined' },
  { id: 'P-004', sender: 'hr@job-offer.biz', subject: 'Job Opportunity - Senior Position', recipient: 'michael@company.com', risk: 'medium', timestamp: '1h ago', status: 'reported' },
  { id: 'P-005', sender: 'support@cloud-storage.info', subject: 'File Shared With You', recipient: 'emily@company.com', risk: 'medium', timestamp: '2h ago', status: 'blocked' },
];

export function PhishingPage() {
  const columns = [
    { header: 'ID', accessor: 'id' as keyof PhishingAttempt, className: 'font-mono' },
    { header: 'Sender', accessor: 'sender' as keyof PhishingAttempt, className: 'font-mono text-xs' },
    { header: 'Subject', accessor: 'subject' as keyof PhishingAttempt },
    { header: 'Recipient', accessor: 'recipient' as keyof PhishingAttempt, className: 'font-mono text-xs' },
    {
      header: 'Risk Level',
      accessor: (row: PhishingAttempt) => <Badge variant={row.risk}>{row.risk}</Badge>,
    },
    { header: 'Time', accessor: 'timestamp' as keyof PhishingAttempt },
    {
      header: 'Status',
      accessor: (row: PhishingAttempt) => {
        const variants = {
          blocked: 'success' as const,
          quarantined: 'warning' as const,
          reported: 'info' as const,
        };
        return <Badge variant={variants[row.status]}>{row.status}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Phishing Detection</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor and block phishing attempts</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/30">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">Protection Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <DataTable columns={columns} data={attempts} onRowClick={(row) => console.log('View attempt:', row.id)} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Common Phishing Tactics</h3>
          <div className="space-y-3">
            {[
              { tactic: 'Brand Impersonation', count: 142, icon: '🎭' },
              { tactic: 'Urgency/Scarcity', count: 89, icon: '⏰' },
              { tactic: 'Authority Claims', count: 67, icon: '👮' },
              { tactic: 'Suspicious Links', count: 234, icon: '🔗' },
              { tactic: 'Attachment Threats', count: 45, icon: '📎' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.tactic}</p>
                    <p className="text-xs text-slate-400">{item.count} detected this month</p>
                  </div>
                </div>
                <Badge variant="info">{item.count}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Top Targeted Users</h3>
          <div className="space-y-3">
            {[
              { user: 'finance@company.com', attempts: 45, department: 'Finance' },
              { user: 'hr@company.com', attempts: 38, department: 'HR' },
              { user: 'admin@company.com', attempts: 32, department: 'IT' },
              { user: 'ceo@company.com', attempts: 28, department: 'Executive' },
              { user: 'support@company.com', attempts: 24, department: 'Support' },
            ].map((target, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200 font-mono">{target.user}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{target.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400 font-semibold">{target.attempts} attempts</span>
                  <Badge variant="critical">High Risk</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
