import React, from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '../AdminRoute/AdminRoute';
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
  ChevronLeft,
  ChevronRight,
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
   CONSTANTS
   ───────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'sidebar:collapsed';
const COLLAPSED_WIDTH = 56; // px
const EXPANDED_WIDTH = 220; // px

/* ─────────────────────────────────────────────────────────────
   SIDEBAR
   ───────────────────────────────────────────────────────────── */
export function Sidebar({ activePath, mobile = false }: { activePath: string; mobile?: boolean }) {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (mobile) return false;
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* storage unavailable — state persists for this session only */
      }
      return next;
    });
  };

  const isCollapsed = !mobile && collapsed;

  return (
    <nav
      aria-label="Primary navigation"
      style={{
        width: mobile ? '100%' : isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
      }}
      className={
        mobile
          ? 'h-auto px-2 py-2'
          : 'sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto overflow-x-hidden py-3 transition-[width] duration-200 ease-out'
      }
    >
      {/* ═══ Collapse toggle (desktop only) ═══ */}
      {!mobile && (
        <div className={`mb-2 flex ${isCollapsed ? 'justify-center' : 'justify-end'} px-2`}>
          <button
            type="button"
            onClick={toggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            className="grid h-7 w-7 place-items-center rounded text-slate-500 transition-colors duration-150 hover:bg-white/[0.06] hover:text-slate-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}

      {/* ═══ Section list ═══ */}
      <div className={mobile ? 'space-y-3' : isCollapsed ? 'space-y-1' : 'space-y-4'}>
        {sections.map((section, sectionIndex) => {
          const items = section.items.filter(it => !it.adminOnly || isAdmin);
          if (!items.length) return null;

          // When collapsed, add a hairline divider between sections (skip the first)
          const showDivider = isCollapsed && sectionIndex > 0;

          return (
            <div key={section.title}>
              {showDivider && (
                <div aria-hidden="true" className="mx-3 mb-1 h-px bg-white/[0.06]" />
              )}

              {!mobile && !isCollapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                  {section.title}
                </p>
              )}

              <ul className={isCollapsed ? 'space-y-0.5' : 'space-y-0.5'}>
                {items.map(it => {
                  const Icon = it.icon;
                  const active =
                    it.path === '/dashboard'
                      ? activePath === it.path
                      : activePath === it.path || activePath.startsWith(`${it.path}/`);

                  return (
                    <li key={it.path}>
                      <Link
                        to={it.path}
                        aria-current={active ? 'page' : undefined}
                        title={isCollapsed ? it.label : undefined}
                        className={`group relative flex items-center rounded text-[13px] font-medium transition-colors duration-150 ${
                          isCollapsed
                            ? 'mx-1 justify-center px-0 py-2.5'
                            : 'mx-2 gap-2.5 px-3 py-2'
                        } ${
                          active
                            ? 'bg-white/[0.06] text-white'
                            : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                        }`}
                      >
                        {/* Left accent bar — only when active */}
                        {active && (
                          <span
                            aria-hidden="true"
                            className={`absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-cyan-400 ${
                              isCollapsed ? 'left-0' : 'left-0'
                            }`}
                          />
                        )}

                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                            active
                              ? 'text-cyan-400'
                              : 'text-slate-500 group-hover:text-slate-400'
                          }`}
                        />

                        {!isCollapsed && <span className="truncate">{it.label}</span>}
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