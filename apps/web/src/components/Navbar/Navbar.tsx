import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Menu, Plus, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationDropdown } from './NotificationDropdown';
import { QuickActionsMenu } from './QuickActionsMenu';
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

  /* Breadcrumb generation */
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

  /* Initials for the profile chip */
  const initials = (user?.name || 'Admin')
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

  return (
    <header
      style={{ fontFamily: FONT_SANS }}
      className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#0b0e14]"
    >
      <div className="mx-auto flex h-[68px] w-full min-w-0 items-center gap-4 px-4 lg:px-6">
        {/* ═══════════════ LEFT: Logo + Breadcrumb ═══════════════ */}
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-white/[0.02] text-slate-300 transition-colors hover:bg-white/[0.05] hover:text-white lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          {/* Logo */}
          <Link
            to="/dashboard"
            className="group flex shrink-0 items-center gap-3 focus:outline-none"
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

          {/* Breadcrumb */}
          {breadcrumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="hidden min-w-0 items-center gap-1 border-l border-white/[0.06] pl-4 text-[12px] md:flex lg:pl-6"
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

        {/* ═══════════════ CENTER: Search ═══════════════ */}
        <div className="hidden flex-1 justify-center px-2 lg:flex">
          <div className="w-full max-w-[520px]">
            <GlobalSearch />
          </div>
        </div>

        {/* ═══════════════ RIGHT: Actions + Profile ═══════════════ */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Mobile search */}
          <div className="lg:hidden">
            <GlobalSearch />
          </div>

          {/* Quick Actions */}
          <div className="relative z-30 hidden sm:block">
            <QuickActionsMenu />
          </div>

          {/* Notifications */}
          <div className="relative z-30">
            <NotificationDropdown />
          </div>

          {/* Profile */}
          <div className="relative z-30 flex shrink-0 items-center border-l border-white/[0.06] pl-3">
            <ProfileDropdown />
          </div>
        </div>
      </div>

      {/* ═══════════════ MOBILE DRAWER ═══════════════ */}
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

              <div className="mt-3 border-t border-white/[0.06] pt-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                    Quick operations
                  </span>
                  <QuickActionsMenu />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}