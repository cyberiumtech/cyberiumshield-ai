import React, { useState } from 'react';
import { Plus, Scan, AlertCircle, FileText, Bot, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

export function QuickActionsMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const actions: QuickAction[] = [
    {
      id: 'scan',
      label: 'New Scan',
      icon: <Scan className="h-4 w-4" />,
      color: 'text-blue-400',
      onClick: () => console.log('New Scan'),
    },
    {
      id: 'incident',
      label: 'New Incident',
      icon: <AlertCircle className="h-4 w-4" />,
      color: 'text-red-400',
      onClick: () => console.log('New Incident'),
    },
    {
      id: 'report',
      label: 'Generate Report',
      icon: <FileText className="h-4 w-4" />,
      color: 'text-green-400',
      onClick: () => console.log('Generate Report'),
    },
    {
      id: 'ai',
      label: 'Ask AI',
      icon: <Bot className="h-4 w-4" />,
      color: 'text-purple-400',
      onClick: () => console.log('Ask AI'),
    },
    {
      id: 'user',
      label: 'Add User',
      icon: <UserPlus className="h-4 w-4" />,
      color: 'text-yellow-400',
      onClick: () => console.log('Add User'),
    },
  ];

  const handleActionClick = (action: QuickAction) => {
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 transition-all"
        aria-label="Quick actions"
      >
        <Plus className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:block">Quick Actions</span>
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
              className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-[#0F1729]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
            >
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                >
                  <span className={action.color}>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
