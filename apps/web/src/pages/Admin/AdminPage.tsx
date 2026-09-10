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

/* ─────────────────────────────────────────────────────────────
   FONT STACK
   ───────────────────────────────────────────────────────────── */
const FONT_SANS = "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace";

/* ─────────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────────── */
type Section = 'overview' | 'users' | 'roles' | 'audit';

type ConfirmState = {
  title: string;
  message: string;
  tone?: 'danger' | 'warning';
  confirmLabel: string;
  action: () => void;
} | null;

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────────── */
const sectionByPath: Record<string, Section> = {
  '/admin': 'overview',
  '/admin/users': 'users',
  '/admin/roles': 'roles',
  '/admin/audit': 'audit',
};

const navItems = [
  { id: 'overview', label: 'Overview', mobileLabel: 'Overview', path: '/admin' },
  { id: 'users', label: 'Users', mobileLabel: 'Users', path: '/admin/users' },
  { id: 'roles', label: 'Roles & permissions', mobileLabel: 'Roles', path: '/admin/roles' },
  { id: 'audit', label: 'Audit activity', mobileLabel: 'Audit', path: '/admin/audit' },
] as const;

/* ─────────────────────────────────────────────────────────────
   SHARED STYLE STRINGS
   ───────────────────────────────────────────────────────────── */
const BTN =
  'inline-flex h-9 items-center justify-center gap-2 border border-white/[0.08] bg-[#0b1424] px-3.5 text-xs font-medium text-slate-300 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_PRIMARY =
  'inline-flex h-9 items-center justify-center gap-2 border border-cyan-500/40 bg-cyan-500/[0.08] px-3.5 text-xs font-medium text-cyan-400 transition hover:border-cyan-400 hover:bg-cyan-500/[0.14] hover:text-cyan-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_DANGER =
  'inline-flex h-9 items-center justify-center gap-2 border border-rose-500/30 bg-rose-500/[0.06] px-3.5 text-xs font-medium text-rose-400 transition hover:border-rose-400 hover:bg-rose-500/[0.12] hover:text-rose-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-40';

const FIELD =
  'w-full border border-white/[0.08] bg-[#07101e] px-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 hover:border-white/[0.12] focus:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-50';

const INPUT = `${FIELD} h-9`;
const TEXTAREA = `${FIELD} py-2.5 leading-relaxed resize-y`;
const LABEL = 'mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500';

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */
function formatDate(value: string | null, relative = false) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  if (!relative) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  const diff = Math.max(0, Date.now() - date.getTime());
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function initials(name: string) {
  const value = name.trim();
  if (!value) return '?';
  return value.split(/\s+/).slice(0, 2).map(part => part[0] ?? '').join('').toUpperCase();
}

function roleName(roles: AdminRole[], id: string) {
  return roles.find(role => role.id === id)?.name ?? 'Unknown role';
}

function statusTone(status: AdminUserStatus) {
  if (status === 'active')
    return 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-400';
  if (status === 'invited')
    return 'border-amber-500/40 bg-amber-500/[0.08] text-amber-400';
  return 'border-rose-500/40 bg-rose-500/[0.08] text-rose-400';
}

function statusDot(status: AdminUserStatus) {
  if (status === 'active') return 'bg-emerald-500';
  if (status === 'invited') return 'bg-amber-500';
  return 'bg-rose-500';
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

/* ─────────────────────────────────────────────────────────────
   PRIMITIVES
   ───────────────────────────────────────────────────────────── */
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`border border-white/[0.08] bg-[#0b1424] ${className}`}>{children}</section>
  );
}

function PanelHeader({
  kicker,
  kickerTone = 'slate',
  title,
  hint,
  right,
}: {
  kicker: string;
  kickerTone?: 'slate' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  const tone = {
    slate: 'text-slate-500',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    violet: 'text-violet-400',
  }[kickerTone];

  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className={`font-mono text-[10px] font-medium uppercase tracking-[0.18em] ${tone}`}>
          {kicker}
        </p>
        <h2 className="mt-1 text-[15px] font-semibold text-slate-100">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

function StatusPill({ status }: { status: AdminUserStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${statusTone(status)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot(status)}`} />
      {status}
    </span>
  );
}

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
    <div className="grid min-h-56 place-items-center px-6 py-12 text-center">
      <div>
        <Icon className="mx-auto h-5 w-5 text-slate-600" />
        <h3 className="mt-2 text-sm font-medium text-slate-300">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{text}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   MAIN ADMIN PAGE
   ═════════════════════════════════════════════════════════════ */
export function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const section = sectionByPath[location.pathname] ?? 'overview';

  const [state, setState] = useState(() => adminRepository.getState());
  const [userModal, setUserModal] = useState<AdminUser | 'new' | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const actor = useMemo(() => {
    const localOperator = state.users.find(
      user => user.email.toLowerCase() === authUser?.email?.toLowerCase()
    );
    return {
      id: localOperator?.id ?? authUser?.id ?? '1',
      name: authUser?.name ?? localOperator?.name ?? 'Demo Administrator',
      email: authUser?.email ?? localOperator?.email ?? 'admin@cybershield.ai',
    };
  }, [authUser, state.users]);

  const tenantName = authUser?.organization_name?.trim() || 'CyberShield AI demo';

  const refresh = () => setState(adminRepository.getState());

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
    <div
      style={{ fontFamily: FONT_SANS }}
      className="relative mx-auto w-full min-w-0 max-w-[1640px] space-y-5 pb-10 text-slate-200"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center border border-white/[0.08] bg-[#0b1424]">
            <LockKeyhole className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Administration
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Identity Control Panel
            </h1>
            <p className="mt-1 hidden max-w-2xl text-xs leading-relaxed text-slate-500 sm:block">
              Govern workforce identities, access policy, and administrative evidence.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden border-l border-white/[0.08] pl-4 sm:block">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Operator
            </p>
            <p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-300" title={actor.email}>
              {actor.name}
            </p>
          </div>
          <div className="hidden border-l border-white/[0.08] pl-4 sm:block">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Tenant scope
            </p>
            <p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-300" title={tenantName}>
              {tenantName}
            </p>
          </div>
          <button type="button" className={BTN_PRIMARY} onClick={() => setUserModal('new')}>
            <UserPlus className="h-3.5 w-3.5" />
            Add user
          </button>
        </div>
      </header>

      {/* ═══════════════ NAV ═══════════════ */}
      <nav
        aria-label="Administration sections"
        className="flex gap-1 overflow-x-auto border-b border-white/[0.08]"
      >
        {navItems.map(item => {
          const active = section === item.id;
          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={`relative inline-flex h-11 shrink-0 items-center px-4 text-xs font-medium transition focus:outline-none focus-visible:bg-white/[0.03] ${
                active
                  ? 'text-cyan-400 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-cyan-500'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              <span className="sm:hidden">{item.mobileLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
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

      {/* ═══════════════ DEMO NOTICE ═══════════════ */}
      <div className="flex items-start gap-2.5 border-l-2 border-amber-500 bg-amber-500/[0.04] px-4 py-3 text-[11px] leading-relaxed text-slate-500">
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        <p>
          Demo administration data is stored only in this browser. Client-side access checks are
          not a substitute for production API authorization.
        </p>
      </div>

      {/* ═══════════════ MODALS ═══════════════ */}
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

/* ═════════════════════════════════════════════════════════════
   OVERVIEW SECTION
   ═════════════════════════════════════════════════════════════ */
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
      tone: 'text-emerald-400',
    },
    {
      label: 'Privileged admins',
      value: privileged,
      detail: `${privilegedRoleIds.size} elevated roles`,
      icon: Fingerprint,
      tone: 'text-cyan-400',
    },
    {
      label: 'Pending invites',
      value: invited,
      detail: invited ? 'Require onboarding' : 'Perimeter clear',
      icon: UserPlus,
      tone: 'text-amber-400',
    },
    {
      label: 'Suspended',
      value: suspended,
      detail: suspended ? 'Access isolated' : 'None isolated',
      icon: LockKeyhole,
      tone: 'text-rose-400',
    },
    {
      label: 'Permission coverage',
      value: `${permissionCoverage}%`,
      detail: `${grantedPermissionCount}/${state.roles.length * permissionCount} grants`,
      icon: ShieldCheck,
      tone: 'text-slate-300',
    },
  ];

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
      {/* ═══ Identity perimeter ═══ */}
      <Panel className="overflow-hidden">
        <PanelHeader
          kicker="Trust surface"
          kickerTone="cyan"
          title="Identity perimeter"
          hint="Browser-local posture computed from current identities, role assignments, and permission grants."
          right={<Fingerprint className="h-4 w-4 text-slate-500" />}
        />

        <div className="grid grid-cols-2 gap-px bg-white/[0.06] sm:grid-cols-3 xl:grid-cols-5">
          {perimeterSignals.map((signal, index) => {
            const Icon = signal.icon;
            return (
              <div key={signal.label} className="min-w-0 bg-[#0b1424] px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                    {String(index + 1).padStart(2, '0')} / {signal.label}
                  </p>
                  <Icon className={`h-3.5 w-3.5 ${signal.tone}`} />
                </div>
                <p className="mt-3 font-mono text-2xl font-semibold leading-none tracking-tight text-white">
                  {signal.value}
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500">{signal.detail}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ═══ Access map + Posture ═══ */}
      <div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            kicker="Access map"
            kickerTone="cyan"
            title="Roles across protected areas"
            hint="Live map of which roles can reach each control plane."
            right={
              <button
                type="button"
                className={BTN}
                onClick={() => navigate('/admin/roles')}
              >
                Review permissions
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          />

          <div className="w-full overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[170px_repeat(5,1fr)] gap-3 border-b border-white/[0.08] bg-white/[0.015] px-5 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                <span>Role / members</span>
                {protectedAreas.map(area => (
                  <span key={area.name} className="text-center">
                    {area.name}
                  </span>
                ))}
              </div>

              <div className="divide-y divide-white/[0.05]">
                {roleCounts.map(role => (
                  <div
                    key={role.id}
                    className="grid grid-cols-[170px_repeat(5,1fr)] items-center gap-3 px-5 py-3 transition hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-200">{role.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        {role.count} member{role.count === 1 ? '' : 's'}
                      </p>
                    </div>
                    {protectedAreas.map(area => {
                      const granted = area.permissions.some(permission =>
                        role.permissions.includes(permission)
                      );
                      return (
                        <div key={area.name} className="flex h-7 items-center justify-center">
                          <span
                            className={`grid h-5 w-5 place-items-center border ${
                              granted
                                ? 'border-cyan-500/50 bg-cyan-500/[0.08] text-cyan-400'
                                : 'border-slate-800 bg-[#07101e] text-slate-700'
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
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader
            kicker="Access posture"
            kickerTone="rose"
            title="Items needing attention"
          />

          <div className="divide-y divide-white/[0.05]">
            <PostureRow
              tone="rose"
              value={suspended}
              label="Suspended accounts"
              onClick={() => navigate('/admin/users')}
            />
            <PostureRow
              tone="amber"
              value={invited}
              label="Pending invitations"
              onClick={() => navigate('/admin/users')}
            />
            <PostureRow
              tone="cyan"
              value={privileged}
              label="Active privileged identities"
              onClick={() => navigate('/admin/roles')}
            />
          </div>

          <div className="flex gap-2 border-t border-white/[0.08] bg-white/[0.015] px-5 py-3">
            <button type="button" className={BTN_PRIMARY} onClick={onAddUser}>
              <Plus className="h-3.5 w-3.5" />
              Add user
            </button>
            <button
              type="button"
              className={BTN}
              onClick={() => navigate('/admin/audit')}
            >
              <FileClock className="h-3.5 w-3.5" />
              Audit
            </button>
          </div>
        </Panel>
      </div>

      {/* ═══ Distribution + Recent activity ═══ */}
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Panel className="overflow-hidden">
          <PanelHeader
            kicker="Distribution"
            kickerTone="cyan"
            title="Members by role"
            right={<Shield className="h-4 w-4 text-slate-500" />}
          />
          <div className="space-y-4 px-5 py-5">
            {roleCounts.map((role, index) => {
              const percentage = userTotal > 0 ? (role.count / userTotal) * 100 : 0;
              return (
                <div key={role.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="truncate text-xs text-slate-300">{role.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {role.count} / {userTotal}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden bg-white/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: role.count > 0 ? `${Math.max(3, percentage)}%` : '0%',
                      }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="h-full bg-cyan-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader
            kicker="Recent activity"
            kickerTone="slate"
            title="Administration log"
            right={
              <button
                type="button"
                onClick={() => navigate('/admin/audit')}
                className="font-mono text-[10px] font-medium uppercase tracking-wider text-cyan-400 hover:text-cyan-300"
              >
                View all
              </button>
            }
          />
          <div className="divide-y divide-white/[0.05]">
            {state.audit.slice(0, 4).map(entry => (
              <AuditRow key={entry.id} entry={entry} compact />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PostureRow({
  tone,
  value,
  label,
  onClick,
}: {
  tone: 'rose' | 'amber' | 'cyan';
  value: number;
  label: string;
  onClick: () => void;
}) {
  const bar = { rose: 'bg-rose-500', amber: 'bg-amber-500', cyan: 'bg-cyan-500' }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-white/[0.02] focus:outline-none focus-visible:bg-white/[0.03]"
    >
      <span className={`h-7 w-1 ${bar}`} />
      <span className="font-mono text-lg font-semibold leading-none text-white">{value}</span>
      <span className="flex-1 truncate text-xs text-slate-400">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-400" />
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   USERS SECTION
   ═════════════════════════════════════════════════════════════ */
function UsersSection({
  state,
  actor,
  mutate,
  onEdit,
  setConfirm,
}: {
  state: ReturnType<typeof adminRepository.getState>;
  actor: { id: string; name: string; email: string };
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
  }>({ key: 'name', direction: 'asc' });
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

  useEffect(() => setPage(1), [search, roleFilter, statusFilter, sort.key, sort.direction]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const toggleSort = (key: typeof sort.key) => {
    setSort(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

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

  const filtersActive = Boolean(search || roleFilter !== 'all' || statusFilter !== 'all');

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/[0.08] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-400">
            User directory
          </p>
          <h2 className="mt-1 text-[15px] font-semibold text-slate-100">
            {filtered.length} of {state.users.length} users
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Search, invite, and control workspace access.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className="relative block min-w-[220px]">
            <span className="sr-only">Search users</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              className={`${INPUT} pl-9`}
              placeholder="Search name or email"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter by role"
            className={`${INPUT} cursor-pointer appearance-none pr-8 sm:w-44`}
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
            className={`${INPUT} cursor-pointer appearance-none pr-8 sm:w-36`}
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
            className={BTN}
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          {filtersActive && (
            <button type="button" className={BTN} onClick={clear}>
              <FilterX className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col />
            <col className="w-[180px]" />
            <col className="w-[130px]" />
            <col className="w-[140px]" />
            <col className="w-[80px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.015] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
              {(
                [
                  ['name', 'User'],
                  ['role', 'Role'],
                  ['status', 'Status'],
                  ['lastActive', 'Last active'],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="px-5 py-2.5 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="inline-flex items-center gap-1.5 hover:text-slate-300"
                  >
                    {label}
                    {sort.key === key ? (
                      sort.direction === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-cyan-400" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-cyan-400" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-600" />
                    )}
                  </button>
                </th>
              ))}
              <th className="px-5 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
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
      <div className="divide-y divide-white/[0.06] md:hidden">
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
            <button type="button" className={BTN} onClick={clear}>
              Clear filters
            </button>
          }
        />
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.015] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
        <span>
          Page {currentPage} of {pages}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Previous page"
            className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-[#0b1424] text-slate-400 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => setPage(value => Math.max(1, value - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-[#0b1424] text-slate-400 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={currentPage >= pages}
            onClick={() => setPage(value => Math.min(pages, value + 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Panel>
  );
}

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
    <tr className="transition hover:bg-white/[0.025]">
      <td className="px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center border border-white/[0.08] bg-[#07101e] font-mono text-[11px] font-medium text-slate-400">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-200">
              {user.name}
              {user.id === actorId && (
                <span className="ml-2 border border-cyan-500/40 bg-cyan-500/[0.08] px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-400">
                  You
                </span>
              )}
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3 text-xs text-slate-400">{roleName(roles, user.roleId)}</td>
      <td className="px-5 py-3">
        <StatusPill status={user.status} />
      </td>
      <td
        className="px-5 py-3 font-mono text-[10px] text-slate-500"
        title={formatDate(user.lastActive)}
      >
        {formatDate(user.lastActive, true)}
      </td>
      <td className="px-5 py-3">
        <RowActions onEdit={onEdit} onStatus={onStatus} onDelete={onDelete} status={user.status} />
      </td>
    </tr>
  );
}

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
    <article className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center border border-white/[0.08] bg-[#07101e] font-mono text-[11px] font-medium text-slate-400">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xs font-medium text-slate-200">{user.name}</h3>
            <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{user.email}</p>
          </div>
        </div>
        <StatusPill status={user.status} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3">
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Role</dt>
          <dd className="mt-0.5 truncate text-[11px] text-slate-300">
            {roleName(roles, user.roleId)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
            Last active
          </dt>
          <dd className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
            {formatDate(user.lastActive, true)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={`${BTN} h-8 px-2.5 text-[11px]`} onClick={onEdit}>
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button type="button" className={`${BTN} h-8 px-2.5 text-[11px]`} onClick={onStatus}>
          {user.status === 'active' ? 'Suspend' : 'Activate'}
        </button>
        <button
          type="button"
          aria-label={`Delete ${user.name}`}
          className={`${BTN_DANGER} h-8 px-2.5 text-[11px]`}
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}

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
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        aria-label="Open user actions"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-[#0b1424] text-slate-400 transition hover:border-white/[0.16] hover:text-slate-200"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-44 border border-white/[0.08] bg-[#0b1424] p-1">
          <MenuAction
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            icon={Pencil}
          >
            Edit user
          </MenuAction>
          <MenuAction
            onClick={() => {
              onStatus();
              setOpen(false);
            }}
            icon={UserCheck}
          >
            {status === 'active' ? 'Suspend user' : 'Activate user'}
          </MenuAction>
          <MenuAction
            danger
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            icon={Trash2}
          >
            Delete user
          </MenuAction>
        </div>
      )}
    </div>
  );
}

function MenuAction({
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
      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition ${
        danger
          ? 'text-rose-400 hover:bg-rose-500/[0.06]'
          : 'text-slate-300 hover:bg-white/[0.04]'
      }`}
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   ROLES SECTION
   ═════════════════════════════════════════════════════════════ */
function RolesSection({
  state,
  actor,
  mutate,
  setConfirm,
}: {
  state: ReturnType<typeof adminRepository.getState>;
  actor: { id: string; name: string; email: string };
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
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Panel className="self-start overflow-hidden">
        <PanelHeader
          kicker="Access roles"
          kickerTone="cyan"
          title={`${state.roles.length} defined roles`}
          right={
            <button
              type="button"
              aria-label="Create role"
              className={`${BTN_PRIMARY} h-8 px-2.5`}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        />
        <div className="p-2">
          {state.roles.map(role => {
            const members = state.users.filter(user => user.roleId === role.id).length;
            const isSelected = selected?.id === role.id;
            return (
              <button
                type="button"
                key={role.id}
                onClick={() => setSelectedId(role.id)}
                className={`mb-1 flex w-full items-center gap-3 border px-3 py-2.5 text-left transition ${
                  isSelected
                    ? 'border-cyan-500/40 bg-cyan-500/[0.06]'
                    : 'border-transparent hover:bg-white/[0.02]'
                }`}
              >
                <span
                  className={`grid h-7 w-7 place-items-center border ${
                    isSelected
                      ? 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-400'
                      : 'border-white/[0.08] bg-[#07101e] text-slate-500'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-slate-200">
                    {role.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {members} member{members === 1 ? '' : 's'}
                  </span>
                </span>
                {role.system && (
                  <span className="shrink-0 border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-500">
                    System
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

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
    if (!cleanName) return setError('Role name is required.');
    if (cleanName.length < 2) return setError('Role name must contain at least 2 characters.');
    setError('');
    onSave({ name: cleanName, description: description.trim(), permissions });
  };

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 place-items-center border border-cyan-500/40 bg-cyan-500/[0.06] text-cyan-400">
            <Shield className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[15px] font-semibold text-white">{role.name}</h2>
              <span className="border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-400">
                {role.system ? 'System' : 'Custom'}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {memberCount} member{memberCount === 1 ? '' : 's'} · {permissions.length} permissions
            </p>
          </div>
        </div>

        {!role.system && (
          <button type="button" className={BTN_DANGER} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete role
          </button>
        )}
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(240px,.7fr)_1.3fr]">
        <div className="space-y-4">
          <label className="block">
            <span className={LABEL}>Role name</span>
            <input
              className={INPUT}
              value={name}
              disabled={role.system}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <label className="block">
            <span className={LABEL}>Description</span>
            <textarea
              className={`${TEXTAREA} min-h-24`}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </label>

          {error && (
            <p
              role="alert"
              className="border-l-2 border-rose-500 bg-rose-500/[0.04] px-3 py-2 text-xs text-rose-300"
            >
              {error}
            </p>
          )}

          <div className="border-l-2 border-cyan-500/40 bg-white/[0.015] px-3 py-3 text-[11px] leading-relaxed text-slate-500">
            <LockKeyhole className="mb-1.5 h-3.5 w-3.5 text-cyan-400" />
            System role names are fixed. Critical Administrator controls remain enabled to protect
            workspace continuity.
          </div>
        </div>

        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Permission matrix
          </p>

          <div className="mt-3 divide-y divide-white/[0.05] border border-white/[0.08]">
            {permissionCatalog.map(group => (
              <div key={group.area} className="grid gap-3 p-4 sm:grid-cols-[140px_1fr]">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200">{group.area}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {
                      group.permissions.filter(permission => permissions.includes(permission.id))
                        .length
                    }
                    /{group.permissions.length} granted
                  </p>
                </div>
                <div className="space-y-1">
                  {group.permissions.map(permission => {
                    const checked = permissions.includes(permission.id);
                    return (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-center justify-between gap-3 px-2 py-1.5 transition hover:bg-white/[0.02]"
                      >
                        <span className="text-xs text-slate-400">{permission.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(permission.id)}
                          className="h-3.5 w-3.5 cursor-pointer accent-cyan-500"
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

      <div className="flex justify-end border-t border-white/[0.08] bg-white/[0.015] px-5 py-3">
        <button type="button" className={BTN_PRIMARY} onClick={submit}>
          <Check className="h-3.5 w-3.5" />
          Save role
        </button>
      </div>
    </Panel>
  );
}

/* ═════════════════════════════════════════════════════════════
   AUDIT SECTION
   ═════════════════════════════════════════════════════════════ */
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
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/[0.08] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-400">
            Audit ledger
          </p>
          <h2 className="mt-1 text-[15px] font-semibold text-slate-100">
            {filtered.length} of {entries.length} events
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Browser-local record of every administration change.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-[240px]">
            <span className="sr-only">Search audit activity</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              className={`${INPUT} pl-9`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search actor, target, detail"
            />
          </label>
          <select
            aria-label="Filter activity type"
            className={`${INPUT} cursor-pointer appearance-none pr-8 sm:w-40`}
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
            className={BTN}
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            <Download className="h-3.5 w-3.5" />
            Export ledger
          </button>
        </div>
      </div>

      <div className="divide-y divide-white/[0.05]">
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
              className={BTN}
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
    </Panel>
  );
}

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

  const iconTone = isDelete
    ? 'border-rose-500/40 bg-rose-500/[0.06] text-rose-400'
    : isCreate
      ? 'border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-400'
      : 'border-cyan-500/40 bg-cyan-500/[0.06] text-cyan-400';

  return (
    <div
      className={`grid gap-3 px-5 ${
        compact ? 'py-3' : 'py-3.5 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center'
      }`}
    >
      {!compact && (
        <span className={`hidden h-8 w-8 place-items-center border sm:grid ${iconTone}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-300">
          <span className="font-medium text-slate-100">{entry.actor}</span>{' '}
          <span className="text-slate-500">{entry.action.replace('.', ' ')}</span>{' '}
          <span className="font-medium text-slate-200">{entry.target}</span>
        </p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{entry.metadata}</p>
      </div>
      <time
        className="font-mono text-[10px] text-slate-500"
        dateTime={entry.timestamp}
        title={formatDate(entry.timestamp)}
      >
        {formatDate(entry.timestamp, true)}
      </time>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   MODAL SHELL
   ═════════════════════════════════════════════════════════════ */
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
      initial?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
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
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [mounted]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ fontFamily: FONT_SANS }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.15 }}
        className="my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/[0.08] bg-[#0b1424]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-3.5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-400">
              {eyebrow}
            </p>
            <h2
              id="admin-dialog-title"
              className="mt-1 truncate text-[15px] font-semibold text-white"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-8 w-8 shrink-0 place-items-center border border-white/[0.08] bg-[#0b1424] text-slate-400 transition hover:border-white/[0.16] hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-5">{children}</div>

        <div className="flex justify-end gap-2 border-t border-white/[0.08] bg-white/[0.015] px-5 py-3.5">
          {footer}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ═════════════════════════════════════════════════════════════
   USER MODAL
   ═════════════════════════════════════════════════════════════ */
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
    if (!cleanName) return setError('Name is required.');
    if (cleanName.length < 2) return setError('Name must contain at least 2 characters.');
    if (!isValidEmail(cleanEmail)) return setError('Enter a valid email address.');
    if (!roleId) return setError('Select a role.');
    setError('');
    onSave({ name: cleanName, email: cleanEmail, roleId, status });
  };

  return (
    <ModalShell
      title={user ? 'Edit user' : 'Invite a user'}
      eyebrow="User access"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={BTN} onClick={onClose}>
            Cancel
          </button>
          <button form="user-form" className={BTN_PRIMARY} type="submit">
            {user ? 'Save changes' : 'Create invitation'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className={LABEL}>Full name</span>
          <input
            data-dialog-initial-focus
            className={INPUT}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Samira Joshi"
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className={LABEL}>Work email</span>
          <input
            type="email"
            className={`${INPUT} font-mono`}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoComplete="email"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Role</span>
            <select
              className={`${INPUT} cursor-pointer appearance-none pr-8`}
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
          <label className="block">
            <span className={LABEL}>Status</span>
            <select
              className={`${INPUT} cursor-pointer appearance-none pr-8`}
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
            className="border-l-2 border-rose-500 bg-rose-500/[0.04] px-3 py-2 text-xs text-rose-300"
          >
            {error}
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-slate-500">
          Invitations are simulated locally in this frontend demo; no email is sent.
        </p>
      </form>
    </ModalShell>
  );
}

/* ═════════════════════════════════════════════════════════════
   ROLE MODAL
   ═════════════════════════════════════════════════════════════ */
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
    if (!cleanName) return setError('Role name is required.');
    if (cleanName.length < 2) return setError('Role name must contain at least 2 characters.');
    setError('');
    onSave({ name: cleanName, description: description.trim(), permissions });
  };

  return (
    <ModalShell
      title="Create custom role"
      eyebrow="Access policy"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={BTN} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={submit}>
            Create role
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className={LABEL}>Role name</span>
          <input
            data-dialog-initial-focus
            className={INPUT}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Incident coordinator"
          />
        </label>

        <label className="block">
          <span className={LABEL}>Description</span>
          <textarea
            className={`${TEXTAREA} min-h-20`}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what this role is responsible for…"
          />
        </label>

        <fieldset>
          <legend className={LABEL}>Starting permissions</legend>
          <div className="max-h-52 divide-y divide-white/[0.05] overflow-y-auto border border-white/[0.08]">
            {permissionCatalog.flatMap(group => group.permissions).map(permission => (
              <label
                key={permission.id}
                className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.02]"
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
                  className="h-3.5 w-3.5 cursor-pointer accent-cyan-500"
                />
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p
            role="alert"
            className="border-l-2 border-rose-500 bg-rose-500/[0.04] px-3 py-2 text-xs text-rose-300"
          >
            {error}
          </p>
        )}
      </div>
    </ModalShell>
  );
}

/* ═════════════════════════════════════════════════════════════
   CONFIRM DIALOG
   ═════════════════════════════════════════════════════════════ */
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
  const isDanger = tone === 'danger';
  return (
    <ModalShell
      title={title}
      eyebrow="Confirm action"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={BTN} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            data-dialog-initial-focus
            className={isDanger ? BTN_DANGER : BTN_PRIMARY}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center border ${
            isDanger
              ? 'border-rose-500/40 bg-rose-500/[0.06] text-rose-400'
              : 'border-amber-500/40 bg-amber-500/[0.06] text-amber-400'
          }`}
        >
          <CircleAlert className="h-4 w-4" />
        </span>
        <p className="pt-1 text-xs leading-relaxed text-slate-400">{message}</p>
      </div>
    </ModalShell>
  );
}