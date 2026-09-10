import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Shield, Activity, CheckCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Notification } from './types';
import { useAuth } from '../../hooks/useAuth';
import { getSystemNotifications } from '../../services/notification.service';

const READ_STORAGE_PREFIX = 'cybershield:notifications:read:';
const REFRESH_INTERVAL_MS = 30_000;

function getReadIds(storageKey: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    return new Set<string>(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function saveReadIds(storageKey: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...ids].slice(-500)));
  } catch {
    // Notifications still work when browser storage is unavailable.
  }
}

export function NotificationDropdown() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const readStorageKey = `${READ_STORAGE_PREFIX}${user?.id ?? 'anonymous'}`;

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const nextNotifications = await getSystemNotifications();
      const readIds = getReadIds(readStorageKey);
      setNotifications(nextNotifications.map(notification => ({
        ...notification,
        read: readIds.has(notification.id),
      })));
      setError(null);
    } catch {
      setError('Unable to load system notifications.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [readStorageKey]);

  useEffect(() => {
    void loadNotifications(true);
    const interval = window.setInterval(() => void loadNotifications(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(current => {
      const readIds = getReadIds(readStorageKey);
      current.forEach(notification => readIds.add(notification.id));
      saveReadIds(readStorageKey, readIds);
      return current.map(notification => ({ ...notification, read: true }));
    });
  };

  const openNotification = (notification: Notification) => {
    const readIds = getReadIds(readStorageKey);
    readIds.add(notification.id);
    saveReadIds(readStorageKey, readIds);
    setNotifications(current => current.map(item => (
      item.id === notification.id ? { ...item, read: true } : item
    )));
    setIsOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'threat':
        return <Shield className="h-4 w-4 text-orange-400" />;
      case 'incident':
        return <Activity className="h-4 w-4 text-yellow-400" />;
      case 'system':
        return <Bell className="h-4 w-4 text-blue-400" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    if (date.getTime() === 0) return 'Time unavailable';
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (!isOpen) void loadNotifications();
          setIsOpen(open => !open);
        }}
        className="relative flex items-center justify-center h-10 w-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-[#0B1120]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
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
              className="absolute right-0 top-full mt-2 w-96 rounded-xl bg-[#0F1729]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-slate-200">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {error && notifications.length > 0 && (
                  <div className="flex items-center justify-between gap-3 border-b border-amber-500/10 bg-amber-500/5 px-4 py-2 text-xs text-amber-300">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => void loadNotifications(true)}
                      className="shrink-0 font-medium hover:text-amber-200"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {isLoading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading notifications
                  </div>
                ) : error && notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-slate-400">{error}</p>
                    <button
                      type="button"
                      onClick={() => void loadNotifications(true)}
                      className="mt-2 text-xs font-medium text-cyan-400 transition-colors hover:text-cyan-300"
                    >
                      Try again
                    </button>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">
                    No system notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() => openNotification(notification)}
                      className={`w-full px-4 py-3 text-left border-b border-white/5 transition-colors ${
                        !notification.read
                          ? 'bg-cyan-400/5 hover:bg-cyan-400/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-200">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="px-4 py-3 border-t border-white/10 bg-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/security-center');
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium w-full text-center"
                >
                  View all notifications
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
