import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight, LayoutDashboard } from 'lucide-react';
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

  // Dynamic breadcrumb generation
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => ({
      label: path
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      path: '/' + paths.slice(0, index + 1).join('/'),
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur-xl shadow-xl transition-colors duration-200">
      <div className="mx-auto flex h-[72px] w-full min-w-0 items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
        
        {/* Left Section: Drawer Toggle + Logo + Breadcrumbs */}
        <div className="flex min-w-0 items-center gap-3 lg:gap-5">
          {/* Mobile Drawer Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/50 text-slate-300 transition-all hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 lg:hidden"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo & Brand Identity */}
          <Link
            to="/dashboard"
            className="group flex shrink-0 items-center gap-3 focus:outline-none"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-slate-900/80 p-2 shadow-md shadow-cyan-950/30 transition-all duration-300 group-hover:border-cyan-400/60 group-hover:shadow-cyan-500/20">
              <img
                src={logoUrl}
                alt="CyberShield-AI Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-slate-100">
                <span>CYBERSHIELD</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Security Operations Center
              </p>
            </div>
          </Link>

          {/* Interactive Breadcrumb Path */}
          {breadcrumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="hidden xl:flex items-center gap-1.5 border-l border-slate-800/80 pl-4 text-xs font-medium"
            >
              <Link
                to="/dashboard"
                className="flex items-center gap-1 text-slate-400 transition-colors hover:text-slate-200"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />
                <span>Portal</span>
              </Link>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.path}>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                    <Link
                      to={crumb.path}
                      className={`truncate max-w-[150px] transition-colors ${
                        isLast
                          ? 'font-semibold text-cyan-400'
                          : 'text-slate-400 hover:text-slate-200'
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

        {/* Center Section: Global Command Search */}
        <div className="hidden flex-1 max-w-xl lg:block px-3">
          <GlobalSearch />
        </div>

        {/* Right Section: Action Controls & Profile Avatar Container */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Mobile Search */}
          <div className="lg:hidden">
            <GlobalSearch />
          </div>

          {/* Quick Actions Dropdown */}
          <div className="relative z-30">
            <QuickActionsMenu />
          </div>

          {/* Notifications Dropdown */}
          <div className="relative z-30">
            <NotificationDropdown />
          </div>

          {/* Managed-Width Profile Section */}
          <div className="relative z-30 flex shrink-0 items-center border-l border-slate-800/80 pl-2.5 sm:pl-3">
            <ProfileDropdown />
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="border-t border-slate-800/80 bg-[#0B1120]/95 backdrop-blur-2xl lg:hidden"
          >
            <div className="max-h-[calc(100vh-4.5rem)] space-y-4 overflow-y-auto px-4 py-4">
              <Sidebar activePath={location.pathname} mobile />

              <div className="border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Quick Operations
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