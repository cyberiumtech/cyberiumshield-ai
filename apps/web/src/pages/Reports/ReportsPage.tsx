import React from 'react';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { Badge } from '../../components/shared/Badge';

const reports = [
  {
    id: '1',
    title: 'Weekly Security Summary',
    type: 'Summary',
    generated: '2024-07-20',
    size: '2.4 MB',
    status: 'ready',
    description: 'Comprehensive overview of security events and threats from the past week',
  },
  {
    id: '2',
    title: 'Vulnerability Assessment Report',
    type: 'Assessment',
    generated: '2024-07-19',
    size: '5.8 MB',
    status: 'ready',
    description: 'Detailed analysis of identified vulnerabilities with remediation recommendations',
  },
  {
    id: '3',
    title: 'Incident Response Report',
    type: 'Incident',
    generated: '2024-07-18',
    size: '1.2 MB',
    status: 'ready',
    description: 'Documentation of security incidents and response actions taken',
  },
  {
    id: '4',
    title: 'Compliance Audit Report',
    type: 'Compliance',
    generated: '2024-07-15',
    size: '3.6 MB',
    status: 'ready',
    description: 'Assessment of compliance with ISO 27001, SOC 2, and GDPR standards',
  },
  {
    id: '5',
    title: 'Threat Intelligence Report',
    type: 'Intelligence',
    generated: '2024-07-14',
    size: '4.2 MB',
    status: 'ready',
    description: 'Analysis of emerging threats and attack patterns in the threat landscape',
  },
];

const templates = [
  { name: 'Executive Summary', description: 'High-level overview for stakeholders', icon: TrendingUp },
  { name: 'Technical Analysis', description: 'Detailed technical security report', icon: FileText },
  { name: 'Compliance Report', description: 'Regulatory compliance documentation', icon: Calendar },
  { name: 'Custom Report', description: 'Build your own custom report', icon: FileText },
];

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Reports</h1>
          <p className="text-sm text-slate-400 mt-1">Generate and manage security reports</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 rounded-lg text-cyan-300 transition-all">
          <FileText className="w-4 h-4" />
          Create New Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Report Templates</h3>
          <div className="space-y-3">
            {templates.map((template, index) => {
              const Icon = template.icon;
              return (
                <button
                  key={index}
                  className="w-full flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-cyan-400/10">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{template.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{template.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            {[
              { label: 'Reports Generated', value: '127', change: '+12%' },
              { label: 'Total Size', value: '245 MB', change: '+8 MB' },
              { label: 'Last Generated', value: 'Today', change: '2 hours ago' },
              { label: 'Scheduled Reports', value: '8', change: '3 pending' },
            ].map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                  <p className="text-lg font-semibold text-slate-200 mt-1">{stat.value}</p>
                </div>
                <span className="text-xs text-emerald-400">{stat.change}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Recent Reports</h3>
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="p-2 rounded-lg bg-cyan-400/10">
                  <FileText className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-slate-200">{report.title}</p>
                    <Badge variant="info">{report.type}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">{report.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Generated: {report.generated}</span>
                    <span>•</span>
                    <span>Size: {report.size}</span>
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition-all">
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
