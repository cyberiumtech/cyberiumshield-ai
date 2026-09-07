export type AdminUserStatus = 'active' | 'invited' | 'suspended';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: AdminUserStatus;
  lastActive: string | null;
  createdAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  system: boolean;
}

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.status'
  | 'user.deleted'
  | 'role.created'
  | 'role.updated'
  | 'role.deleted'
  | 'users.exported';

export interface AuditEntry {
  id: string;
  actor: string;
  action: AuditAction;
  target: string;
  timestamp: string;
  metadata: string;
}

export interface AdminState {
  version: 1;
  users: AdminUser[];
  roles: AdminRole[];
  audit: AuditEntry[];
}
export interface AdminActor {
  id: string;
  name: string;
  email: string;
}
export interface UserInput {
  name: string;
  email: string;
  roleId: string;
  status?: AdminUserStatus;
}
export interface RoleInput {
  name: string;
  description: string;
  permissions: string[];
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type AdminUserSortKey = 'name' | 'email' | 'role' | 'status' | 'lastActive';
export interface AdminUserQuery {
  search?: string;
  roleId?: string;
  status?: AdminUserStatus | 'all';
  sortKey?: AdminUserSortKey;
  sortDirection?: 'asc' | 'desc';
}
export type AuditGroup = 'all' | 'user' | 'role' | 'export';

export const ADMIN_STORAGE_KEY = 'cybershield_admin_workspace_v1';
export interface PermissionGroup {
  area: string;
  permissions: Array<{ id: string; label: string }>;
}
export const permissionCatalog: PermissionGroup[] = [
  { area: 'Dashboard', permissions: [{ id: 'dashboard.view', label: 'View dashboard' }] },
  {
    area: 'Scans',
    permissions: [
      { id: 'scans.view', label: 'View scans' },
      { id: 'scans.manage', label: 'Run and manage scans' },
    ],
  },
  {
    area: 'Reports',
    permissions: [
      { id: 'reports.view', label: 'View reports' },
      { id: 'reports.export', label: 'Export reports' },
    ],
  },
  {
    area: 'Users',
    permissions: [
      { id: 'users.view', label: 'View users' },
      { id: 'users.manage', label: 'Manage users' },
    ],
  },
  {
    area: 'Roles & settings',
    permissions: [
      { id: 'roles.view', label: 'View roles' },
      { id: 'roles.manage', label: 'Manage roles' },
      { id: 'settings.manage', label: 'Manage settings' },
    ],
  },
];

export const criticalAdminPermissions = ['users.manage', 'roles.manage', 'settings.manage'];
const allPermissions = permissionCatalog.flatMap(group =>
  group.permissions.map(permission => permission.id)
);

export function filterAdminUsers(users: AdminUser[], roles: AdminRole[], query: AdminUserQuery) {
  const search = query.search?.trim().toLowerCase() ?? '';
  const roleById = new Map(roles.map(role => [role.id, role.name]));
  const sortKey = query.sortKey ?? 'name';
  const direction = query.sortDirection === 'desc' ? -1 : 1;
  return users
    .filter(
      user =>
        (!search ||
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search)) &&
        (!query.roleId || query.roleId === 'all' || user.roleId === query.roleId) &&
        (!query.status || query.status === 'all' || user.status === query.status)
    )
    .sort((a, b) => {
      const aValue = sortKey === 'role' ? (roleById.get(a.roleId) ?? '') : (a[sortKey] ?? '');
      const bValue = sortKey === 'role' ? (roleById.get(b.roleId) ?? '') : (b[sortKey] ?? '');
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
}

export function filterAdminAudit(entries: AuditEntry[], search: string, group: AuditGroup) {
  const normalizedSearch = search.trim().toLowerCase();
  return entries.filter(entry => {
    const matchesSearch =
      !normalizedSearch ||
      [entry.actor, entry.target, entry.metadata].some(value =>
        value.toLowerCase().includes(normalizedSearch)
      );
    const matchesGroup =
      group === 'all' ||
      (group === 'user' && entry.action.startsWith('user.')) ||
      (group === 'role' && entry.action.startsWith('role.')) ||
      (group === 'export' && entry.action === 'users.exported');
    return matchesSearch && matchesGroup;
  });
}

function isoDaysAgo(days: number, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function createSeedState(): AdminState {
  const roles: AdminRole[] = [
    {
      id: 'administrator',
      name: 'Administrator',
      description: 'Full workspace control and access governance.',
      permissions: [...allPermissions],
      system: true,
    },
    {
      id: 'security-analyst',
      name: 'Security Analyst',
      description: 'Investigate threats, run scans, and prepare reports.',
      permissions: [
        'dashboard.view',
        'scans.view',
        'scans.manage',
        'reports.view',
        'reports.export',
      ],
      system: true,
    },
    {
      id: 'viewer',
      name: 'Viewer',
      description: 'Read-only visibility across operational dashboards.',
      permissions: ['dashboard.view', 'scans.view', 'reports.view'],
      system: true,
    },
  ];
  const users: AdminUser[] = [
    {
      id: '1',
      name: 'Demo Administrator',
      email: 'admin@cybershield.ai',
      roleId: 'administrator',
      status: 'active',
      lastActive: new Date().toISOString(),
      createdAt: isoDaysAgo(180),
    },
    {
      id: 'usr-2',
      name: 'Aarav Sharma',
      email: 'aarav@cybershield.ai',
      roleId: 'security-analyst',
      status: 'active',
      lastActive: isoDaysAgo(0, 8),
      createdAt: isoDaysAgo(130),
    },
    {
      id: 'usr-3',
      name: 'Maya Thapa',
      email: 'maya@cybershield.ai',
      roleId: 'security-analyst',
      status: 'active',
      lastActive: isoDaysAgo(1),
      createdAt: isoDaysAgo(95),
    },
    {
      id: 'usr-4',
      name: 'Noah Williams',
      email: 'noah@northstar.example',
      roleId: 'viewer',
      status: 'invited',
      lastActive: null,
      createdAt: isoDaysAgo(2),
    },
    {
      id: 'usr-5',
      name: 'Sofia Garcia',
      email: 'sofia@cybershield.ai',
      roleId: 'viewer',
      status: 'active',
      lastActive: isoDaysAgo(4),
      createdAt: isoDaysAgo(85),
    },
    {
      id: 'usr-6',
      name: 'Ethan Lee',
      email: 'ethan@cybershield.ai',
      roleId: 'security-analyst',
      status: 'suspended',
      lastActive: isoDaysAgo(18),
      createdAt: isoDaysAgo(70),
    },
    {
      id: 'usr-7',
      name: 'Priya Rai',
      email: 'priya@cybershield.ai',
      roleId: 'administrator',
      status: 'active',
      lastActive: isoDaysAgo(0, 7),
      createdAt: isoDaysAgo(64),
    },
    {
      id: 'usr-8',
      name: 'Liam Brown',
      email: 'liam@partner.example',
      roleId: 'viewer',
      status: 'invited',
      lastActive: null,
      createdAt: isoDaysAgo(8),
    },
    {
      id: 'usr-9',
      name: 'Anisha Karki',
      email: 'anisha@cybershield.ai',
      roleId: 'security-analyst',
      status: 'active',
      lastActive: isoDaysAgo(2),
      createdAt: isoDaysAgo(42),
    },
    {
      id: 'usr-10',
      name: 'Oliver Smith',
      email: 'oliver@cybershield.ai',
      roleId: 'viewer',
      status: 'active',
      lastActive: isoDaysAgo(7),
      createdAt: isoDaysAgo(40),
    },
    {
      id: 'usr-11',
      name: 'Isha Gurung',
      email: 'isha@partner.example',
      roleId: 'viewer',
      status: 'invited',
      lastActive: null,
      createdAt: isoDaysAgo(3),
    },
    {
      id: 'usr-12',
      name: 'Lucas Martin',
      email: 'lucas@cybershield.ai',
      roleId: 'security-analyst',
      status: 'active',
      lastActive: isoDaysAgo(1, 14),
      createdAt: isoDaysAgo(22),
    },
  ];
  const audit: AuditEntry[] = [
    {
      id: 'audit-seed-1',
      actor: 'Demo Administrator',
      action: 'user.created',
      target: 'Isha Gurung',
      timestamp: isoDaysAgo(3, 11),
      metadata: 'Invitation created for isha@partner.example',
    },
    {
      id: 'audit-seed-2',
      actor: 'Priya Rai',
      action: 'user.status',
      target: 'Ethan Lee',
      timestamp: isoDaysAgo(6, 16),
      metadata: 'Account suspended pending review',
    },
    {
      id: 'audit-seed-3',
      actor: 'Demo Administrator',
      action: 'role.updated',
      target: 'Security Analyst',
      timestamp: isoDaysAgo(9, 10),
      metadata: 'Report export access enabled',
    },
  ];
  return { version: 1, users, roles, audit };
}

export class AdminRepository {
  constructor(private storage: StorageLike = window.localStorage) {}

  getState(): AdminState {
    const raw = this.storage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AdminState;
        if (parsed.version === 1 && Array.isArray(parsed.users) && Array.isArray(parsed.roles))
          return parsed;
      } catch {
        /* reseed corrupted local demo data */
      }
    }
    const seeded = createSeedState();
    this.save(seeded);
    return seeded;
  }

  private save(state: AdminState) {
    this.storage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(state));
  }
  private audit(
    state: AdminState,
    actor: AdminActor,
    action: AuditAction,
    target: string,
    metadata: string
  ) {
    state.audit = [
      {
        id: crypto.randomUUID?.() ?? `audit-${Date.now()}`,
        actor: actor.name || actor.email,
        action,
        target,
        timestamp: new Date().toISOString(),
        metadata,
      },
      ...state.audit,
    ].slice(0, 100);
  }
  private validateUser(state: AdminState, input: UserInput, existingId?: string) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) throw new Error('Name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
    if (!state.roles.some(role => role.id === input.roleId))
      throw new Error('Select a valid role.');
    if (state.users.some(user => user.id !== existingId && user.email.toLowerCase() === email))
      throw new Error('A user with this email already exists.');
    return { name, email };
  }
  private activeAdminCount(state: AdminState) {
    return state.users.filter(user => user.roleId === 'administrator' && user.status === 'active')
      .length;
  }
  private assertAdminContinuity(
    state: AdminState,
    user: AdminUser,
    nextRole?: string,
    nextStatus?: AdminUserStatus
  ) {
    const removesActiveAdmin =
      user.roleId === 'administrator' &&
      user.status === 'active' &&
      ((nextRole && nextRole !== 'administrator') || (nextStatus && nextStatus !== 'active'));
    if (removesActiveAdmin && this.activeAdminCount(state) <= 1)
      throw new Error('The last active administrator cannot be suspended or demoted.');
  }

  createUser(input: UserInput, actor: AdminActor) {
    const state = this.getState();
    const clean = this.validateUser(state, input);
    const user: AdminUser = {
      id: crypto.randomUUID?.() ?? `user-${Date.now()}`,
      ...clean,
      roleId: input.roleId,
      status: input.status ?? 'invited',
      lastActive: null,
      createdAt: new Date().toISOString(),
    };
    state.users.unshift(user);
    this.audit(state, actor, 'user.created', user.name, `${user.email} · ${user.status}`);
    this.save(state);
    return user;
  }
  updateUser(id: string, input: UserInput, actor: AdminActor) {
    const state = this.getState();
    const user = state.users.find(item => item.id === id);
    if (!user) throw new Error('User not found.');
    const clean = this.validateUser(state, input, id);
    this.assertAdminContinuity(state, user, input.roleId, input.status ?? user.status);
    Object.assign(user, clean, { roleId: input.roleId, status: input.status ?? user.status });
    this.audit(state, actor, 'user.updated', user.name, `Profile updated · ${user.email}`);
    this.save(state);
    return user;
  }
  setUserStatus(id: string, status: AdminUserStatus, actor: AdminActor) {
    const state = this.getState();
    const user = state.users.find(item => item.id === id);
    if (!user) throw new Error('User not found.');
    if (id === actor.id && status === 'suspended')
      throw new Error('You cannot suspend your own account.');
    this.assertAdminContinuity(state, user, undefined, status);
    user.status = status;
    if (status === 'active') user.lastActive = new Date().toISOString();
    this.audit(state, actor, 'user.status', user.name, `Status changed to ${status}`);
    this.save(state);
    return user;
  }
  deleteUser(id: string, actor: AdminActor) {
    const state = this.getState();
    const user = state.users.find(item => item.id === id);
    if (!user) throw new Error('User not found.');
    if (id === actor.id) throw new Error('You cannot delete your own account.');
    this.assertAdminContinuity(state, user, 'viewer', 'suspended');
    state.users = state.users.filter(item => item.id !== id);
    this.audit(state, actor, 'user.deleted', user.name, `${user.email} removed`);
    this.save(state);
  }
  createRole(input: RoleInput, actor: AdminActor) {
    const state = this.getState();
    const name = input.name.trim();
    if (!name) throw new Error('Role name is required.');
    if (state.roles.some(role => role.name.toLowerCase() === name.toLowerCase()))
      throw new Error('A role with this name already exists.');
    const role: AdminRole = {
      id: `custom-${Date.now()}`,
      name,
      description: input.description.trim(),
      permissions: [...new Set(input.permissions)].filter(permission =>
        allPermissions.includes(permission)
      ),
      system: false,
    };
    state.roles.push(role);
    this.audit(
      state,
      actor,
      'role.created',
      role.name,
      `${role.permissions.length} permissions assigned`
    );
    this.save(state);
    return role;
  }
  updateRole(id: string, input: RoleInput, actor: AdminActor) {
    const state = this.getState();
    const role = state.roles.find(item => item.id === id);
    if (!role) throw new Error('Role not found.');
    const name = input.name.trim();
    if (!name) throw new Error('Role name is required.');
    if (state.roles.some(item => item.id !== id && item.name.toLowerCase() === name.toLowerCase()))
      throw new Error('A role with this name already exists.');
    const permissions = [...new Set(input.permissions)].filter(permission =>
      allPermissions.includes(permission)
    );
    if (id === 'administrator')
      criticalAdminPermissions.forEach(permission => {
        if (!permissions.includes(permission)) permissions.push(permission);
      });
    if (!role.system) role.name = name;
    role.description = input.description.trim();
    role.permissions = permissions;
    this.audit(
      state,
      actor,
      'role.updated',
      role.name,
      `${permissions.length} permissions assigned`
    );
    this.save(state);
    return role;
  }
  deleteRole(id: string, actor: AdminActor) {
    const state = this.getState();
    const role = state.roles.find(item => item.id === id);
    if (!role) throw new Error('Role not found.');
    if (role.system) throw new Error('System roles cannot be deleted.');
    if (state.users.some(user => user.roleId === id))
      throw new Error('Reassign role members before deleting this role.');
    state.roles = state.roles.filter(item => item.id !== id);
    this.audit(state, actor, 'role.deleted', role.name, 'Custom role removed');
    this.save(state);
  }
  recordExport(actor: AdminActor, count: number) {
    const state = this.getState();
    this.audit(
      state,
      actor,
      'users.exported',
      'User directory',
      `${count} filtered records exported`
    );
    this.save(state);
  }
}

export const adminRepository = new AdminRepository();
