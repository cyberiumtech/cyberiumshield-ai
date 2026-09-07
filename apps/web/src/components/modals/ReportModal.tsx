import React, { useState } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface ReportAlert {
  title: string;
  severity: string;
  status: string;
  timestamp: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts?: ReportAlert[];
}

const defaultAlerts: ReportAlert[] = [
  { title: 'Security summary requested', severity: 'info', status: 'ready', timestamp: new Date().toLocaleString() },
];

export function ReportModal({ isOpen, onClose, alerts = defaultAlerts }: ReportModalProps) {
  const [reportType, setReportType] = useState('security-summary');
  const [format, setFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState('last-7-days');
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadFile = (content: BlobPart, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const reportName = `cybershield-${reportType}-${dateRange}`;
      const rows = alerts.map((alert) => [alert.title, alert.severity, alert.status, alert.timestamp]);
      const csv = [
        ['Title', 'Severity', 'Status', 'Time'],
        ...rows,
      ].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
      const reportJson = JSON.stringify({ reportType, dateRange, generatedAt: new Date().toISOString(), alerts }, null, 2);

      if (format === 'csv') {
        downloadFile(csv, `${reportName}.csv`, 'text/csv;charset=utf-8');
      } else if (format === 'json') {
        downloadFile(reportJson, `${reportName}.json`, 'application/json');
      } else {
        const pdf = new jsPDF();
        pdf.setFontSize(16);
        pdf.text('cybershield AI Security Report', 20, 20);
        pdf.setFontSize(10);
        pdf.text(`Type: ${reportType} | Range: ${dateRange}`, 20, 30);
        alerts.forEach((alert, index) => {
          const y = 45 + index * 18;
          pdf.text(`${index + 1}. ${alert.title}`, 20, y);
          pdf.text(`Severity: ${alert.severity} | Status: ${alert.status} | ${alert.timestamp}`, 26, y + 7);
        });
        pdf.save(`${reportName}.pdf`);
      }

      toast.success('Report downloaded successfully');
      onClose();
    } catch {
      toast.error('Unable to generate the report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="generate-report-title"
            className="fixed left-1/2 top-1/2 z-[61] max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-white/10 bg-[#0F1729] shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-400/10 rounded-lg">
                  <FileText className="h-5 w-5 text-green-400" />
                </div>
                <h2 id="generate-report-title" className="text-lg font-semibold text-slate-100 sm:text-xl">Generate Report</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close report dialog"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4 p-4 sm:p-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="security-summary">Security Summary</option>
                  <option value="threat-analysis">Threat Analysis</option>
                  <option value="vulnerability-assessment">Vulnerability Assessment</option>
                  <option value="compliance">Compliance Report</option>
                  <option value="incident-log">Incident Log</option>
                  <option value="audit-trail">Audit Trail</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="today">Today</option>
                  <option value="last-7-days">Last 7 Days</option>
                  <option value="last-30-days">Last 30 Days</option>
                  <option value="last-90-days">Last 90 Days</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
                <button
                  type="submit"
                  disabled={isGenerating}
                  aria-busy={isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-400/10 hover:bg-green-400/20 border border-green-400/30 rounded-lg text-green-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
