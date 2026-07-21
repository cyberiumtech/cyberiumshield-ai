import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIStatusIndicator } from './AIStatusIndicator';
import { EnvironmentBadge } from './EnvironmentBadge';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';
import { NotificationDropdown } from './NotificationDropdown';
import { QuickActionsMenu } from './QuickActionsMenu';
import { ProfileDropdown } from './ProfileDropdown';
import { GlobalSearch } from './GlobalSearch';
import type { AIStatus, Environment } from './types';

export function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const aiStatus: AIStatus = 'online';
  const environment: Environment = import.meta.env.MODE === 'production' ? 'production' : 'development';

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
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-xl shadow-lg">
      <div className="flex items-center justify-between px-4 lg:px-6 h-[72px] gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Logo & Brand */}
          <Link
            to="/dashboard"
            className="flex items-center gap-3 group transition-transform hover:scale-105"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-400/20 group-hover:shadow-xl group-hover:shadow-cyan-400/30 transition-all">
              <span className="text-white font-bold text-lg">CS</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                CyberiumShield AI
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Security Operations Center
              </div>
            </div>
          </Link>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="hidden xl:flex items-center gap-2 text-sm">
              <ChevronRight className="h-4 w-4 text-slate-600" />
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  <Link
                    to={crumb.path}
                    className={`hover:text-cyan-400 transition-colors ${
                      index === breadcrumbs.length - 1
                        ? 'text-cyan-400 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    {crumb.label}
                  </Link>
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-slate-600" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Center Section - Global Search */}
        <div className="flex-1 max-w-2xl hidden lg:block">
          <GlobalSearch />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          {/* Mobile Search */}
          <div className="lg:hidden">
            <GlobalSearch />
          </div>

          {/* AI Status */}
          <div className="hidden sm:block">
            <AIStatusIndicator status={aiStatus} />
          </div>

          {/* Environment Badge */}
          <div className="hidden md:block">
            <EnvironmentBadge environment={environment} />
          </div>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Quick Actions */}
          <div className="hidden lg:block">
            <QuickActionsMenu />
          </div>

          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* Language Selector */}
          <div className="hidden md:block">
            <LanguageSelector />
          </div>

          {/* Profile */}
          <ProfileDropdown />
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-white/5 bg-[#0B1120]/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <AIStatusIndicator status={aiStatus} />
                <EnvironmentBadge environment={environment} />
              </div>

              <div className="pt-3 border-t border-white/10">
                <QuickActionsMenu />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <ThemeToggle />
                <LanguageSelector />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
