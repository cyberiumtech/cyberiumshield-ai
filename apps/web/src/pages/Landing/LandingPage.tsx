import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent p-8">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/20">
            <Shield className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
              CyberiumShield AI
            </h1>
            <p className="text-sm text-slate-400">
              Enterprise-grade threat detection, vulnerability management, and AI-assisted incident response.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-[#1E293B]/40 p-4">
            <div className="flex items-center gap-2 text-cyan-300">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-medium">AI Detections</p>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Mock threat intelligence and predictions to visualize enterprise workflows.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#1E293B]/40 p-4">
            <p className="text-sm font-medium text-slate-100">Operational Dashboards</p>
            <p className="mt-2 text-sm text-slate-300">
              Security score, incidents, alerts, and risk distribution charts.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#1E293B]/40 p-4">
            <p className="text-sm font-medium text-slate-100">API Ready</p>
            <p className="mt-2 text-sm text-slate-300">
              Swap mock data with Laravel REST APIs later via Axios + React Query.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-slate-300">
          <span className="text-cyan-300 font-medium">Next:</span> Build out Dashboard, Security Center, Threat Detection,
          Vulnerability Management, Threat Intelligence, Malware/Phishing, Logs, Reports, Admin, and the AI Assistant chat.
        </div>
      </div>
    </div>
  );
}

