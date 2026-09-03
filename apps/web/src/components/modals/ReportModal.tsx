import React, { useState } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [reportType, setReportType] = useState('security-summary');
  const [format, setFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState('last-7-days');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    // Simulate report generation
    console.log('Generating report:', { reportType, format, dateRange });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // TODO: Implement actual report generation logic
    alert(`Report generated successfully!\nType: ${reportType}\nFormat: ${format}\nDate Range: ${dateRange}`);

    setIsGenerating(false);
    onClose();
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0F1729] border border-white/10 rounded-xl shadow-2xl z-50"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-400/10 rounded-lg">
                  <FileText className="h-5 w-5 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-slate-100">Generate Report</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="p-6 space-y-4">
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
                  <option value="excel">Excel (XLSX)</option>
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

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isGenerating}
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
