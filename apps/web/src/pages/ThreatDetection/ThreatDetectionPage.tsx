import React, { useState, useEffect } from 'react';
import { Eye, ShieldAlert, ShieldOff, XCircle, Zap, Scan } from 'lucide-react';
import { ThreatScanner } from '../../components/ThreatScanner/ThreatScanner';

// --- Reusable Components ---

// Badge component for consistent styling
const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${className}`}>
    {children}
  </span>
);

const getSeverityBadge = (severity: 'Critical' | 'High' | 'Medium' | 'Low') => {
  switch (severity) {
    case 'Critical':
      return <Badge className="bg-danger/20 text-red-300">Critical</Badge>;
    case 'High':
      return <Badge className="bg-warning/20 text-orange-300">High</Badge>;
    case 'Medium':
      return <Badge className="bg-yellow-500/20 text-yellow-300">Medium</Badge>;
    default:
      return <Badge className="bg-accent/20 text-cyan-300">Low</Badge>;
  }
};

const getStatusBadge = (status: 'New' | 'Investigating' | 'Contained' | 'Dismissed') => {
    switch (status) {
      case 'New':
        return <Badge className="bg-primary/20 text-blue-300">New</Badge>;
      case 'Investigating':
        return <Badge className="bg-purple-500/20 text-purple-300">Investigating</Badge>;
      case 'Contained':
        return <Badge className="bg-success/20 text-green-300">Contained</Badge>;
      default:
        return <Badge className="bg-slate-600/50 text-slate-400">Dismissed</Badge>;
    }
  };

// --- Mock Data ---

type Threat = {
  id: string;
  name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  source: string;
  target: string;
  detectionTime: Date;
  status: 'New' | 'Investigating' | 'Contained' | 'Dismissed';
  riskScore: number;
};

const initialThreats: Threat[] = [
    { id: 'th_001', name: 'Ransomware (WannaCry)', severity: 'Critical', confidence: 98, source: '192.168.1.10', target: 'FS-01', detectionTime: new Date(), status: 'New', riskScore: 95 },
    { id: 'th_002', name: 'SQL Injection Attempt', severity: 'High', confidence: 95, source: '203.0.113.45', target: 'WEB-SRV-02', detectionTime: new Date(Date.now() - 60000 * 5), status: 'Investigating', riskScore: 88 },
    { id: 'th_003', name: 'Phishing Link Clicked', severity: 'Medium', confidence: 100, source: 'user@company.com', target: 'WKSTN-102', detectionTime: new Date(Date.now() - 60000 * 10), status: 'Contained', riskScore: 65 },
    { id: 'th_004', name: 'Anomalous Port Scan', severity: 'Low', confidence: 70, source: '10.0.5.23', target: 'DMZ-FW-01', detectionTime: new Date(Date.now() - 60000 * 15), status: 'Dismissed', riskScore: 30 },
];

const potentialNewThreats: Omit<Threat, 'id' | 'detectionTime'>[] = [
    { name: 'Brute Force (SSH)', severity: 'High', confidence: 92, source: '172.16.31.98', target: 'AUTH-SRV-01', status: 'New', riskScore: 85 },
    { name: 'Malware Beaconing (C2)', severity: 'Critical', confidence: 99, source: '10.1.1.42', target: 'api.evil.com', status: 'New', riskScore: 98 },
    { name: 'Suspicious PowerShell', severity: 'Medium', confidence: 85, source: 'WKSTN-078', target: 'DomainController', status: 'New', riskScore: 72 },
    { name: 'Data Exfiltration', severity: 'Critical', confidence: 90, source: 'DB-SRV-03', target: '185.12.55.100', status: 'New', riskScore: 96 },
];

// --- Page Component ---

export function ThreatDetectionPage() {
    const [threats, setThreats] = useState<Threat[]>(initialThreats);
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const newThreatSource = potentialNewThreats[Math.floor(Math.random() * potentialNewThreats.length)];
            const newThreat: Threat = {
                ...newThreatSource,
                id: `th_${Date.now()}`,
                detectionTime: new Date(),
            };
            // Add new threat to the top and limit the list size to avoid performance issues
            setThreats(prevThreats => [newThreat, ...prevThreats].slice(0, 100));
        }, 5000); // Add a new threat every 5 seconds

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);


  return (
    <div className="p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-100">Threat Detection</h1>
                <p className="text-sm text-slate-400 mt-1">Real-time threat monitoring and URL/Email scanning</p>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setShowScanner(!showScanner)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        showScanner
                            ? 'bg-cyan-400/20 border border-cyan-400/30 text-cyan-300'
                            : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                >
                    <Scan className="w-4 h-4" />
                    {showScanner ? 'Hide Scanner' : 'Scan URL/Email'}
                </button>
                <div className="flex items-center space-x-2 text-sm text-accent px-4 py-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
                    <Zap className="animate-pulse" size={16} />
                    <span>Live Feed</span>
                </div>
            </div>
        </div>

        {/* Threat Scanner */}
        {showScanner && <ThreatScanner />}

      <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-card/60">
              <tr>
                <th scope="col" className="px-6 py-3">Threat Name</th>
                <th scope="col" className="px-6 py-3">Severity</th>
                <th scope="col" className="px-6 py-3">Confidence</th>
                <th scope="col" className="px-6 py-3">Source</th>
                <th scope="col" className="px-6 py-3">Target</th>
                <th scope="col" className="px-6 py-3">Detection Time</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3 text-center">Risk Score</th>
                <th scope="col" className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {threats.map((threat) => (
                <tr key={threat.id} className="border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors duration-150">
                  <td className="px-6 py-4 font-medium text-slate-100 whitespace-nowrap">{threat.name}</td>
                  <td className="px-6 py-4">{getSeverityBadge(threat.severity)}</td>
                  <td className="px-6 py-4">{threat.confidence}%</td>
                  <td className="px-6 py-4 font-mono text-xs">{threat.source}</td>
                  <td className="px-6 py-4 font-mono text-xs">{threat.target}</td>
                  <td className="px-6 py-4">{threat.detectionTime.toLocaleTimeString()}</td>
                  <td className="px-6 py-4">{getStatusBadge(threat.status)}</td>
                  <td className="px-6 py-4 text-center font-semibold">{threat.riskScore}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-1">
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-primary transition-colors" title="View"><Eye size={16} /></button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-accent transition-colors" title="Investigate"><ShieldAlert size={16} /></button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-success transition-colors" title="Contain"><ShieldOff size={16} /></button>
                        <button className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-danger transition-colors" title="Dismiss"><XCircle size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}