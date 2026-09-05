import React, { useMemo, useState } from 'react';
import { Search, Users, UserPlus, Shield, Settings, Key, X } from 'lucide-react';
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

const initialUsers: User[] = [
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
  const [userList, setUserList] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const visibleUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return userList;
    return userList.filter((user) =>
      [user.name, user.email, user.role, user.status].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [searchTerm, userList]);

  const saveUser = (user: User) => {
    setUserList((currentUsers) => {
      const existingUser = currentUsers.some((currentUser) => currentUser.id === user.id);
      return existingUser
        ? currentUsers.map((currentUser) => (currentUser.id === user.id ? user : currentUser))
        : [...currentUsers, user];
    });
    setEditingUser(null);
    setIsAddUserOpen(false);
  };

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
        return <Badge variant={variants[row.status]}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</Badge>;
      },
    },
    { header: 'Last Login', accessor: 'lastLogin' as keyof User },
    {
      header: 'Actions',
      accessor: (row: User) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            const selectedUser = userList.find((user) => user.id === row.id);
            if (selectedUser) setEditingUser(selectedUser);
          }}
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          Edit
        </button>
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
        <button
          onClick={() => setIsAddUserOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 rounded-lg text-cyan-300 transition-all"
        >
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
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter users..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-slate-200 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 placeholder:text-slate-500"
            />
          </div>
          <DataTable columns={columns} data={visibleUsers} />
        </div>
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

      {(isAddUserOpen || editingUser) && (
        <UserFormModal
          user={editingUser}
          onClose={() => {
            setIsAddUserOpen(false);
            setEditingUser(null);
          }}
          onSave={saveUser}
        />
      )}
    </div>
  );
}

function UserFormModal({
  user,
  onClose,
  onSave,
}: {
  user: User | null;
  onClose: () => void;
  onSave: (user: User) => void;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState(user?.role ?? 'Security Analyst');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      id: user?.id ?? `user-${Date.now()}`,
      name,
      email,
      role,
      status: user?.status ?? 'active',
      lastLogin: user?.lastLogin ?? 'Never',
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border border-white/10 bg-[#0F1729] p-6 shadow-2xl shadow-cyan-950/30">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Administration</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-100">{user ? 'Edit user' : 'Add user'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-slate-100" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <label className="block text-sm text-slate-300">Name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-400/50" /></label>
          <label className="block text-sm text-slate-300">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none focus:border-cyan-400/50" /></label>
          <label className="block text-sm text-slate-300">Role<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-400/50"><option>Security Analyst</option><option>Admin</option><option>SOC Manager</option><option>Analyst</option><option>Viewer</option></select></label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
          <button type="submit" className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-400/20">Save user</button>
        </div>
      </form>
    </div>
  );
}
