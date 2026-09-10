import React, { useEffect, useMemo, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AnimatePresence, motion } from 'framer-motion';

import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileClock,
  FilterX,
  Fingerprint,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { toast } from 'sonner';

import { useAuth } from '../../hooks/useAuth';

import {
  adminRepository,
  AdminRole,
  AdminUser,
  AdminUserStatus,
  filterAdminAudit,
  filterAdminUsers,
  permissionCatalog,
  RoleInput,
  UserInput,
} from '../../services/admin.service';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Section = 'overview' | 'users' | 'roles' | 'audit';

type ConfirmState = {
  title: string;
  message: string;
  tone?: 'danger' | 'warning';
  confirmLabel: string;
  action: () => void;
} | null;

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const sectionByPath: Record<string, Section> = {
  '/admin': 'overview',
  '/admin/users': 'users',
  '/admin/roles': 'roles',
  '/admin/audit': 'audit',
};

const navItems = [
  {
    id: 'overview',
    label: 'Overview',
    mobileLabel: 'Overview',
    path: '/admin',
  },
  {
    id: 'users',
    label: 'Users',
    mobileLabel: 'Users',
    path: '/admin/users',
  },
  {
    id: 'roles',
    label: 'Roles & permissions',
    mobileLabel: 'Roles',
    path: '/admin/roles',
  },
  {
    id: 'audit',
    label: 'Audit activity',
    mobileLabel: 'Audit',
    path: '/admin/audit',
  },
] as const;

const panel =
  'border border-slate-700/70 bg-[#111b2e] shadow-[0_18px_50px_-32px_rgba(6,182,212,.32)]';

const input =
  'w-full rounded-[10px] border border-slate-700 bg-[#0b1425] px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-[10px] border border-slate-700 bg-slate-800/70 px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-700/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-40';

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-[10px] border border-cyan-300/30 bg-cyan-400 px-3.5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_8px_22px_-12px_rgba(34,211,238,.9)] transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(value: string | null, relative = false) {
  if (!value) return 'Never';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  if (!relative) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  const diff = Math.max(0, Date.now() - date.getTime());

  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  if (diff < minute) return 'Just now';
  if (diff < hour) {
    return `${Math.floor(diff / minute)}m ago`;
  }

  if (diff < day) {
    return `${Math.floor(diff / hour)}h ago`;
  }

  if (diff < 7 * day) {
    return `${Math.floor(diff / day)}d ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function initials(name: string) {
  const value = name.trim();

  if (!value) return '?';

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0] ?? '')
    .join('')
    .toUpperCase();
}

function roleName(roles: AdminRole[], id: string) {
  return roles.find(role => role.id === id)?.name ?? 'Unknown role';
}

function statusClass(status: AdminUserStatus) {
  if (status === 'active') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  }

  if (status === 'invited') {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-300';
  }

  return 'border-rose-400/20 bg-rose-400/10 text-rose-300';
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const csv = rows
    .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/* Admin Page                                                                 */
/* -------------------------------------------------------------------------- */

export function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user: authUser } = useAuth();

  const section = sectionByPath[location.pathname] ?? 'overview';

  const [state, setState] = useState(() => adminRepository.getState());

  const [userModal, setUserModal] = useState<AdminUser | 'new' | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const actor = useMemo(
    () => {
      const localOperator = state.users.find(
        user => user.email.toLowerCase() === authUser?.email?.toLowerCase()
      );

      return {
        id: localOperator?.id ?? authUser?.id ?? '1',
        name: authUser?.name ?? localOperator?.name ?? 'Demo Administrator',
        email: authUser?.email ?? localOperator?.email ?? 'admin@cybershield.ai',
      };
    },
    [authUser, state.users]
  );

  const tenantName = authUser?.organization_name?.trim() || 'CyberShield AI demo';

  const refresh = () => {
    setState(adminRepository.getState());
  };

  const mutate = (work: () => void, message: string) => {
    try {
      work();
      refresh();
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The action could not be completed.');
    }
  };

  useEffect(() => {
    setState(adminRepository.getState());
  }, [location.pathname]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1540px] space-y-5 overflow-x-clip pb-12">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <header className={`${panel} overflow-hidden rounded-[14px]`}>
        <div className="h-1 bg-[linear-gradient(90deg,#22d3ee,#14b8a6_48%,transparent_85%)]" />

        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Workspace
              <span className="px-1 text-slate-700">/</span>
              Administration
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
                Identity Control Plane
              </h1>

              <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                <LockKeyhole className="h-3 w-3" />
                Zero-trust admin
              </span>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Govern workforce identities, access policy, and administrative evidence.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-1 border-l border-slate-700 pl-4 text-xs">
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-[.14em] text-slate-600">
                  Operator
                </dt>
                <dd className="mt-1 max-w-40 truncate text-slate-300" title={actor.email}>
                  {actor.name}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-[.14em] text-slate-600">
                  Tenant scope
                </dt>
                <dd className="mt-1 max-w-40 truncate text-slate-300" title={tenantName}>
                  {tenantName}
                </dd>
              </div>
              <div className="col-span-2 mt-1 flex items-center gap-2 border-t border-slate-800 pt-2 text-emerald-300">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider">
                  Local persistence live
                </span>
              </div>
            </dl>

            <button type="button" className={primaryButton} onClick={() => setUserModal('new')}>
              <UserPlus className="h-4 w-4" />
              Add user
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="min-w-0 overflow-hidden border-t border-slate-800 px-1 sm:px-5">
          <nav
            aria-label="Administration sections"
            className="grid min-w-0 grid-cols-4 gap-0 sm:flex sm:gap-1"
          >
            {navItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                aria-current={section === item.id ? 'page' : undefined}
                className={`relative min-w-0 px-1 py-3 text-center text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 sm:shrink-0 sm:px-3 sm:text-sm ${
                  section === item.id ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="sm:hidden">{item.mobileLabel}</span>

                <span className="hidden sm:inline">{item.label}</span>

                {section === item.id && (
                  <motion.span
                    layoutId="admin-tab"
                    className="absolute inset-x-1 bottom-0 h-0.5 bg-cyan-300 sm:inset-x-3"
                  />
                )}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Main Content                                                       */}
      {/* ------------------------------------------------------------------ */}

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{
            opacity: 0,
            y: 5,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: -3,
          }}
          transition={{
            duration: 0.16,
          }}
        >
          {section === 'overview' && (
            <Overview state={state} navigate={navigate} onAddUser={() => setUserModal('new')} />
          )}

          {section === 'users' && (
            <UsersSection
              state={state}
              actor={actor}
              mutate={mutate}
              onEdit={setUserModal}
              setConfirm={setConfirm}
            />
          )}

          {section === 'roles' && (
            <RolesSection state={state} actor={actor} mutate={mutate} setConfirm={setConfirm} />
          )}

          {section === 'audit' && (
            <AuditSection entries={state.audit} actor={actor} refresh={refresh} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Demo Notice                                                        */}
      {/* ------------------------------------------------------------------ */}

      <p className="flex items-start gap-2 rounded-[10px] border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs leading-5 text-slate-500">
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        Demo administration data is stored only in this browser. Client-side access checks are not a
        substitute for production API authorization.
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* Modals                                                             */}
      {/* ------------------------------------------------------------------ */}

      <AnimatePresence>
        {userModal && (
          <UserModal
            user={userModal === 'new' ? null : userModal}
            roles={state.roles}
            onClose={() => setUserModal(null)}
            onSave={values =>
              mutate(
                () => {
                  if (userModal === 'new') {
                    adminRepository.createUser(values, actor);
                  } else {
                    adminRepository.updateUser(userModal.id, values, actor);
                  }

                  setUserModal(null);
                },
                userModal === 'new' ? 'User invitation created.' : 'User updated.'
              )
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirm && (
          <ConfirmDialog
            {...confirm}
            onClose={() => setConfirm(null)}
            onConfirm={() => {
              confirm.action();
              setConfirm(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================== */
/* Overview                                                                   */
/* ========================================================================== */

function Overview({
  state,
  navigate,
  onAddUser,
}: {
  state: ReturnType<typeof adminRepository.getState>;

  navigate: ReturnType<typeof useNavigate>;

  onAddUser: () => void;
}) {
  const active = state.users.filter(user => user.status === 'active').length;

  const invited = state.users.filter(user => user.status === 'invited').length;

  const suspended = state.users.filter(user => user.status === 'suspended').length;

  const privilegedRoleIds = new Set(
    state.roles
      .filter(role =>
        role.permissions.some(permission =>
          ['users.manage', 'roles.manage', 'settings.manage'].includes(permission)
        )
      )
      .map(role => role.id)
  );

  const privileged = state.users.filter(
    user => user.status === 'active' && privilegedRoleIds.has(user.roleId)
  ).length;

  const userTotal = state.users.length;

  const activePercentage = userTotal > 0 ? Math.round((active / userTotal) * 100) : 0;

  const permissionCount = permissionCatalog.reduce(
    (total, group) => total + group.permissions.length,
    0
  );

  const grantedPermissionCount = state.roles.reduce(
    (total, role) => total + role.permissions.length,
    0
  );

  const permissionCoverage = state.roles.length
    ? Math.round((grantedPermissionCount / (state.roles.length * permissionCount)) * 100)
    : 0;

  const perimeterSignals = [
    {
      label: 'Active identities',
      value: active,
      detail: `${activePercentage}% of ${userTotal}`,
      icon: UserCheck,
      tone: 'emerald',
    },
    {
      label: 'Privileged admins',
      value: privileged,
      detail: `${privilegedRoleIds.size} elevated roles`,
      icon: Fingerprint,
      tone: 'cyan',
    },
    {
      label: 'Unresolved invites',
      value: invited,
      detail: invited ? 'Require onboarding' : 'Perimeter clear',
      icon: UserPlus,
      tone: 'amber',
    },
    {
      label: 'Suspended identities',
      value: suspended,
      detail: suspended ? 'Access isolated' : 'None isolated',
      icon: LockKeyhole,
      tone: 'rose',
    },
    {
      label: 'Permission coverage',
      value: `${permissionCoverage}%`,
      detail: `${grantedPermissionCount}/${state.roles.length * permissionCount} grants`,
      icon: ShieldCheck,
      tone: 'slate',
    },
  ] as const;

  const roleCounts = state.roles.map(role => ({
    ...role,
    count: state.users.filter(user => user.roleId === role.id).length,
  }));

  const protectedAreas = permissionCatalog.map(group => ({
    name: group.area,
    permissions: group.permissions.map(permission => permission.id),
  }));

  return (
    <div className="space-y-5">
      {/* Identity perimeter */}
      <section
        aria-labelledby="identity-perimeter-title"
        className={`${panel} overflow-hidden rounded-[14px]`}
      >
        <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
              <Fingerprint className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-400">
                Trust surface / live state
              </p>
              <h2 id="identity-perimeter-title" className="mt-0.5 text-base font-semibold text-white">
                Identity perimeter
              </h2>
            </div>
          </div>
          <p className="max-w-xl text-xs leading-5 text-slate-500">
            Browser-local posture computed from current identities, role assignments, and permission
            grants.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-5">
          {perimeterSignals.map((signal, index) => {
            const tones = {
              emerald: 'border-emerald-400 bg-emerald-400/10 text-emerald-300',
              cyan: 'border-cyan-400 bg-cyan-400/10 text-cyan-300',
              amber: 'border-amber-400 bg-amber-400/10 text-amber-300',
              rose: 'border-rose-400 bg-rose-400/10 text-rose-300',
              slate: 'border-slate-400 bg-slate-400/10 text-slate-300',
            } as const;

            return (
              <motion.article
                key={signal.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="relative min-h-32 border-b border-slate-800 p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
              >
                <span
                  className={`absolute inset-y-4 left-0 w-0.5 border-l ${tones[signal.tone].split(' ')[0]}`}
                  aria-hidden="true"
                />
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[.13em] text-slate-500">
                    0{index + 1} / {signal.label}
                  </p>
                  <span className={`grid h-7 w-7 place-items-center ${tones[signal.tone]}`}>
                    <signal.icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {signal.value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{signal.detail}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* Access Map */}
      <section className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
        <article className={`${panel} min-w-0 rounded-[14px] p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-cyan-400">
                Access map
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">
                Roles across protected areas
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                A live map of which roles can reach each control plane.
              </p>
            </div>

            <button
              type="button"
              className={secondaryButton}
              onClick={() => navigate('/admin/roles')}
            >
              Review permissions
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 w-full max-w-full overflow-x-auto">
            <div className="min-w-[610px]">
              <div className="grid grid-cols-[170px_repeat(5,1fr)] gap-2 border-b border-slate-800 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <span>Role / members</span>

                {protectedAreas.map(area => (
                  <span key={area.name} className="text-center">
                    {area.name}
                  </span>
                ))}
              </div>

              <div className="divide-y divide-slate-800/80">
                {roleCounts.map(role => (
                  <div
                    key={role.id}
                    className="group grid grid-cols-[170px_repeat(5,1fr)] items-center gap-2 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">{role.name}</p>

                      <p className="text-xs text-slate-600">
                        {role.count} member
                        {role.count === 1 ? '' : 's'}
                      </p>
                    </div>

                    {protectedAreas.map(area => {
                      const granted = area.permissions.some(permission =>
                        role.permissions.includes(permission)
                      );

                      return (
                        <div
                          key={area.name}
                          className="relative flex h-8 items-center justify-center"
                        >
                          <span className="absolute h-px w-full bg-slate-800" />

                          <span
                            className={`relative z-10 grid h-5 w-5 place-items-center rounded-full border ${
                              granted
                                ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-300 shadow-[0_0_16px_-4px_#22d3ee]'
                                : 'border-slate-700 bg-slate-900 text-slate-700'
                            }`}
                          >
                            {granted && <Check className="h-3 w-3" />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* Access Posture */}
        <aside className={`${panel} rounded-[14px] p-5`}>
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-slate-500">
            Access posture
          </p>

          <h2 className="mt-1 text-lg font-semibold text-white">Items needing attention</h2>

          <div className="mt-5 space-y-3">
            <PostureItem
              color="rose"
              value={suspended}
              label="Suspended accounts"
              action={() => navigate('/admin/users')}
            />

            <PostureItem
              color="amber"
              value={invited}
              label="Pending invitations"
              action={() => navigate('/admin/users')}
            />

            <PostureItem
              color="cyan"
              value={privileged}
              label="Active privileged identities"
              action={() => navigate('/admin/roles')}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" className={primaryButton} onClick={onAddUser}>
              <Plus className="h-4 w-4" />
              Add user
            </button>

            <button
              type="button"
              className={secondaryButton}
              onClick={() => navigate('/admin/audit')}
            >
              <FileClock className="h-4 w-4" />
              Audit
            </button>
          </div>
        </aside>
      </section>

      {/* Distribution + Recent Activity */}
      <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <article className={`${panel} rounded-[14px] p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-slate-500">
                Distribution
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">Members by role</h2>
            </div>

            <Shield className="h-5 w-5 text-cyan-300" />
          </div>

          <div className="mt-5 space-y-4">
            {roleCounts.map((role, index) => {
              const percentage = userTotal > 0 ? (role.count / userTotal) * 100 : 0;

              return (
                <div key={role.id}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-slate-300">{role.name}</span>

                    <span className="font-mono text-slate-500">{role.count}</span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-sm bg-slate-800">
                    <motion.div
                      initial={{
                        width: 0,
                      }}
                      animate={{
                        width: role.count > 0 ? `${Math.max(5, percentage)}%` : '0%',
                      }}
                      transition={{
                        duration: 0.45,
                        delay: index * 0.06,
                      }}
                      className="h-full bg-[linear-gradient(90deg,#0891b2,#2dd4bf)]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className={`${panel} rounded-[14px]`}>
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-slate-500">
                Recent activity
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">Administration log</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/audit')}
              className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {state.audit.slice(0, 4).map(entry => (
              <AuditRow key={entry.id} entry={entry} compact />
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

/* ========================================================================== */
/* Posture Item                                                               */
/* ========================================================================== */

function PostureItem({
  color,
  value,
  label,
  action,
}: {
  color: 'rose' | 'amber' | 'cyan';
  value: number;
  label: string;
  action: () => void;
}) {
  const styles = {
    rose: 'bg-rose-400',
    amber: 'bg-amber-400',
    cyan: 'bg-cyan-400',
  };

  return (
    <button
      type="button"
      onClick={action}
      className="group flex w-full items-center gap-3 border-b border-slate-800 pb-3 text-left last:border-0"
    >
      <span className={`h-8 w-1 ${styles[color]}`} />

      <span className="text-xl font-semibold text-white">{value}</span>

      <span className="flex-1 text-sm text-slate-400">{label}</span>

      <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
    </button>
  );
}

/* ========================================================================== */
/* Users Section                                                              */
/* ========================================================================== */

function UsersSection({
  state,
  actor,
  mutate,
  onEdit,
  setConfirm,
}: {
  state: ReturnType<typeof adminRepository.getState>;

  actor: {
    id: string;
    name: string;
    email: string;
  };

  mutate: (work: () => void, message: string) => void;

  onEdit: (user: AdminUser) => void;

  setConfirm: (state: ConfirmState) => void;
}) {
  const [search, setSearch] = useState('');

  const [roleFilter, setRoleFilter] = useState('all');

  const [statusFilter, setStatusFilter] = useState('all');

  const [sort, setSort] = useState<{
    key: 'name' | 'email' | 'role' | 'status' | 'lastActive';

    direction: 'asc' | 'desc';
  }>({
    key: 'name',
    direction: 'asc',
  });

  const [page, setPage] = useState(1);

  const pageSize = 7;

  const filtered = useMemo(
    () =>
      filterAdminUsers(state.users, state.roles, {
        search,
        roleId: roleFilter,
        status: statusFilter as AdminUserStatus | 'all',
        sortKey: sort.key,
        sortDirection: sort.direction,
      }),
    [state, search, roleFilter, statusFilter, sort]
  );

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const currentPage = Math.min(page, pages);

  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter, sort.key, sort.direction]);

  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  const toggleSort = (key: typeof sort.key) => {
    setSort(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  /* ---------------------------------------------------------------------- */
  /* Export CSV                                                             */
  /* ---------------------------------------------------------------------- */

  const exportCsv = () => {
    if (!filtered.length) {
      toast.error('There are no users to export.');
      return;
    }

    const rows = [
      ['Name', 'Email', 'Role', 'Status', 'Last active', 'Created'],

      ...filtered.map(user => [
        user.name,
        user.email,
        roleName(state.roles, user.roleId),
        user.status,
        user.lastActive ?? '',
        user.createdAt,
      ]),
    ];

    downloadCsv(`cybershield-users-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    mutate(
      () => adminRepository.recordExport(actor, filtered.length),
      `${filtered.length} filtered users exported.`
    );
  };

  const clear = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const buildStatusConfirm = (user: AdminUser) => {
    const next: AdminUserStatus = user.status === 'active' ? 'suspended' : 'active';

    setConfirm({
      title: `${next === 'active' ? 'Activate' : 'Suspend'} ${user.name}?`,

      message:
        next === 'active'
          ? 'This restores workspace access immediately.'
          : 'This user will lose workspace access until reactivated.',

      tone: next === 'active' ? 'warning' : 'danger',

      confirmLabel: next === 'active' ? 'Activate user' : 'Suspend user',

      action: () =>
        mutate(
          () => adminRepository.setUserStatus(user.id, next, actor),
          `User ${next === 'active' ? 'activated' : 'suspended'}.`
        ),
    });
  };

  const buildDeleteConfirm = (user: AdminUser) => {
    setConfirm({
      title: `Delete ${user.name}?`,

      message: 'This removes the local user record and cannot be undone.',

      tone: 'danger',

      confirmLabel: 'Delete user',

      action: () => mutate(() => adminRepository.deleteUser(user.id, actor), 'User deleted.'),
    });
  };

  return (
    <section className={`${panel} overflow-hidden rounded-[14px]`}>
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:p-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">User directory</h2>

          <p className="mt-1 text-sm text-slate-500">
            Search, invite, and control workspace access.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className="relative block min-w-[240px]">
            <span className="sr-only">Search users</span>

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

            <input
              className={`${input} pl-9`}
              placeholder="Search name or email"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>

          <select
            aria-label="Filter by role"
            className={`${input} sm:w-48`}
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>

            {state.roles.map(role => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            className={`${input} sm:w-40`}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>

            <option value="active">Active</option>

            <option value="invited">Invited</option>

            <option value="suspended">Suspended</option>
          </select>

          <button
            type="button"
            className={secondaryButton}
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filter summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-300">{filtered.length}</span> of{' '}
          {state.users.length} users
        </p>

        {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200"
          >
            <FilterX className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[850px] text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/25">
              {(
                [
                  ['name', 'User'],
                  ['role', 'Role'],
                  ['status', 'Status'],
                  ['lastActive', 'Last active'],
                ] as const
              ).map(([key, label]) => (
                <th
                  key={key}
                  className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[.13em] text-slate-500"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="inline-flex items-center gap-1.5 hover:text-slate-300"
                  >
                    {label}

                    {sort.key === key ? (
                      sort.direction === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
              ))}

              <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[.13em] text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80">
            {visible.map(user => (
              <UserRow
                key={user.id}
                user={user}
                roles={state.roles}
                actorId={actor.id}
                onEdit={() => onEdit(user)}
                onStatus={() => buildStatusConfirm(user)}
                onDelete={() => buildDeleteConfirm(user)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-slate-800 md:hidden">
        {visible.map(user => (
          <UserCard
            key={user.id}
            user={user}
            roles={state.roles}
            onEdit={() => onEdit(user)}
            onStatus={() => buildStatusConfirm(user)}
            onDelete={() => buildDeleteConfirm(user)}
          />
        ))}
      </div>

      {!visible.length && (
        <EmptyState
          icon={Users}
          title="No users found"
          text="Adjust the search or filters to find a workspace member."
          action={
            <button type="button" className={secondaryButton} onClick={clear}>
              Clear filters
            </button>
          }
        />
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3">
        <p className="text-xs text-slate-500">
          Page {currentPage} of {pages}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous page"
            className={secondaryButton}
            disabled={currentPage <= 1}
            onClick={() => setPage(value => Math.max(1, value - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label="Next page"
            className={secondaryButton}
            disabled={currentPage >= pages}
            onClick={() => setPage(value => Math.min(pages, value + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* User Row                                                                   */
/* ========================================================================== */

function UserRow({
  user,
  roles,
  actorId,
  onEdit,
  onStatus,
  onDelete,
}: {
  user: AdminUser;
  roles: AdminRole[];
  actorId: string;
  onEdit: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="transition hover:bg-cyan-400/[.025]">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300">
            {initials(user.name)}
          </span>

          <div>
            <p className="text-sm font-medium text-slate-200">
              {user.name}

              {user.id === actorId && (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-cyan-400">You</span>
              )}
            </p>

            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-3.5 text-sm text-slate-400">{roleName(roles, user.roleId)}</td>

      <td className="px-5 py-3.5">
        <Status status={user.status} />
      </td>

      <td
        className="px-5 py-3.5 font-mono text-xs text-slate-500"
        title={formatDate(user.lastActive)}
      >
        {formatDate(user.lastActive, true)}
      </td>

      <td className="px-5 py-3.5">
        <RowActions onEdit={onEdit} onStatus={onStatus} onDelete={onDelete} status={user.status} />
      </td>
    </tr>
  );
}

/* ========================================================================== */
/* User Card                                                                  */
/* ========================================================================== */

function UserCard({
  user,
  roles,
  onEdit,
  onStatus,
  onDelete,
}: {
  user: AdminUser;
  roles: AdminRole[];
  onEdit: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold">
            {initials(user.name)}
          </span>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-slate-200">{user.name}</h3>

            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <Status status={user.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-3 text-xs">
        <div>
          <span className="text-slate-600">Role</span>

          <p className="mt-1 text-slate-300">{roleName(roles, user.roleId)}</p>
        </div>

        <div>
          <span className="text-slate-600">Last active</span>

          <p className="mt-1 text-slate-300">{formatDate(user.lastActive, true)}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" className={secondaryButton} onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>

        <button type="button" className={secondaryButton} onClick={onStatus}>
          {user.status === 'active' ? 'Suspend' : 'Activate'}
        </button>

        <button
          type="button"
          aria-label={`Delete ${user.name}`}
          className={`${secondaryButton} text-rose-300`}
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

/* ========================================================================== */
/* Status                                                                     */
/* ========================================================================== */

function Status({ status }: { status: AdminUserStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold capitalize ${statusClass(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

/* ========================================================================== */
/* Row Actions                                                                */
/* ========================================================================== */

function RowActions({
  onEdit,
  onStatus,
  onDelete,
  status,
}: {
  onEdit: () => void;
  onStatus: () => void;
  onDelete: () => void;
  status: AdminUserStatus;
}) {
  const [open, setOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', close);

    return () => {
      document.removeEventListener('mousedown', close);
    };
  }, []);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        aria-label="Open user actions"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="rounded-lg border border-transparent p-2 text-slate-500 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-[10px] border border-slate-700 bg-[#101a2d] p-1 shadow-2xl">
          <Action
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            icon={Pencil}
          >
            Edit user
          </Action>

          <Action
            onClick={() => {
              onStatus();
              setOpen(false);
            }}
            icon={UserCheck}
          >
            {status === 'active' ? 'Suspend user' : 'Activate user'}
          </Action>

          <Action
            danger
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            icon={Trash2}
          >
            Delete user
          </Action>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Action                                                                     */
/* ========================================================================== */

function Action({
  icon: Icon,
  children,
  danger,
  onClick,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
        danger ? 'text-rose-300 hover:bg-rose-400/10' : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

/* ========================================================================== */
/* Roles Section                                                              */
/* ========================================================================== */

function RolesSection({
  state,
  actor,
  mutate,
  setConfirm,
}: {
  state: ReturnType<typeof adminRepository.getState>;

  actor: {
    id: string;
    name: string;
    email: string;
  };

  mutate: (work: () => void, message: string) => void;

  setConfirm: (state: ConfirmState) => void;
}) {
  const [selectedId, setSelectedId] = useState(state.roles[0]?.id);

  const [createOpen, setCreateOpen] = useState(false);

  const selected = state.roles.find(role => role.id === selectedId) ?? state.roles[0];

  useEffect(() => {
    if (!state.roles.some(role => role.id === selectedId)) {
      setSelectedId(state.roles[0]?.id);
    }
  }, [state.roles, selectedId]);

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      {/* Roles list */}
      <aside className={`${panel} self-start overflow-hidden rounded-[14px]`}>
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h2 className="font-semibold text-white">Access roles</h2>

            <p className="mt-1 text-xs text-slate-500">{state.roles.length} defined roles</p>
          </div>

          <button
            type="button"
            aria-label="Create role"
            className={primaryButton}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2">
          {state.roles.map(role => {
            const members = state.users.filter(user => user.roleId === role.id).length;

            const isSelected = selected?.id === role.id;

            return (
              <button
                type="button"
                key={role.id}
                onClick={() => setSelectedId(role.id)}
                className={`mb-1 flex w-full items-center gap-3 rounded-[10px] border px-3 py-3 text-left transition ${
                  isSelected
                    ? 'border-cyan-400/25 bg-cyan-400/10'
                    : 'border-transparent hover:bg-slate-800/70'
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-lg ${
                    isSelected ? 'bg-cyan-400/15 text-cyan-300' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-200">
                    {role.name}
                  </span>

                  <span className="text-xs text-slate-500">
                    {members} member
                    {members === 1 ? '' : 's'}
                  </span>
                </span>

                {role.system && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    System
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Editor */}
      {selected && (
        <RoleEditor
          key={`${selected.id}-${selected.permissions.join('.')}-${selected.description}`}
          role={selected}
          memberCount={state.users.filter(user => user.roleId === selected.id).length}
          onSave={values =>
            mutate(
              () => adminRepository.updateRole(selected.id, values, actor),
              'Role permissions updated.'
            )
          }
          onDelete={() =>
            setConfirm({
              title: `Delete ${selected.name}?`,
              message: 'Custom roles can be deleted only when no users are assigned.',
              tone: 'danger',
              confirmLabel: 'Delete role',
              action: () =>
                mutate(() => adminRepository.deleteRole(selected.id, actor), 'Role deleted.'),
            })
          }
        />
      )}

      {/* Create Role Modal */}
      <AnimatePresence>
        {createOpen && (
          <RoleModal
            onClose={() => setCreateOpen(false)}
            onSave={values =>
              mutate(() => {
                const role = adminRepository.createRole(values, actor);

                setSelectedId(role.id);

                setCreateOpen(false);
              }, 'Custom role created.')
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================== */
/* Role Editor                                                                */
/* ========================================================================== */

function RoleEditor({
  role,
  memberCount,
  onSave,
  onDelete,
}: {
  role: AdminRole;
  memberCount: number;
  onSave: (input: RoleInput) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(role.name);

  const [description, setDescription] = useState(role.description);

  const [permissions, setPermissions] = useState(role.permissions);

  const [error, setError] = useState('');

  const toggle = (id: string) => {
    if (
      role.id === 'administrator' &&
      ['users.manage', 'roles.manage', 'settings.manage'].includes(id)
    ) {
      toast.error('Critical administrator permissions cannot be removed.');
      return;
    }

    setPermissions(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    );
  };

  const submit = () => {
    const cleanName = normalizeName(name);

    if (!cleanName) {
      setError('Role name is required.');
      return;
    }

    if (cleanName.length < 2) {
      setError('Role name must contain at least 2 characters.');
      return;
    }

    setError('');

    onSave({
      name: cleanName,
      description: description.trim(),
      permissions,
    });
  };

  return (
    <section className={`${panel} overflow-hidden rounded-[14px]`}>
      <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[10px] border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <Shield className="h-5 w-5" />
          </span>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{role.name}</h2>

              <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                {role.system ? 'System' : 'Custom'}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {memberCount} assigned member
              {memberCount === 1 ? '' : 's'} · {permissions.length} permissions
            </p>
          </div>
        </div>

        {!role.system && (
          <button type="button" className={`${secondaryButton} text-rose-300`} onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete role
          </button>
        )}
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(240px,.7fr)_1.3fr]">
        <div className="space-y-4">
          <label className="block text-xs font-medium text-slate-400">
            Role name
            <input
              className={`${input} mt-1.5`}
              value={name}
              disabled={role.system}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <label className="block text-xs font-medium text-slate-400">
            Description
            <textarea
              className={`${input} mt-1.5 min-h-28 resize-y`}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300"
            >
              {error}
            </p>
          )}

          <div className="rounded-[10px] border border-slate-800 bg-slate-950/30 p-3 text-xs leading-5 text-slate-500">
            <LockKeyhole className="mb-2 h-4 w-4 text-cyan-400" />
            System role names are fixed. Critical Administrator controls remain enabled to protect
            workspace continuity.
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
            Permission matrix
          </p>

          <div className="mt-3 divide-y divide-slate-800 rounded-[10px] border border-slate-800">
            {permissionCatalog.map(group => (
              <div key={group.area} className="grid gap-3 p-4 sm:grid-cols-[150px_1fr]">
                <div>
                  <p className="text-sm font-medium text-slate-200">{group.area}</p>

                  <p className="mt-1 text-xs text-slate-600">
                    {
                      group.permissions.filter(permission => permissions.includes(permission.id))
                        .length
                    }
                    /{group.permissions.length} granted
                  </p>
                </div>

                <div className="space-y-2">
                  {group.permissions.map(permission => {
                    const checked = permissions.includes(permission.id);

                    return (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-1.5 hover:border-slate-800 hover:bg-slate-900/60"
                      >
                        <span className="text-sm text-slate-400">{permission.label}</span>

                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(permission.id)}
                          className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-cyan-400/40"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-800 bg-slate-950/20 px-5 py-4">
        <button type="button" className={primaryButton} onClick={submit}>
          <Check className="h-4 w-4" />
          Save role
        </button>
      </div>
    </section>
  );
}

/* ========================================================================== */
/* Audit Section                                                              */
/* ========================================================================== */

function AuditSection({
  entries,
  actor,
  refresh,
}: {
  entries: ReturnType<typeof adminRepository.getState>['audit'];
  actor: { id: string; name: string; email: string };
  refresh: () => void;
}) {
  const [search, setSearch] = useState('');

  const [type, setType] = useState<'all' | 'user' | 'role' | 'export'>('all');

  const filtered = filterAdminAudit(entries, search, type);

  const exportCsv = () => {
    if (!filtered.length) {
      toast.error('There are no audit events to export.');
      return;
    }

    const rows: Array<Array<string | number | null>> = [
      ['Timestamp', 'Action', 'Actor', 'Target', 'Metadata'],
      ...filtered.map(entry => [
        entry.timestamp,
        entry.action,
        entry.actor,
        entry.target,
        entry.metadata,
      ]),
    ];

    downloadCsv(`cybershield-audit-${new Date().toISOString().slice(0, 10)}.csv`, rows);

    try {
      adminRepository.recordAuditExport(actor, filtered.length);
      refresh();
      toast.success(`${filtered.length} audit events exported.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Audit export could not be recorded.');
    }
  };

  return (
    <section className={`${panel} overflow-hidden rounded-[14px]`}>
      <div className="flex flex-col gap-4 border-b border-slate-800 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Audit activity</h2>

          <p className="mt-1 text-sm text-slate-500">
            A browser-local record of every administration change.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-[260px]">
            <span className="sr-only">Search audit activity</span>

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

            <input
              className={`${input} pl-9`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search actor, target, detail"
            />
          </label>

          <select
            aria-label="Filter activity type"
            className={`${input} sm:w-44`}
            value={type}
            onChange={e => setType(e.target.value as typeof type)}
          >
            <option value="all">All activity</option>

            <option value="user">User changes</option>

            <option value="role">Role changes</option>

            <option value="export">Exports</option>
          </select>

          <button
            type="button"
            className={secondaryButton}
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            <Download className="h-4 w-4" />
            Export ledger
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-800/80">
        {filtered.map(entry => (
          <AuditRow key={entry.id} entry={entry} />
        ))}
      </div>

      {!filtered.length && (
        <EmptyState
          icon={FileClock}
          title="No activity found"
          text="Try another search or activity type."
          action={
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                setSearch('');
                setType('all');
              }}
            >
              Clear filters
            </button>
          }
        />
      )}
    </section>
  );
}

/* ========================================================================== */
/* Audit Row                                                                  */
/* ========================================================================== */

function AuditRow({
  entry,
  compact = false,
}: {
  entry: ReturnType<typeof adminRepository.getState>['audit'][number];

  compact?: boolean;
}) {
  const isDelete = entry.action.endsWith('deleted');

  const isCreate = entry.action.endsWith('created');

  const Icon = entry.action.startsWith('role')
    ? ShieldCheck
    : entry.action.endsWith('.exported')
      ? Download
      : isDelete
        ? Trash2
        : isCreate
          ? UserPlus
          : Activity;

  return (
    <div
      className={`grid gap-3 px-5 ${
        compact ? 'py-3.5' : 'py-4 sm:grid-cols-[42px_1fr_auto] sm:items-center'
      }`}
    >
      <span
        className={`hidden h-9 w-9 place-items-center rounded-lg sm:grid ${
          isDelete
            ? 'bg-rose-400/10 text-rose-300'
            : isCreate
              ? 'bg-emerald-400/10 text-emerald-300'
              : 'bg-cyan-400/10 text-cyan-300'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0">
        <p className="text-sm text-slate-300">
          <span className="font-medium text-slate-100">{entry.actor}</span>{' '}
          <span className="text-slate-500">{entry.action.replace('.', ' ')}</span>{' '}
          <span className="font-medium">{entry.target}</span>
        </p>

        <p className="mt-1 truncate text-xs text-slate-500">{entry.metadata}</p>
      </div>

      <time
        className="font-mono text-[11px] text-slate-600"
        dateTime={entry.timestamp}
        title={formatDate(entry.timestamp)}
      >
        {formatDate(entry.timestamp, true)}
      </time>
    </div>
  );
}

/* ========================================================================== */
/* Modal Shell                                                                */
/* ========================================================================== */

/**
 * IMPORTANT:
 *
 * The modal is rendered into document.body using createPortal().
 *
 * This prevents transformed ancestors, such as the page-level Framer Motion
 * wrapper, from changing the containing block of position: fixed.
 */
function ModalShell({
  title,
  eyebrow,
  onClose,
  children,
  footer,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const previousFocus = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    return () => setMounted(false);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!mounted) return;

    previousFocus.current = document.activeElement as HTMLElement | null;

    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

    const frame = requestAnimationFrame(() => {
      const initial =
        dialogRef.current?.querySelector<HTMLElement>('[data-dialog-initial-focus]') ??
        dialogRef.current?.querySelector<HTMLElement>(focusableSelector);

      initial?.focus({
        preventScroll: true,
      });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];

      const last = focusable[focusable.length - 1];

      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);

      document.removeEventListener('keydown', handleKeyDown);

      previousFocus.current?.focus({
        preventScroll: true,
      });
    };
  }, [mounted]);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        initial={{
          opacity: 0,
          scale: 0.97,
          y: 8,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: 0.98,
          y: 5,
        }}
        transition={{
          duration: 0.16,
        }}
        className="my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[14px] border border-slate-700 bg-[#101a2d] shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-400">
              {eyebrow}
            </p>

            <h2 id="admin-dialog-title" className="mt-1 text-xl font-semibold text-white">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">{children}</div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-800 bg-slate-950/20 px-5 py-4">
          {footer}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ========================================================================== */
/* User Modal                                                                 */
/* ========================================================================== */

function UserModal({
  user,
  roles,
  onClose,
  onSave,
}: {
  user: AdminUser | null;
  roles: AdminRole[];
  onClose: () => void;
  onSave: (input: UserInput) => void;
}) {
  const [name, setName] = useState(user?.name ?? '');

  const [email, setEmail] = useState(user?.email ?? '');

  const [roleId, setRoleId] = useState(user?.roleId ?? roles[0]?.id ?? 'security-analyst');

  const [status, setStatus] = useState<AdminUserStatus>(user?.status ?? 'invited');

  const [error, setError] = useState('');

  useEffect(() => {
    setName(user?.name ?? '');

    setEmail(user?.email ?? '');

    setRoleId(user?.roleId ?? roles[0]?.id ?? 'security-analyst');

    setStatus(user?.status ?? 'invited');

    setError('');
  }, [user, roles]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const cleanName = normalizeName(name);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError('Name is required.');
      return;
    }

    if (cleanName.length < 2) {
      setError('Name must contain at least 2 characters.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!roleId) {
      setError('Select a role.');
      return;
    }

    setError('');

    onSave({
      name: cleanName,
      email: cleanEmail,
      roleId,
      status,
    });
  };

  return (
    <ModalShell
      title={user ? 'Edit user' : 'Invite a user'}
      eyebrow="User access"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>

          <button form="user-form" className={primaryButton} type="submit">
            {user ? 'Save changes' : 'Create invitation'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-medium text-slate-400">
          Full name
          <input
            data-dialog-initial-focus
            className={`${input} mt-1.5`}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Samira Joshi"
            autoComplete="name"
          />
        </label>

        <label className="block text-xs font-medium text-slate-400">
          Work email
          <input
            type="email"
            className={`${input} mt-1.5`}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoComplete="email"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-400">
            Role
            <select
              className={`${input} mt-1.5`}
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
            >
              {roles.length === 0 && <option value="">No roles available</option>}

              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-400">
            Status
            <select
              className={`${input} mt-1.5`}
              value={status}
              onChange={e => setStatus(e.target.value as AdminUserStatus)}
            >
              <option value="invited">Invited</option>

              <option value="active">Active</option>

              <option value="suspended">Suspended</option>
            </select>
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300"
          >
            {error}
          </p>
        )}

        <p className="text-xs leading-5 text-slate-600">
          Invitations are simulated locally in this frontend demo; no email is sent.
        </p>
      </form>
    </ModalShell>
  );
}

/* ========================================================================== */
/* Role Modal                                                                 */
/* ========================================================================== */

function RoleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: RoleInput) => void;
}) {
  const [name, setName] = useState('');

  const [description, setDescription] = useState('');

  const [permissions, setPermissions] = useState<string[]>(['dashboard.view']);

  const [error, setError] = useState('');

  const submit = () => {
    const cleanName = normalizeName(name);

    if (!cleanName) {
      setError('Role name is required.');
      return;
    }

    if (cleanName.length < 2) {
      setError('Role name must contain at least 2 characters.');
      return;
    }

    setError('');

    onSave({
      name: cleanName,
      description: description.trim(),
      permissions,
    });
  };

  return (
    <ModalShell
      title="Create custom role"
      eyebrow="Access policy"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>

          <button type="button" className={primaryButton} onClick={submit}>
            Create role
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-xs font-medium text-slate-400">
          Role name
          <input
            data-dialog-initial-focus
            className={`${input} mt-1.5`}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Incident coordinator"
          />
        </label>

        <label className="block text-xs font-medium text-slate-400">
          Description
          <textarea
            className={`${input} mt-1.5 min-h-20`}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what this role is responsible for..."
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-slate-400">Starting permissions</legend>

          <div className="max-h-52 divide-y divide-slate-800 overflow-y-auto rounded-[10px] border border-slate-800">
            {permissionCatalog
              .flatMap(group => group.permissions)
              .map(permission => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm text-slate-300"
                >
                  <span>{permission.label}</span>

                  <input
                    type="checkbox"
                    checked={permissions.includes(permission.id)}
                    onChange={() =>
                      setPermissions(current =>
                        current.includes(permission.id)
                          ? current.filter(item => item !== permission.id)
                          : [...current, permission.id]
                      )
                    }
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-cyan-400/40"
                  />
                </label>
              ))}
          </div>
        </fieldset>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300"
          >
            {error}
          </p>
        )}
      </div>
    </ModalShell>
  );
}

/* ========================================================================== */
/* Confirm Dialog                                                             */
/* ========================================================================== */

function ConfirmDialog({
  title,
  message,
  tone = 'warning',
  confirmLabel,
  onClose,
  onConfirm,
}: NonNullable<ConfirmState> & {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      title={title}
      eyebrow="Confirm action"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            data-dialog-initial-focus
            className={`${primaryButton} ${
              tone === 'danger'
                ? '!border-rose-300/30 !bg-rose-400 !text-white hover:!bg-rose-300'
                : ''
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
            tone === 'danger' ? 'bg-rose-400/10 text-rose-300' : 'bg-amber-400/10 text-amber-300'
          }`}
        >
          <CircleAlert className="h-5 w-5" />
        </span>

        <p className="pt-1 text-sm leading-6 text-slate-400">{message}</p>
      </div>
    </ModalShell>
  );
}

/* ========================================================================== */
/* Empty State                                                                */
/* ========================================================================== */

function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-64 place-items-center p-6 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-[10px] border border-slate-800 bg-slate-900 text-slate-500">
          <Icon className="h-5 w-5" />
        </span>

        <h3 className="mt-3 text-sm font-semibold text-slate-200">{title}</h3>

        <p className="mt-1 text-sm text-slate-500">{text}</p>

        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
