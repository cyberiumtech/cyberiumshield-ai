import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Menu, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationDropdown } from './NotificationDropdown';
import { ProfileDropdown } from './ProfileDropdown';
import { GlobalSearch } from './GlobalSearch';
import { Sidebar } from '../Sidebar/Sidebar';
import logoUrl from '../../assets/images/Cybershield-AI.png';
import { useAuth } from '../../hooks/useAuth';
import { getEffectiveLogo, getSettings, subscribeToSettings } from '../../services/settings.service';

/* ─────────────────────────────────────────────────────────────
   FONT STACK
   ───────────────────────────────────────────────────────────── */
const FONT_SANS = "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

export function Navbar() {
  const location = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [brandLogo, setBrandLogo] = useState(() =>
    getEffectiveLogo(getSettings().branding, logoUrl)
  );

  useEffect(
    () =>
      subscribeToSettings(() => {
        setBrandLogo(getEffectiveLogo(getSettings().branding, logoUrl));
      }),
    []
  );

  useEffect(() => {
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isSearchOpen]);

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => ({
      label: path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      path: '/' + paths.slice(0, index + 1).join('/'),
    }));
  };
  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header
        style={{ fontFamily: FONT_SANS }}
        className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#0b0e14]"
      >
        <div className="mx-auto flex h-[68px] w-full min-w-0 items-center gap-3 px-4 lg:px-6">
          {/* ═══════════════ LEFT: Toggle + Logo + Breadcrumb ═══════════════ */}
          <div className="flex min-w-0 items-center gap-3 lg:gap-5">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-white/[0.02] text-slate-300 transition-colors hover:bg-white/[0.05] hover:text-white lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <Link
              to="/dashboard"
              className="group flex shrink-0 items-center gap-2.5 focus:outline-none"
            >
              <div className="relative grid h-10 w-10 place-items-center rounded-lg border border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.08] to-violet-500/[0.06]">
                <img
                  src={brandLogo}
                  alt="CyberShield AI"
                  className="h-full w-full rounded-lg object-contain p-1.5"
                />
              </div>
              <div className="hidden sm:block">
                <p className="text-[13px] font-semibold leading-tight tracking-tight text-white">
                  CYBERSHIELD
                </p>
                <p className="text-[10px] leading-tight text-slate-500">
                  Security Operations Center
                </p>
              </div>
            </Link>

            {breadcrumbs.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="hidden min-w-0 items-center gap-1 border-l border-white/[0.06] pl-4 text-[12px] lg:flex lg:pl-5"
              >
                <Link
                  to="/dashboard"
                  className="text-slate-500 transition-colors hover:text-slate-300"
                >
                  Portal
                </Link>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.path}>
                      <ChevronRight className="h-3 w-3 shrink-0 text-slate-700" />
                      <Link
                        to={crumb.path}
                        aria-current={isLast ? 'page' : undefined}
                        className={`max-w-[160px] truncate transition-colors ${
                          isLast
                            ? 'font-medium text-cyan-400'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {crumb.label}
                      </Link>
                    </React.Fragment>
                  );
                })}
              </nav>
            )}
          </div>

          {/* ═══════════════ RIGHT: Search + Bell + Profile ═══════════════ */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Wide search trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open search"
              className="group flex h-9 items-center gap-2.5 rounded-md border border-white/[0.08] bg-white/[0.02] pl-3 pr-2 text-slate-400 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-slate-200 sm:w-[240px] md:w-[320px] lg:w-[400px] xl:w-[480px]"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden flex-1 truncate text-left text-[12px] text-slate-500 group-hover:text-slate-300 sm:inline">
                Search threats, incidents, devices…
              </span>
              <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:flex">
                <span className="text-[11px] leading-none">⌘</span>
                <span className="leading-none">K</span>
              </kbd>
            </button>

            <div className="relative z-30">
              <NotificationDropdown />
            </div>

            <div className="relative z-30 flex shrink-0 items-center border-l border-white/[0.06] pl-2.5">
              <ProfileDropdown />
            </div>
          </div>
        </div>

        {/* ═══════════════ MOBILE MENU DRAWER ═══════════════ */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-white/[0.06] bg-[#0b0e14] lg:hidden"
            >
              <div className="max-h-[calc(100dvh-4.25rem)] overflow-y-auto px-3 py-3">
                <Sidebar activePath={location.pathname} mobile />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ═══════════════ SEARCH SIDE DRAWER ═══════════════ */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 z-50 bg-black/60"
              aria-hidden="true"
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col border-l border-white/[0.06] bg-[#0b0e14] sm:w-[440px] lg:w-[520px]"
              style={{ fontFamily: FONT_SANS }}
            >
              <div className="flex h-[68px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-[13px] font-semibold text-white">Search</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="Close search"
                  className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <GlobalSearch autoFocus />
              </div>

              <div className="shrink-0 border-t border-white/[0.06] px-4 py-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Press Esc to close</span>
                  <span className="hidden font-mono text-slate-600 sm:inline">
                    Search across incidents, devices, threats
                  </span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}