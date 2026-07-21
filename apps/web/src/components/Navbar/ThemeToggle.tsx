import React, { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme } from './types';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isOpen, setIsOpen] = useState(false);

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="h-4 w-4" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="h-4 w-4" />, label: 'Dark' },
    { value: 'system', icon: <Monitor className="h-4 w-4" />, label: 'System' },
  ];

  const currentTheme = themes.find((t) => t.value === theme)!;

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        aria-label="Toggle theme"
      >
        {currentTheme.icon}
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
              className="absolute right-0 top-full mt-2 w-36 rounded-xl bg-[#0F1729]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
            >
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setTheme(t.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    theme === t.value
                      ? 'bg-cyan-400/10 text-cyan-300'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
