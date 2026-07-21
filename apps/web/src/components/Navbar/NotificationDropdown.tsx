import React, { useState } from 'react';
import { Bell, AlertTriangle, Shield, Activity, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Notification } from './types';

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'critical',
      title: 'Critical Alert',
      message: 'Suspicious activity detected on server-01',
      timestamp: new Date(Date.now() - 5 * 60000),
      read: false,
    },
    {
      id: '2',
      type: 'threat',
      title: 'New Threat Detected',
      message: 'Malware signature identified in network traffic',
      timestamp: new Date(Date.now() - 15 * 60000),
      read: false,
    },
    {
      id: '3',
      type: 'incident',
      title: 'Incident Created',
      message: 'INC-2024-0789 has been assigned to you',
      timestamp: new Date(Date.now() - 60 * 60000),
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
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
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
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
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center h-10 w-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        aria-label="Notifications"
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
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-white/5 transition-colors cursor-pointer ${
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
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-3 border-t border-white/10 bg-white/5">
                <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium w-full text-center">
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
