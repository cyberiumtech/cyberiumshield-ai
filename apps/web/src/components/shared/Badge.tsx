import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'success' | 'warning' | 'info' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    critical: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30',
    high: 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
    info: 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30',
    default: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
