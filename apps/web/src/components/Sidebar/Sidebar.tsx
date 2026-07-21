import React from 'react';
import { Link } from 'react-router-dom';

const items: Array<{ label: string; path: string }> = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Security Center', path: '/security-center' },
  { label: 'Threat Detection', path: '/threat-detection' },
  { label: 'Network Monitoring', path: '/network' },
  { label: 'Vulnerability Management', path: '/vulnerability' },
  { label: 'Threat Intelligence', path: '/threat-intelligence' },
  { label: 'Malware Detection', path: '/malware' },
  { label: 'Phishing Detection', path: '/phishing' },
  { label: 'Logs', path: '/logs' },
  { label: 'Incidents', path: '/incidents' },
  { label: 'Reports', path: '/reports' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'AI Assistant', path: '/ai-assistant' },
  { label: 'Administration', path: '/users' },
];

export function Sidebar({ activePath }: { activePath: string }) {
  return (
    <nav className="h-[calc(100vh-72px)] sticky top-[72px] overflow-y-auto px-4 py-4">
      <div className="space-y-2">
        {items.map((it) => {
          // Use `startsWith` for parent paths to remain active on child routes,
          // but use an exact match for the main dashboard link.
          const active = it.path === '/dashboard' ? activePath === it.path : activePath.startsWith(it.path);
          return (
            <Link
              key={it.path}
              to={it.path}
              className={
                'block rounded-xl px-3 py-2 text-sm border transition ' +
                (active
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                  : 'border-transparent text-slate-300 hover:bg-white/5 hover:border-white/10')
              }
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
