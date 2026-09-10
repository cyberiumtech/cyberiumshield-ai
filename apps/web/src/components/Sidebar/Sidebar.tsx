import React from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
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
   NAVIGATION
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
const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 232;
const HEADER_HEIGHT = 72;

/* ─────────────────────────────────────────────────────────────
   SIDEBAR
   ───────────────────────────────────────────────────────────── */
export function Sidebar({ activePath, mobile = false }: { activePath: string; mobile?: boolean }) {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (mobile || typeof window === 'undefined') return false;
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
        /* storage unavailable */
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
        top: mobile ? undefined : HEADER_HEIGHT,
        height: mobile ? 'auto' : `calc(100vh - ${HEADER_HEIGHT}px)`,
      }}
      className={
        mobile
          ? 'px-2 py-2'
          : `sticky flex flex-col border-r border-white/[0.06] bg-[#0b1424] transition-[width] duration-200 ease-out ${
              isCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'
            }`
      }
    >
      {/* ═══ Header row: toggle button ═══ */}
      {!mobile && (
        <div className="flex h-11 shrink-0 items-center border-b border-white/[0.06] px-3">
          {!isCollapsed && (
            <p className="flex-1 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
              Navigation
            </p>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            className={`grid h-7 w-7 place-items-center rounded text-slate-500 transition-colors duration-150 hover:bg-white/[0.06] hover:text-slate-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 ${
              isCollapsed ? 'mx-auto' : ''
            }`}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}

      {/* ═══ Scroll area ═══ */}
      <div
        className={
          mobile
            ? 'space-y-3'
            : `flex-1 ${isCollapsed ? 'overflow-visible py-2' : 'overflow-y-auto overflow-x-hidden py-3'}`
        }
      >
        <div className={mobile ? 'space-y-3' : isCollapsed ? 'space-y-1' : 'space-y-4'}>
          {sections.map((section, sectionIndex) => {
            const items = section.items.filter(it => !it.adminOnly || isAdmin);
            if (!items.length) return null;

            const showDivider = isCollapsed && sectionIndex > 0;

            return (
              <div key={section.title}>
                {/* Divider between sections when collapsed */}
                {showDivider && (
                  <div aria-hidden="true" className="mx-3 mb-1 h-px bg-white/[0.06]" />
                )}

                {/* Section title — visible only when expanded */}
                {!mobile && !isCollapsed && (
                  <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                    {section.title}
                  </p>
                )}

                <ul className="space-y-0.5">
                  {items.map(it => {
                    const Icon = it.icon;
                    const active =
                      it.path === '/dashboard'
                        ? activePath === it.path
                        : activePath === it.path || activePath.startsWith(`${it.path}/`);

                    return (
                      <li key={it.path} className="relative">
                        <Link
                          to={it.path}
                          aria-current={active ? 'page' : undefined}
                          aria-label={isCollapsed ? it.label : undefined}
                          className={`group relative flex items-center rounded text-[13px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-500 ${
                            isCollapsed
                              ? 'mx-1.5 justify-center py-2.5'
                              : 'mx-2 gap-2.5 px-3 py-2'
                          } ${
                            active
                              ? 'bg-white/[0.06] text-white'
                              : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                          }`}
                        >
                          {active && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-cyan-400"
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

                          {/* Floating tooltip — only in collapsed mode */}
                          {isCollapsed && (
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded border border-white/[0.08] bg-[#0d1219] px-2 py-1 text-[11px] font-medium text-slate-200 opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100"
                            >
                              {it.label}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}