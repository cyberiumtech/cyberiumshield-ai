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
const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 272;
const HEADER_HEIGHT = 72;
const BOTTOM_BAR_HEIGHT = 56;

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
        height: mobile ? 'auto' : `calc(100dvh - ${HEADER_HEIGHT}px)`,
      }}
      className={
        mobile
          ? 'px-2 py-2'
          : 'sticky flex flex-col border-r border-white/[0.06] bg-[#070b12] transition-[width] duration-200 ease-out'
      }
    >
      {/* ═══ Scroll area — always scrollable, bottom bar stays pinned ═══ */}
      <div
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${
          isCollapsed ? 'py-3' : 'py-4'
        }`}
      >
        <div className={mobile ? 'space-y-3' : isCollapsed ? 'space-y-2' : 'space-y-5'}>
          {sections.map((section, sectionIndex) => {
            const items = section.items.filter(it => !it.adminOnly || isAdmin);
            if (!items.length) return null;

            const showDivider = isCollapsed && sectionIndex > 0;

            return (
              <div key={section.title}>
                {showDivider && (
                  <div aria-hidden="true" className="mx-4 my-2 h-px bg-white/[0.06]" />
                )}

                {/* ── Section label with horizontal line (expanded only) ── */}
                {!mobile && !isCollapsed && (
                  <div className="mb-2 flex items-center gap-3 px-4">
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                      {section.title}
                    </span>
                    <span aria-hidden="true" className="h-px flex-1 bg-white/[0.06]" />
                  </div>
                )}

                <ul className={isCollapsed ? 'space-y-1.5' : 'space-y-0.5'}>
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
                          aria-label={it.label}
                          title={isCollapsed ? it.label : undefined}
                          className={`group relative flex items-center rounded text-[13px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-500 ${
                            isCollapsed
                              ? 'mx-2 h-11 justify-center'
                              : 'mx-3 gap-3 px-3 py-2.5'
                          } ${
                            active
                              ? 'bg-white/[0.06] text-white'
                              : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                          }`}
                        >
                          {active && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-cyan-400"
                            />
                          )}

                          <Icon
                            className={`h-5 w-5 shrink-0 transition-colors duration-150 ${
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
      </div>

      {/* ═══ Fixed bottom bar — shrink-0 so it stays pinned ═══ */}
      {!mobile && (
        <div
          className={`flex shrink-0 items-center border-t border-white/[0.06] bg-[#070b12] ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
          style={{ height: BOTTOM_BAR_HEIGHT }}
        >
          {!isCollapsed && (
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
              Collapse Sidebar
            </p>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="grid h-9 w-9 shrink-0 place-items-center rounded text-slate-400 transition-colors duration-150 hover:bg-white/[0.06] hover:text-slate-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      )}
    </nav>
  );
}