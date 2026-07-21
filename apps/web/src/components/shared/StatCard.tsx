import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ title, value, delta, icon: Icon, color = 'text-cyan-400', trend = 'neutral' }: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-slate-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-cyan-400/30 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-400 font-medium">{title}</p>
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-100 mb-1">{value}</h3>
      {delta && (
        <p className={`text-xs font-medium ${trendColors[trend]}`}>{delta}</p>
      )}
    </motion.div>
  );
}
