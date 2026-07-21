import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Command, TrendingUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { SearchResult } from './types';

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches] = useState<string[]>([
    'Critical threats last 24h',
    'Incident INC-2024-0789',
    'Server-01 logs',
  ]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const mockResults: SearchResult[] = [
    {
      id: '1',
      type: 'threat',
      title: 'Critical Threat Detected',
      subtitle: 'Malware signature on server-01',
      link: '/threat-detection',
    },
    {
      id: '2',
      type: 'incident',
      title: 'INC-2024-0789',
      subtitle: 'Suspicious login attempt',
      link: '/incidents',
    },
    {
      id: '3',
      type: 'device',
      title: 'Server-01',
      subtitle: '192.168.1.100',
      link: '/network',
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim()) {
        const filtered = mockResults.filter(
          (result) =>
            result.title.toLowerCase().includes(value.toLowerCase()) ||
            (result.subtitle?.toLowerCase().includes(value.toLowerCase()) ?? false)
        );
        setResults(filtered);
      } else {
        setResults([]);
      }
    },
    [mockResults]
  );

  const handleResultClick = (result: SearchResult) => {
    navigate(result.link);
    setIsOpen(false);
    setQuery('');
  };

  const getResultIcon = (type: SearchResult['type']) => {
    const iconClasses = 'h-4 w-4';
    switch (type) {
      case 'threat':
        return <div className={`${iconClasses} text-red-400`}>🛡️</div>;
      case 'incident':
        return <div className={`${iconClasses} text-orange-400`}>⚠️</div>;
      case 'device':
        return <div className={`${iconClasses} text-blue-400`}>💻</div>;
      case 'user':
        return <div className={`${iconClasses} text-green-400`}>👤</div>;
      case 'log':
        return <div className={`${iconClasses} text-purple-400`}>📋</div>;
      case 'report':
        return <div className={`${iconClasses} text-cyan-400`}>📊</div>;
      case 'command':
        return <div className={`${iconClasses} text-yellow-400`}>⚡</div>;
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-3 w-full max-w-md px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
      >
        <Search className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-400 flex-1">
          Search threats, incidents, devices...
        </span>
        <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-400 bg-white/5 border border-white/10 rounded">
          <Command className="h-3 w-3" />K
        </kbd>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
            >
              <div className="mx-4 rounded-xl bg-[#0F1729]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
                  <Search className="h-5 w-5 text-cyan-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search threats, incidents, devices, users, logs..."
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none"
                    autoFocus
                  />
                  <kbd className="px-2 py-1 text-xs font-semibold text-slate-400 bg-white/5 border border-white/10 rounded">
                    ESC
                  </kbd>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {query.trim() === '' ? (
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-3">
                        <Clock className="h-3 w-3" />
                        Recent Searches
                      </div>
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(search)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Clock className="h-4 w-4 text-slate-500" />
                          <span>{search}</span>
                        </button>
                      ))}

                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mt-6 mb-3">
                        <TrendingUp className="h-3 w-3" />
                        Suggested
                      </div>
                      {mockResults.slice(0, 3).map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          {getResultIcon(result.type)}
                          <div className="flex-1 text-left">
                            <div className="font-medium">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-xs text-slate-500">
                                {result.subtitle}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : results.length > 0 ? (
                    <div className="p-2">
                      {results.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          {getResultIcon(result.type)}
                          <div className="flex-1 text-left">
                            <div className="font-medium">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-xs text-slate-500">
                                {result.subtitle}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">
                      No results found for "{query}"
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-white/10 bg-white/5 text-xs text-slate-500 flex items-center justify-between">
                  <span>Navigate with ↑↓ | Select with ⏎</span>
                  <span className="text-cyan-400/60">
                    {/* TODO: Backend integration pending */}
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
