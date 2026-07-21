import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ChartCardProps {
  title: string;
  value?: string | number;
  change?: number;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, value, change, children, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 ${className}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>
          {value && (
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-slate-100">{value}</p>
              {change !== undefined && (
                <span
                  className={`flex items-center text-xs font-medium ${
                    change >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(change)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
