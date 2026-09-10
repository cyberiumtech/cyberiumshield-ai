import { beforeEach, describe, expect, it } from 'vitest';
import { AdminRepository, filterAdminAudit, filterAdminUsers } from './admin.service';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('AdminRepository', () => {
  let repository: AdminRepository;
  const actor = { id: '1', name: 'Demo Administrator', email: 'admin@cybershield.ai' };

  beforeEach(() => {
    repository = new AdminRepository(new MemoryStorage());
  });

  it('seeds versioned users, roles, and audit data once', () => {
    const state = repository.getState();
    expect(state.version).toBe(1);
    expect(state.users.length).toBeGreaterThan(10);
    expect(state.roles.map(role => role.id)).toEqual(
      expect.arrayContaining(['administrator', 'security-analyst', 'viewer'])
    );
    expect(state.audit.length).toBeGreaterThan(0);
  });

  it('creates and updates a unique user and records mutations', () => {
    const created = repository.createUser(
      { name: 'Test Operator', email: 'operator@example.com', roleId: 'viewer' },
      actor
    );
    expect(created.status).toBe('invited');
    repository.updateUser(
      created.id,
      {
        name: 'Test Analyst',
        email: 'operator@example.com',
        roleId: 'security-analyst',
        status: 'active',
      },
      actor
    );
    const state = repository.getState();
    expect(state.users.find(user => user.id === created.id)).toMatchObject({
      name: 'Test Analyst',
      status: 'active',
    });
    expect(state.audit[0].action).toBe('user.updated');
    expect(() =>
      repository.createUser(
        { name: 'Duplicate', email: 'operator@example.com', roleId: 'viewer' },
        actor
      )
    ).toThrow(/already exists/i);
  });

  it('filters by search, role, and status and sorts the result', () => {
    const state = repository.getState();
    const result = filterAdminUsers(state.users, state.roles, {
      search: 'cybershield.ai',
      roleId: 'security-analyst',
      status: 'active',
      sortKey: 'name',
      sortDirection: 'desc',
    });
    expect(result.length).toBeGreaterThan(1);
    expect(
      result.every(user => user.roleId === 'security-analyst' && user.status === 'active')
    ).toBe(true);
    expect(result.map(user => user.name)).toEqual(
      [...result.map(user => user.name)].sort().reverse()
    );
  });

  it('keeps user changes and exports in distinct audit groups', () => {
    repository.recordExport(actor, 4);
    repository.recordAuditExport(actor, 2);
    const entries = repository.getState().audit;
    expect(filterAdminAudit(entries, '', 'export').map(entry => entry.action)).toEqual([
      'audit.exported',
      'users.exported',
    ]);
    expect(
      filterAdminAudit(entries, '', 'user').every(entry => entry.action.startsWith('user.'))
    ).toBe(true);
    expect(
      filterAdminAudit(entries, '', 'user').some(entry => entry.action === 'users.exported')
    ).toBe(false);
  });

  it('prevents self deletion and suspension', () => {
    expect(() => repository.deleteUser(actor.id, actor)).toThrow(/own account/i);
    expect(() => repository.setUserStatus(actor.id, 'suspended', actor)).toThrow(/own account/i);
  });

  it('protects the last active administrator', () => {
    const otherAdmin = repository
      .getState()
      .users.find(user => user.roleId === 'administrator' && user.id !== actor.id)!;
    repository.setUserStatus(otherAdmin.id, 'suspended', actor);
    expect(() =>
      repository.updateUser(
        actor.id,
        { name: 'Demo Administrator', email: actor.email, roleId: 'viewer', status: 'active' },
        actor
      )
    ).toThrow(/last active administrator/i);
  });

  it('creates and updates a custom role while preserving Administrator critical access', () => {
    const role = repository.createRole(
      {
        name: 'Incident Coordinator',
        description: 'Coordinates response',
        permissions: ['dashboard.view'],
      },
      actor
    );
    repository.updateRole(
      role.id,
      {
        name: 'Incident Lead',
        description: 'Leads response',
        permissions: ['dashboard.view', 'reports.view'],
      },
      actor
    );
    expect(repository.getState().roles.find(item => item.id === role.id)).toMatchObject({
      name: 'Incident Lead',
      permissions: ['dashboard.view', 'reports.view'],
    });
    repository.updateRole(
      'administrator',
      { name: 'Administrator', description: 'Updated', permissions: [] },
      actor
    );
    expect(
      repository.getState().roles.find(item => item.id === 'administrator')?.permissions
    ).toEqual(expect.arrayContaining(['users.manage', 'roles.manage', 'settings.manage']));
  });
});
