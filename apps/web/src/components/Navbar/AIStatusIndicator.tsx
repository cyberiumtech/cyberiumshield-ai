import React from 'react';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AIStatus } from './types';

interface AIStatusIndicatorProps {
  status: AIStatus;
}

export function AIStatusIndicator({ status }: AIStatusIndicatorProps) {
  const statusConfig = {
    online: {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      ringColor: 'ring-emerald-400/30',
      label: 'AI Online',
      dotColor: 'bg-emerald-400',
    },
    degraded: {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      ringColor: 'ring-yellow-400/30',
      label: 'AI Degraded',
      dotColor: 'bg-yellow-400',
    },
    offline: {
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      ringColor: 'ring-red-400/30',
      label: 'AI Offline',
      dotColor: 'bg-red-400',
    },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} ring-1 ${config.ringColor} cursor-pointer transition-all`}
      title={config.label}
    >
      <div className="relative">
        <Activity className={`h-4 w-4 ${config.color}`} />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${config.dotColor}`}
        />
      </div>
      <span className={`text-xs font-medium ${config.color} hidden sm:block`}>
        {config.label}
      </span>
    </motion.div>
  );
}
