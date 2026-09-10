import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // Adjust path as needed
import { isAdminRole } from '../AdminRoute/AdminRoute'; // Adjust path as needed
import {
  LayoutDashboard,
  ShieldCheck,
  Activity,
  ShieldAlert,
  Radar,
  Bug,
  Fish,
  MailWarning,
  Siren,
  LineChart,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';

// Define the structure for your sidebar items
interface SidebarItem {
  label: string;
  path: string;
  adminOnly?: boolean;
  icon: React.ElementType;
}

// Navigation configuration
const items: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Security Center', path: '/security-center', icon: ShieldCheck },
  { label: 'Network Monitoring', path: '/network', icon: Activity },
  { label: 'Vulnerability Management', path: '/vulnerability', icon: ShieldAlert },
  { label: 'Threat Intelligence', path: '/threat-intelligence', icon: Radar },
  { label: 'Malware Detection', path: '/malware', icon: Bug },
  { label: 'Phishing Detection', path: '/phishing', icon: Fish },
  { label: 'Email Spam Detector', path: '/email-spam', icon: MailWarning },
  { label: 'Incidents', path: '/incidents', icon: Siren },
  { label: 'Analytics', path: '/analytics', icon: LineChart },
  { label: 'Administration', path: '/admin', adminOnly: true, icon: Settings },
  { label: 'Settings', path: '/settings', adminOnly: true, icon: SlidersHorizontal },
];

export function Sidebar({ activePath, mobile = false }: { activePath: string; mobile?: boolean }) {
  const { user } = useAuth();
  
  // Filter visible items based on admin role
  const visibleItems = items.filter(item => !item.adminOnly || isAdminRole(user?.role));

  return (
    <nav
      className={`${
        mobile 
          ? 'h-auto px-2 py-2' 
          : 'h-[calc(100vh-72px)] sticky top-[72px] overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent'
      }`}
    >
      <div className="space-y-1.5">
        {visibleItems.map(it => {
          const Icon = it.icon;
          
          // Exact match for dashboard, partial match for sub-routes
          const active = it.path === '/dashboard' 
            ? activePath === it.path 
            : activePath.startsWith(it.path);

          return (
            <Link
              key={it.path}
              to={it.path}
              className={`
                group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium 
                transition-all duration-300 ease-out overflow-hidden
                ${active 
                  ? 'bg-cyan-500/15 text-cyan-300' 
                  : 'text-slate-400 hover:text-cyan-100 hover:bg-slate-800/50'
                }
              `}
            >
              {/* Active state subtle background glow effect */}
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-50 pointer-events-none" />
              )}
              
              {/* Active Indicator Line on the left edge */}
              <div 
                className={`
                  absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-cyan-400 
                  transition-all duration-300
                  ${active ? 'h-3/5 opacity-100' : 'h-0 opacity-0 group-hover:h-2 group-hover:opacity-50'}
                `} 
              />

              {/* Icon with smooth scaling and color transition */}
              <Icon 
                strokeWidth={active ? 2.5 : 2} 
                className={`
                  w-5 h-5 flex-shrink-0 transition-transform duration-300
                  ${active ? 'text-cyan-400 scale-100' : 'text-slate-500 group-hover:scale-110 group-hover:text-cyan-300'}
                `} 
              />
              
              {/* Navigation Label */}
              <span className="relative z-10 truncate tracking-wide">
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
