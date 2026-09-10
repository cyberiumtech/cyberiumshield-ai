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
const COLLAPSED_WIDTH = 68;
const EXPANDED_WIDTH = 260;
const HEADER_HEIGHT = 68; // ← must equal the navbar height (was 72 → caused the 4px gap)
const BOTTOM_BAR_HEIGHT = 52;

const SIDEBAR_BG = 'bg-[#070b12]';

const THIN_SCROLLBAR =
  '[scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.15)_transparent] ' +
  '[&::-webkit-scrollbar]:w-1 ' +
  '[&::-webkit-scrollbar]:h-1 ' +
  '[&::-webkit-scrollbar-track]:bg-transparent ' +
  '[&::-webkit-scrollbar-thumb]:rounded-full ' +
  '[&::-webkit-scrollbar-thumb]:bg-white/[0.06] ' +
  'hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.14]';

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
          ? `px-2 py-2 ${SIDEBAR_BG}`
          : `sticky flex flex-col border-r border-white/[0.06] ${SIDEBAR_BG} transition-[width] duration-200 ease-out`
      }
    >
      {/* ═══ Scroll area ═══ */}
      <div
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${THIN_SCROLLBAR} ${
          isCollapsed ? 'py-2' : 'pt-2.5 pb-4'
        }`}
      >
        <div className={mobile ? 'space-y-3' : isCollapsed ? 'space-y-1' : 'space-y-4'}>
          {sections.map((section, sectionIndex) => {
            const items = section.items.filter(it => !it.adminOnly || isAdmin);
            if (!items.length) return null;

            const showDivider = isCollapsed && sectionIndex > 0;

            return (
              <div key={section.title}>
                {showDivider && (
                  <div aria-hidden="true" className="mx-3 mb-1 h-px bg-white/[0.06]" />
                )}

                {!mobile && !isCollapsed && (
                  <div className="mb-1.5 flex items-center gap-3 px-3">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {section.title}
                    </span>
                    <span aria-hidden="true" className="h-px flex-1 bg-white/[0.05]" />
                  </div>
                )}

                <ul className={isCollapsed ? 'space-y-1' : 'space-y-0.5'}>
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
                          className={`group relative flex items-center rounded-md text-[13px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-500 ${
                            isCollapsed
                              ? 'mx-1.5 h-10 justify-center'
                              : 'mx-2 gap-2.5 px-2.5 py-2'
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
                            className={`h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${
                              active
                                ? 'text-cyan-400'
                                : 'text-slate-500 group-hover:text-slate-400'
                            }`}
                          />

                          {!isCollapsed && (
                            <span className="truncate leading-none">{it.label}</span>
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

      {/* ═══ Bottom bar ═══ */}
      {!mobile && (
        <div
          className={`flex shrink-0 items-center border-t border-white/[0.06] ${SIDEBAR_BG} ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
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
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-white/[0.06] hover:text-slate-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-[17px] w-[17px]" />
            ) : (
              <PanelLeftClose className="h-[17px] w-[17px]" />
            )}
          </button>
        </div>
      )}
    </nav>
  );
}