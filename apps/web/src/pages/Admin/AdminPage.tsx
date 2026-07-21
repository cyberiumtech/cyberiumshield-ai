import React, { useState } from 'react';
import { Users, UserPlus, Shield, Settings, Key } from 'lucide-react';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/shared/Badge';
import { DataTable } from '../../components/shared/DataTable';

const stats = [
  { title: 'Total Users', value: '156', delta: '+8 This Month', icon: Users, trend: 'up' as const },
  { title: 'Active Sessions', value: '42', delta: 'Now Online', icon: Shield, trend: 'neutral' as const, color: 'text-emerald-400' },
  { title: 'Admin Users', value: '12', delta: '7.7%', icon: Key, trend: 'neutral' as const, color: 'text-yellow-400' },
  { title: 'Roles Defined', value: '8', delta: '3 Custom', icon: Settings, trend: 'neutral' as const },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
}

const users: User[] = [
  { id: '1', name: 'John Anderson', email: 'john.anderson@company.com', role: 'Security Analyst', status: 'active', lastLogin: '2 minutes ago' },
  { id: '2', name: 'Sarah Mitchell', email: 'sarah.mitchell@company.com', role: 'Admin', status: 'active', lastLogin: '1 hour ago' },
  { id: '3', name: 'Michael Chen', email: 'michael.chen@company.com', role: 'SOC Manager', status: 'active', lastLogin: '3 hours ago' },
  { id: '4', name: 'Emily Rodriguez', email: 'emily.rodriguez@company.com', role: 'Analyst', status: 'active', lastLogin: '5 hours ago' },
  { id: '5', name: 'David Kim', email: 'david.kim@company.com', role: 'Viewer', status: 'inactive', lastLogin: '2 days ago' },
];

const roles = [
  { name: 'Admin', users: 12, permissions: ['Full Access', 'User Management', 'System Config'], color: 'text-red-400' },
  { name: 'SOC Manager', users: 8, permissions: ['View All', 'Manage Incidents', 'Generate Reports'], color: 'text-orange-400' },
  { name: 'Security Analyst', users: 45, permissions: ['View Threats', 'Analyze Logs', 'Create Incidents'], color: 'text-cyan-400' },
  { name: 'Viewer', users: 91, permissions: ['View Dashboards', 'View Reports'], color: 'text-blue-400' },
];

export function AdminPage() {
  const [selectedTab, setSelectedTab] = useState<'users' | 'roles'>('users');

  const columns = [
    { header: 'Name', accessor: 'name' as keyof User },
    { header: 'Email', accessor: 'email' as keyof User, className: 'font-mono text-xs' },
    { header: 'Role', accessor: 'role' as keyof User },
    {
      header: 'Status',
      accessor: (row: User) => {
        const variants = {
          active: 'success' as const,
          inactive: 'default' as const,
          suspended: 'critical' as const,
        };
        return <Badge variant={variants[row.status]}>{row.status}</Badge>;
      },
    },
    { header: 'Last Login', accessor: 'lastLogin' as keyof User },
    {
      header: 'Actions',
      accessor: () => (
        <button className="text-sm text-cyan-400 hover:text-cyan-300">Edit</button>
      ),
      className: 'text-center',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">User Management</h1>
          <p className="text-sm text-slate-400 mt-1">Manage users, roles, and permissions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 rounded-lg text-cyan-300 transition-all">
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-white/10">
        {[
          { id: 'users' as const, label: 'Users', count: 156 },
          { id: 'roles' as const, label: 'Roles & Permissions', count: 8 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-all relative ${
              selectedTab === tab.id ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-cyan-400/10 text-cyan-400">
              {tab.count}
            </span>
            {selectedTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
            )}
          </button>
        ))}
      </div>

      {selectedTab === 'users' && (
        <DataTable columns={columns} data={users} onRowClick={(row) => console.log('Edit user:', row.id)} />
      )}

      {selectedTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roles.map((role, index) => (
            <div
              key={index}
              className="bg-[#0F1729]/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-400/10">
                    <Shield className={`w-5 h-5 ${role.color}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-200">{role.name}</h3>
                    <p className="text-xs text-slate-400">{role.users} users assigned</p>
                  </div>
                </div>
                <button className="text-sm text-cyan-400 hover:text-cyan-300">Edit</button>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-medium">Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((permission, i) => (
                    <Badge key={i} variant="info">{permission}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
