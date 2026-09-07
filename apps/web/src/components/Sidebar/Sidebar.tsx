import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '../AdminRoute/AdminRoute';

const items: Array<{ label: string; path: string; adminOnly?: boolean }> = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Security Center', path: '/security-center' },
  { label: 'Network Monitoring', path: '/network' },
  { label: 'Vulnerability Management', path: '/vulnerability' },
  { label: 'Threat Intelligence', path: '/threat-intelligence' },
  { label: 'Malware Detection', path: '/malware' },
  { label: 'Phishing Detection', path: '/phishing' },
  { label: 'Email Spam Detector', path: '/email-spam' },
  { label: 'Logs', path: '/logs' },
  { label: 'Incidents', path: '/incidents' },
  { label: 'Reports', path: '/reports' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'AI Assistant', path: '/ai-assistant' },
  { label: 'Administration', path: '/admin', adminOnly: true },
];

export function Sidebar({ activePath, mobile = false }: { activePath: string; mobile?: boolean }) {
  const { user } = useAuth();
  const visibleItems = items.filter(item => !item.adminOnly || isAdminRole(user?.role));
  return (
    <nav
      className={`${mobile ? 'h-auto px-0 py-0' : 'h-[calc(100vh-72px)] sticky top-[72px] overflow-y-auto px-4 py-4'}`}
    >
      <div className="space-y-2">
        {visibleItems.map(it => {
          // Use `startsWith` for parent paths to remain active on child routes,
          // but use an exact match for the main dashboard link.
          const active =
            it.path === '/dashboard' ? activePath === it.path : activePath.startsWith(it.path);
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
