import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // Adjust path as needed
import { isAdminRole } from '../AdminRoute/AdminRoute'; // Adjust path as needed
import {
  LayoutDashboard,
  ShieldCheck,
  Activity,
  ShieldAlert,
  Radar,
  Bug,
  Fish,
  MailWarning,
  Siren,
  LineChart,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────────── */
interface SidebarItem {
  label: string;
  path: string;
  adminOnly?: boolean;
  icon: React.ElementType;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

/* ─────────────────────────────────────────────────────────────
   NAVIGATION — grouped by function
   ───────────────────────────────────────────────────────────── */
const sections: SidebarSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Security Center', path: '/security-center', icon: ShieldCheck },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Network Monitoring', path: '/network', icon: Activity },
      { label: 'Vulnerability Management', path: '/vulnerability', icon: ShieldAlert },
      { label: 'Threat Intelligence', path: '/threat-intelligence', icon: Radar },
    ],
  },
  {
    title: 'Detection',
    items: [
      { label: 'Malware Detection', path: '/malware', icon: Bug },
      { label: 'Phishing Detection', path: '/phishing', icon: Fish },
      { label: 'Email Spam Detector', path: '/email-spam', icon: MailWarning },
    ],
  },
  {
    title: 'Response',
    items: [
      { label: 'Incidents', path: '/incidents', icon: Siren },
      { label: 'Analytics', path: '/analytics', icon: LineChart },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Administration', path: '/admin', adminOnly: true, icon: Settings },
      { label: 'Settings', path: '/settings', adminOnly: true, icon: SlidersHorizontal },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────
   SIDEBAR
   ───────────────────────────────────────────────────────────── */
export function Sidebar({ activePath, mobile = false }: { activePath: string; mobile?: boolean }) {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  return (
    <nav
      aria-label="Primary navigation"
      className={
        mobile
          ? 'h-auto px-2 py-2'
          : 'sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto px-3 py-5'
      }
    >
      <div className={mobile ? 'space-y-3' : 'space-y-6'}>
        {sections.map(section => {
          const items = section.items.filter(it => !it.adminOnly || isAdmin);
          if (!items.length) return null;

          return (
            <div key={section.title}>
              {/* Section label — hidden on mobile to save space */}
              {!mobile && (
                <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                  {section.title}
                </p>
              )}

              <ul className="space-y-0.5">
                {items.map(it => {
                  const Icon = it.icon;
                  // Exact match for dashboard, prefix match for everything else
                  const active =
                    it.path === '/dashboard'
                      ? activePath === it.path
                      : activePath === it.path || activePath.startsWith(`${it.path}/`);

                  return (
                    <li key={it.path}>
                      <Link
                        to={it.path}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex items-center gap-2.5 rounded px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${
                          active
                            ? 'bg-white/[0.06] text-white'
                            : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                        }`}
                      >
                        {/* Left accent bar — only visible when active */}
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-cyan-400"
                          />
                        )}

                        <Icon
                          strokeWidth={2}
                          className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                            active
                              ? 'text-cyan-400'
                              : 'text-slate-500 group-hover:text-slate-400'
                          }`}
                        />

                        <span className="truncate">{it.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}