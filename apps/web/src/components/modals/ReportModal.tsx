import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, FileJson, FileSpreadsheet, FileText, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

export interface ReportFinding {
  id: string;
  source: string;
  title: string;
  detail: string;
  severity: string;
  status: string;
  timestamp: string | null;
}

export interface ReportSource {
  key: string;
  label: string;
  status: string;
  updatedAt: string | null;
  recordCount: number | null;
  provenance: string;
}

export interface SecurityReportData {
  sources: ReportSource[];
  findings: ReportFinding[];
  metrics: Array<{ label: string; value: string }>;
  lastSync: string | null;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SecurityReportData;
  onGenerated?: (artifact: { name: string; format: string; generatedAt: string }) => void;
}

const reportTypes = {
  'security-summary': { label: 'Security evidence summary', description: 'Posture metrics, source health, provenance, and validated findings.' },
  'finding-ledger': { label: 'Finding ledger', description: 'A chronological export of normalized findings and their source provenance.' },
  'source-audit': { label: 'Source audit trail', description: 'Connection state, freshness, record counts, and collection provenance.' },
} as const;

const ranges = {
  today: { label: 'Today', days: 1 },
  'last-7-days': { label: 'Last 7 days', days: 7 },
  'last-30-days': { label: 'Last 30 days', days: 30 },
  'last-90-days': { label: 'Last 90 days', days: 90 },
  'all-available': { label: 'All available evidence', days: null },
} as const;

type ReportType = keyof typeof reportTypes;
type DateRange = keyof typeof ranges;
type Format = 'pdf' | 'csv' | 'json';

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadFile(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function inDateRange(timestamp: string | null, dateRange: DateRange) {
  if (ranges[dateRange].days === null) return true;
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  return Number.isFinite(time) && time >= Date.now() - ranges[dateRange].days * 86_400_000;
}

function createPdf(data: SecurityReportData, findings: ReportFinding[], reportType: ReportType, dateRange: DateRange, generatedAt: string) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 16;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const lineWidth = pageWidth - margin * 2;
  let y = margin;

  const addLines = (text: string, size = 9, gap = 4.5, color: [number, number, number] = [40, 51, 68]) => {
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, lineWidth) as string[];
    for (const line of lines) {
      if (y + gap > pageHeight - margin) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += gap;
    }
  };
  const section = (label: string) => {
    if (y > pageHeight - 28) { pdf.addPage(); y = margin; }
    y += 4;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 7;
    addLines(label.toUpperCase(), 9, 5, [8, 145, 178]);
  };

  pdf.setFillColor(11, 17, 32);
  pdf.rect(0, 0, pageWidth, 35, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(19);
  pdf.text('CyberShield AI', margin, 15);
  pdf.setFontSize(11);
  pdf.text(reportTypes[reportType].label, margin, 24);
  y = 44;
  addLines(`Generated: ${new Date(generatedAt).toLocaleString()}  |  Range: ${ranges[dateRange].label}`);
  addLines(`Evidence sync: ${data.lastSync ? new Date(data.lastSync).toLocaleString() : 'Not available'}`);
  addLines('Integrity note: unavailable values are excluded and are never estimated.', 9, 5, [71, 85, 105]);

  if (reportType === 'security-summary') {
    section('Validated metrics');
    data.metrics.forEach(metric => addLines(`${metric.label}: ${metric.value}`));
  }
  if (reportType !== 'finding-ledger') {
    section('Source health & provenance');
    data.sources.forEach(source => addLines(`${source.label} | ${source.status.toUpperCase()} | Records: ${source.recordCount ?? 'not exposed'} | Checked: ${source.updatedAt ? new Date(source.updatedAt).toLocaleString() : 'unavailable'} | ${source.provenance}`));
  }
  if (reportType !== 'source-audit') {
    section(`Validated findings (${findings.length})`);
    if (!findings.length) addLines('No findings with a usable timestamp were available in the selected range.');
    findings.forEach((finding, index) => {
      addLines(`${index + 1}. [${finding.severity.toUpperCase()}] ${finding.title}`, 9, 4.5, [15, 23, 42]);
      addLines(`${finding.source} | ${finding.status} | ${finding.timestamp ? new Date(finding.timestamp).toLocaleString() : 'time unavailable'}`, 8, 4, [71, 85, 105]);
      if (finding.detail) addLines(finding.detail, 8, 4, [71, 85, 105]);
      y += 2;
    });
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`CYBERSHIELD EVIDENCE EXPORT  |  PAGE ${page} OF ${pages}`, margin, pageHeight - 7);
  }
  return pdf;
}

export function ReportModal({ isOpen, onClose, data, onGenerated }: ReportModalProps) {
  const [reportType, setReportType] = useState<ReportType>('security-summary');
  const [format, setFormat] = useState<Format>('pdf');
  const [dateRange, setDateRange] = useState<DateRange>('last-30-days');
  const [isGenerating, setIsGenerating] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isGenerating) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isGenerating, isOpen, onClose]);

  const scopedFindings = data.findings.filter(finding => inDateRange(finding.timestamp, dateRange));
  const included = reportType === 'source-audit' ? `${data.sources.length} source attestations` : `${scopedFindings.length} findings and ${data.sources.length} source attestations`;

  const handleGenerate = (event: React.FormEvent) => {
    event.preventDefault();
    setIsGenerating(true);
    const generatedAt = new Date().toISOString();
    const stem = `cybershield-${reportType}-${generatedAt.slice(0, 10)}`;
    try {
      const report = {
        metadata: { title: reportTypes[reportType].label, reportType, dateRange, dateRangeLabel: ranges[dateRange].label, generatedAt, lastSuccessfulSync: data.lastSync, integrityNote: 'Unavailable values are excluded and never estimated.' },
        metrics: reportType === 'security-summary' ? data.metrics : [],
        sources: reportType === 'finding-ledger' ? [] : data.sources,
        findings: reportType === 'source-audit' ? [] : scopedFindings,
      };
      if (format === 'json') {
        downloadFile(JSON.stringify(report, null, 2), `${stem}.json`, 'application/json;charset=utf-8');
      } else if (format === 'csv') {
        const rows: unknown[][] = [['Report', reportTypes[reportType].label], ['Generated at', generatedAt], ['Date range', ranges[dateRange].label], ['Last sync', data.lastSync ?? 'Unavailable'], ['Integrity note', 'Unavailable values are excluded and never estimated.'], []];
        if (reportType === 'security-summary') rows.push(['METRICS'], ['Metric', 'Value'], ...data.metrics.map(metric => [metric.label, metric.value]), []);
        if (reportType !== 'finding-ledger') rows.push(['SOURCE HEALTH'], ['Source', 'Status', 'Last checked', 'Record count', 'Provenance'], ...data.sources.map(source => [source.label, source.status, source.updatedAt ?? '', source.recordCount ?? '', source.provenance]), []);
        if (reportType !== 'source-audit') rows.push(['FINDINGS'], ['ID', 'Source', 'Severity', 'Status', 'Title', 'Detail', 'Timestamp'], ...scopedFindings.map(finding => [finding.id, finding.source, finding.severity, finding.status, finding.title, finding.detail, finding.timestamp ?? '']));
        downloadFile(`\uFEFF${rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')}`, `${stem}.csv`, 'text/csv;charset=utf-8');
      } else {
        createPdf(data, scopedFindings, reportType, dateRange, generatedAt).save(`${stem}.pdf`);
      }
      onGenerated?.({ name: reportTypes[reportType].label, format: format.toUpperCase(), generatedAt });
      toast.success(`${format.toUpperCase()} report downloaded`, { description: included });
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Unable to generate report', { description: 'The evidence remains unchanged. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && <>
        <motion.button type="button" aria-label="Close report builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isGenerating && onClose()} className="fixed inset-0 z-[60] cursor-default bg-slate-950/75 backdrop-blur-sm" />
        <motion.section initial={{ opacity: 0, scale: 0.98, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 16 }} role="dialog" aria-modal="true" aria-labelledby="report-builder-title" className="fixed left-1/2 top-1/2 z-[61] max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-5 py-5 sm:px-7">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-500">Audit-ready export</p><h2 id="report-builder-title" className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">Build evidence report</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Export only the records currently available to Security Center.</p></div>
            <button ref={closeButtonRef} type="button" onClick={onClose} disabled={isGenerating} aria-label="Close report dialog" className="p-2 text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-40"><X className="h-5 w-5" /></button>
          </header>
          <form onSubmit={handleGenerate} className="p-5 sm:p-7">
            <fieldset><legend className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Report scope</legend><div className="mt-3 grid gap-2">{Object.entries(reportTypes).map(([key, item]) => <label key={key} className={`cursor-pointer border p-4 transition ${reportType === key ? 'border-cyan-400/60 bg-cyan-400/[0.07]' : 'border-[var(--border-color)] hover:border-cyan-400/30'}`}><input type="radio" name="report-type" value={key} checked={reportType === key} onChange={() => setReportType(key as ReportType)} className="sr-only" /><span className="flex items-start gap-3"><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center border ${reportType === key ? 'border-cyan-400 bg-cyan-400' : 'border-slate-500'}`}>{reportType === key && <CheckCircle2 className="h-3 w-3 text-slate-950" />}</span><span><span className="block text-sm font-semibold text-[var(--text-primary)]">{item.label}</span><span className="mt-1 block text-xs leading-relaxed text-[var(--text-secondary)]">{item.description}</span></span></span></label>)}</div></fieldset>
            <div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Date range<select value={dateRange} onChange={event => setDateRange(event.target.value as DateRange)} className="mt-2 w-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[var(--text-primary)] outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400">{Object.entries(ranges).map(([key, range]) => <option key={key} value={key}>{range.label}</option>)}</select></label><fieldset><legend className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">File format</legend><div className="mt-2 grid grid-cols-3 gap-2">{([{ key: 'pdf', Icon: FileText }, { key: 'csv', Icon: FileSpreadsheet }, { key: 'json', Icon: FileJson }] as const).map(({ key, Icon }) => <label key={key} className={`cursor-pointer border px-2 py-2.5 text-center text-xs font-semibold uppercase transition ${format === key ? 'border-cyan-400/60 bg-cyan-400/[0.08] text-cyan-400' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-cyan-400/30'}`}><input className="sr-only" type="radio" name="format" value={key} checked={format === key} onChange={() => setFormat(key)} /><Icon className="mx-auto mb-1 h-4 w-4" />{key}</label>)}</div></fieldset></div>
            <div className="mt-6 border-l-2 border-cyan-400 bg-cyan-400/[0.05] px-4 py-3"><p className="text-xs font-semibold text-[var(--text-primary)]">Export contents</p><p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{included}. Missing values remain explicitly unavailable; no estimates are inserted.</p></div>
            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--border-color)] pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isGenerating} className="min-h-11 border border-[var(--border-color)] px-5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-40">Cancel</button><button type="submit" disabled={isGenerating} aria-busy={isGenerating} className="inline-flex min-h-11 items-center justify-center gap-2 bg-cyan-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-60"><Download className={`h-4 w-4 ${isGenerating ? 'animate-bounce' : ''}`} />{isGenerating ? 'Preparing export…' : `Download ${format.toUpperCase()}`}</button></div>
          </form>
        </motion.section>
      </>}
    </AnimatePresence>
  );
}
