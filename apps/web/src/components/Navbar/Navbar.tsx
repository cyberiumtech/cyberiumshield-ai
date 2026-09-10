import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Slash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationDropdown } from './NotificationDropdown';
import { QuickActionsMenu } from './QuickActionsMenu';
import { ProfileDropdown } from './ProfileDropdown';
import { GlobalSearch } from './GlobalSearch';
import { Sidebar } from '../Sidebar/Sidebar';
import logoUrl from '../../assets/images/Cybershield-AI.png';

export function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-50 border-b border-cyan-500/15 bg-[#030712]/90 backdrop-blur-md shadow-[0_10px_30px_-15px_rgba(0,0,0,0.85)]">
      <div className="flex h-16 min-w-0 items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
        
        {/* Left Section: Brand & Breadcrumbs */}
        <div className="flex min-w-0 shrink items-center gap-3 lg:gap-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 transition hover:border-cyan-400/50 hover:bg-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 lg:hidden"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Brand Logo & Title */}
          <Link
            to="/dashboard"
            className="group flex items-center gap-3 transition-transform hover:opacity-95"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-[#060b18] p-1 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <img
                src={logoUrl}
                alt="CyberShield-AI"
                className="h-full w-full rounded object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-white">
                <span>CYBERSHIELD</span>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Admin Control Portal
              </div>
            </div>
          </Link>

          {/* Breadcrumbs Navigation */}
          {breadcrumbs.length > 0 && (
            <div className="hidden xl:flex items-center gap-1.5 border-l border-cyan-500/15 pl-4 text-xs font-medium">
              <Link
                to="/dashboard"
                className="text-slate-400 transition hover:text-slate-200"
              >
                Admin
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  <Slash className="h-3 w-3 shrink-0 text-slate-600" />
                  <Link
                    to={crumb.path}
                    className={`transition ${
                      index === breadcrumbs.length - 1
                        ? 'font-semibold text-cyan-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Center Section: Global Command Search */}
        <div className="hidden flex-1 max-w-xl lg:block px-4">
          <GlobalSearch />
        </div>

        {/* Right Section: Action Controls & Profile */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Mobile Search Trigger */}
          <div className="lg:hidden">
            <GlobalSearch />
          </div>

          {/* Quick Actions Menu */}
          <div className="hidden sm:block">
            <QuickActionsMenu />
          </div>

          {/* Notifications Dropdown */}
          <NotificationDropdown />

          {/* User Profile Menu */}
          <div className="border-l border-cyan-500/15 pl-1.5 sm:pl-2">
            <ProfileDropdown />
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-cyan-500/15 bg-[#030712]/95 backdrop-blur-xl lg:hidden"
          >
            <div className="space-y-4 px-4 py-4">
              <Sidebar activePath={location.pathname} mobile />

              <div className="space-y-3 border-t border-cyan-500/15 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Tools</span>
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