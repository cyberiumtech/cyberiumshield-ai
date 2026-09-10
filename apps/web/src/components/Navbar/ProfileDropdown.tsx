import React, { useState } from 'react';
import { User as UserIcon, Settings, Key, Shield, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '../AdminRoute/AdminRoute';

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) return null;

  const menuItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <UserIcon className="h-4 w-4" />,
      onClick: () => {
        navigate('/profile');
        setIsOpen(false);
      },
    },
    ...(isAdminRole(user.role) ? [{
      id: 'settings',
      label: 'Organization settings',
      icon: <Settings className="h-4 w-4" />,
      onClick: () => {
        navigate('/settings');
        setIsOpen(false);
      },
    },
    {
      id: 'api-keys',
      label: 'API Keys',
      icon: <Key className="h-4 w-4" />,
      onClick: () => {
        navigate('/settings');
        setIsOpen(false);
      },
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Shield className="h-4 w-4" />,
      onClick: () => {
        navigate('/settings');
        setIsOpen(false);
      },
    }] : []),
  ];

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative shrink-0">
      {/* Trigger Button with constrained max-width & text truncation */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex max-w-[160px] sm:max-w-[210px] items-center justify-between gap-2.5 rounded-xl border border-slate-700/60 bg-slate-800/40 p-1.5 pr-2.5 transition-all hover:border-cyan-500/40 hover:bg-slate-800/80"
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 items-center gap-2">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-8 w-8 shrink-0 rounded-lg object-cover ring-2 ring-cyan-400/30"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 ring-2 ring-cyan-400/30">
              <span className="text-xs font-bold text-white">{getInitials(user.name)}</span>
            </div>
          )}

          <div className="hidden min-w-0 flex-1 flex-col text-left sm:flex">
            <p className="truncate text-xs font-semibold text-slate-200 leading-tight">
              {user.name}
            </p>
            <p className="truncate text-[10px] font-medium text-slate-400 leading-tight">
              {user.role}
            </p>
          </div>
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 hidden sm:block ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-800 bg-[#0B1120]/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
            >
              {/* Profile Header Details */}
              <div className="p-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-10 w-10 shrink-0 rounded-full ring-2 ring-cyan-400/30 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 ring-2 ring-cyan-400/30">
                      <span className="text-xs font-bold text-white">{getInitials(user.name)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-100 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <span className="inline-block mt-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-cyan-400">
                      {user.role}
                    </span>
                  </div>
                </div>

                {/* Organization Details */}
                {user.organization_name && (
                  <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Organization</p>
                    <p className="text-xs text-slate-200 font-medium truncate">{user.organization_name}</p>
                  </div>
                )}
              </div>

              {/* Quick Navigation Items */}
              <div className="py-1">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/70 hover:text-cyan-400 transition-colors"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Sign Out Action */}
              <div className="border-t border-slate-800/80 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
