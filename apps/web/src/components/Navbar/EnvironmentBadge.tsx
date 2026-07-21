import React from 'react';
import { Shield } from 'lucide-react';
import type { Environment } from './types';

interface EnvironmentBadgeProps {
  environment: Environment;
}

export function EnvironmentBadge({ environment }: EnvironmentBadgeProps) {
  const envConfig = {
    production: {
      label: 'PROD',
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      ringColor: 'ring-red-400/30',
    },
    development: {
      label: 'DEV',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      ringColor: 'ring-blue-400/30',
    },
    testing: {
      label: 'TEST',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      ringColor: 'ring-yellow-400/30',
    },
  };

  const config = envConfig[environment];

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md ${config.bgColor} ring-1 ${config.ringColor}`}
      title={`Environment: ${environment}`}
    >
      <Shield className={`h-3 w-3 ${config.color}`} />
      <span className={`text-xs font-semibold tracking-wider ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}
