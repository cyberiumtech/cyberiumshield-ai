import React, { useState } from 'react';
import { User as UserIcon, Settings, Key, Shield, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

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
    {
      id: 'settings',
      label: 'Settings',
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
    },
  ];

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
      >
        <div className="flex items-center gap-2">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-8 w-8 rounded-full ring-2 ring-cyan-400/30"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center ring-2 ring-cyan-400/30">
              <span className="text-xs font-bold text-white">
                {getInitials(user.name)}
              </span>
            </div>
          )}
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-slate-200 leading-tight">
              {user.name}
            </p>
            <p className="text-xs text-slate-400 leading-tight">{user.role}</p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 hidden sm:block ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#0F1729]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-4 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-12 w-12 rounded-full ring-2 ring-cyan-400/30"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center ring-2 ring-cyan-400/30">
                      <span className="text-sm font-bold text-white">
                        {getInitials(user.name)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{user.role}</p>
                  </div>
                </div>
                <div className="mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-400">Organization</p>
                  <p className="text-sm text-slate-200 font-medium">
                    {user.organization}
                  </p>
                </div>
              </div>

              <div className="py-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
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
