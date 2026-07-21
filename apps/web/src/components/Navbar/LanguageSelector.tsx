import React, { useState } from 'react';
import { Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Language } from './types';

export function LanguageSelector() {
  const [language, setLanguage] = useState<Language>('en');
  const [isOpen, setIsOpen] = useState(false);

  const languages: { value: Language; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'ne', label: 'नेपाली', flag: '🇳🇵' },
  ];

  const currentLanguage = languages.find((l) => l.value === language)!;

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        aria-label="Select language"
      >
        <Languages className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:block">
          {currentLanguage.flag}
        </span>
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
              className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-[#0F1729]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
            >
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => {
                    setLanguage(lang.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    language === lang.value
                      ? 'bg-cyan-400/10 text-cyan-300'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
