import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
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
   TYPES & CONSTANTS
   ───────────────────────────────────────────────────────────── */
type Section = 'overview' | 'users' | 'roles' | 'audit';

type ConfirmState = {
  title: string;
  message: string;
  tone?: 'danger' | 'warning';
  confirmLabel: string;
  action: () => void;
} | null;

const sectionByPath: Record<string, Section> = {
  '/admin': 'overview',
  '/admin/users': 'users',
  '/admin/roles': 'roles',
  '/admin/audit': 'audit',
};

const navItems = [
  { id: 'overview', label: 'Overview', path: '/admin', icon: ShieldCheck },
  { id: 'users', label: 'Users', path: '/admin/users', icon: Users },
  { id: 'roles', label: 'Roles & permissions', path: '/admin/roles', icon: KeyRound },
  { id: 'audit', label: 'Audit log', path: '/admin/audit', icon: Download },
] as const;

/* Buttons — flat, tight, one accent */
const BTN =
  'inline-flex h-8 items-center justify-center gap-1.5 px-2.5 text-[12px] font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_OUTLINE =
  'inline-flex h-8 items-center justify-center gap-1.5 border border-white/[0.1] bg-transparent px-3 text-[12px] font-medium text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.04] focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_PRIMARY =
  'inline-flex h-8 items-center justify-center gap-1.5 bg-cyan-500 px-3 text-[12px] font-medium text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e14] disabled:cursor-not-allowed disabled:opacity-40';

const BTN_DANGER =
  'inline-flex h-8 items-center justify-center gap-1.5 bg-rose-500 px-3 text-[12px] font-medium text-white transition hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e14] disabled:cursor-not-allowed disabled:opacity-40';

const FIELD =
  'w-full h-8 border border-white/[0.1] bg-transparent px-2.5 text-[12px] text-slate-100 outline-none transition placeholder:text-slate-600 hover:border-white/[0.18] focus:border-cyan-500/60 focus:bg-white/[0.02] disabled:cursor-not-allowed disabled:opacity-50';

const TEXTAREA = `${FIELD} h-auto py-2 leading-relaxed resize-y`;

const LABEL = 'block mb-1.5 text-[11px] font-medium text-slate-400';

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
  if (status === 'active') return 'bg-emerald-500';
  if (status === 'invited') return 'bg-amber-500';
  return 'bg-rose-500';
}

function statusTextTone(status: AdminUserStatus) {
  if (status === 'active') return 'text-emerald-400';
  if (status === 'invited') return 'text-amber-400';
  return 'text-rose-400';
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
   SMALL SHARED PIECES
   ───────────────────────────────────────────────────────────── */
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  // Deterministic hue from name
  const hue = Array.from(name).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-medium text-white/90"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 45% 32%), hsl(${hue} 55% 22%))`,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {initials(name)}
    </span>
  );
}

function StatusDot({ status }: { status: AdminUserStatus }) {
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusTone(status)}`} aria-hidden />
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN ADMIN PAGE
   ───────────────────────────────────────────────────────────── */
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
      className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-0"
    >
      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-white/[0.06] md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-white/[0.06] px-4">
          <span className="grid h-6 w-6 place-items-center rounded bg-cyan-500 text-[10px] font-bold text-slate-950">
            CS
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-white">Administration</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {navItems.map(item => {
            const active = section === item.id;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
                  active
                    ? 'bg-white/[0.06] text-white'
                    : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'}`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={actor.name} size={28} />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-slate-200">{actor.name}</p>
              <p className="truncate text-[10px] text-slate-500">{actor.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════ MAIN ═══════════════ */}
      <main className="min-w-0 flex-1">
        {/* Mobile nav — horizontal scroll */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] p-2 md:hidden">
          {navItems.map(item => {
            const active = section === item.id;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                  active ? 'bg-white/[0.06] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* ═══ PAGE HEADER ═══ */}
        <header className="flex h-14 items-center justify-between gap-4 border-b border-white/[0.06] px-6">
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-semibold text-white">
              {section === 'overview' && 'Overview'}
              {section === 'users' && 'Users'}
              {section === 'roles' && 'Roles & permissions'}
              {section === 'audit' && 'Audit log'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {section !== 'roles' && (
              <button type="button" className={BTN_PRIMARY} onClick={() => setUserModal('new')}>
                <Plus className="h-3.5 w-3.5" />
                Invite user
              </button>
            )}
          </div>
        </header>

        {/* ═══ CONTENT ═══ */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
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

          <p className="mt-8 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
            <CircleAlert className="mt-0.5 h-3 w-3 shrink-0" />
            Demo data is stored only in this browser. Client-side checks are not a substitute for
            server-side authorization.
          </p>
        </div>
      </main>

      {/* ═══ MODALS ═══ */}
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
   OVERVIEW
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
  const active = state.users.filter(u => u.status === 'active').length;
  const invited = state.users.filter(u => u.status === 'invited').length;
  const suspended = state.users.filter(u => u.status === 'suspended').length;

  const privilegedRoleIds = new Set(
    state.roles
      .filter(role =>
        role.permissions.some(p =>
          ['users.manage', 'roles.manage', 'settings.manage'].includes(p)
        )
      )
      .map(role => role.id)
  );
  const privileged = state.users.filter(
    u => u.status === 'active' && privilegedRoleIds.has(u.roleId)
  ).length;

  const userTotal = state.users.length;
  const permissionCount = permissionCatalog.reduce((t, g) => t + g.permissions.length, 0);
  const granted = state.roles.reduce((t, r) => t + r.permissions.length, 0);
  const coverage = state.roles.length
    ? Math.round((granted / (state.roles.length * permissionCount)) * 100)
    : 0;

  const roleCounts = state.roles.map(role => ({
    ...role,
    count: state.users.filter(u => u.roleId === role.id).length,
  }));

  const protectedAreas = permissionCatalog.map(g => ({
    name: g.area,
    permissions: g.permissions.map(p => p.id),
  }));

  return (
    <div className="space-y-8">
      {/* ── Stat row (single line, no boxes) ── */}
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <Stat label="Users" value={userTotal} sub={`${active} active`} />
        <Stat label="Privileged" value={privileged} sub={`${privilegedRoleIds.size} roles`} />
        <Stat label="Pending invites" value={invited} sub={invited ? 'onboarding' : 'clear'} />
        <Stat label="Suspended" value={suspended} sub={suspended ? 'isolated' : 'none'} />
        <Stat label="Permission coverage" value={`${coverage}%`} sub={`${granted} grants`} />
      </div>

      {/* ── Access map ── */}
      <section>
        <header className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[13px] font-semibold text-slate-100">Access map</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Which roles can reach each control plane.
            </p>
          </div>
          <button
            type="button"
            className={BTN}
            onClick={() => navigate('/admin/roles')}
          >
            Review permissions
            <ChevronRight className="h-3 w-3" />
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-medium text-slate-500">
                <th className="w-[180px] py-2 pr-4 font-medium">Role</th>
                {protectedAreas.map(area => (
                  <th key={area.name} className="px-2 py-2 text-center font-medium">
                    {area.name}
                  </th>
                ))}
                <th className="w-[70px] py-2 pl-4 text-right font-medium">Members</th>
              </tr>
            </thead>
            <tbody>
              {roleCounts.map(role => (
                <tr
                  key={role.id}
                  className="border-b border-white/[0.04] transition hover:bg-white/[0.015]"
                >
                  <td className="py-2.5 pr-4 text-[12px] font-medium text-slate-200">
                    {role.name}
                  </td>
                  {protectedAreas.map(area => {
                    const has = area.permissions.some(p => role.permissions.includes(p));
                    return (
                      <td key={area.name} className="px-2 py-2.5 text-center">
                        {has ? (
                          <Check className="mx-auto h-3 w-3 text-cyan-400" />
                        ) : (
                          <span className="text-slate-700">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 pl-4 text-right font-mono text-[11px] text-slate-500">
                    {role.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Two column: Distribution + Recent activity ── */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section>
          <h2 className="mb-3 text-[13px] font-semibold text-slate-100">Members by role</h2>
          <div className="space-y-3">
            {roleCounts.map(role => {
              const pct = userTotal > 0 ? (role.count / userTotal) * 100 : 0;
              return (
                <div key={role.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[11px] text-slate-300">{role.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">{role.count}</span>
                  </div>
                  <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-slate-500 transition-[width] duration-500"
                      style={{ width: role.count > 0 ? `${Math.max(4, pct)}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <header className="mb-3 flex items-end justify-between gap-4">
            <h2 className="text-[13px] font-semibold text-slate-100">Recent activity</h2>
            <button
              type="button"
              onClick={() => navigate('/admin/audit')}
              className="text-[11px] text-slate-500 hover:text-slate-300"
            >
              View all
            </button>
          </header>
          <div className="divide-y divide-white/[0.04]">
            {state.audit.slice(0, 5).map(entry => (
              <AuditLine key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      </div>

      {/* ── Attention items (single quiet row) ── */}
      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-slate-100">Needs attention</h2>
        <div className="flex flex-wrap gap-2">
          {suspended > 0 && (
            <AttentionChip
              tone="rose"
              count={suspended}
              label="suspended account" 
              labelPlural="suspended accounts"
              onClick={() => navigate('/admin/users')}
            />
          )}
          {invited > 0 && (
            <AttentionChip
              tone="amber"
              count={invited}
              label="pending invitation"
              labelPlural="pending invitations"
              onClick={() => navigate('/admin/users')}
            />
          )}
          {privileged > 0 && (
            <AttentionChip
              tone="slate"
              count={privileged}
              label="privileged identity"
              labelPlural="privileged identities"
              onClick={() => navigate('/admin/roles')}
            />
          )}
          {suspended + invited + privileged === 0 && (
            <p className="text-[11px] text-slate-500">
              All clear — nothing outstanding right now.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-2">
        <span className="font-mono text-[22px] font-semibold leading-none tracking-tight text-white">
          {value}
        </span>
        {sub && <span className="text-[10px] text-slate-600">{sub}</span>}
      </p>
    </div>
  );
}

function AttentionChip({
  tone,
  count,
  label,
  labelPlural,
  onClick,
}: {
  tone: 'rose' | 'amber' | 'slate';
  count: number;
  label: string;
  labelPlural: string;
  onClick: () => void;
}) {
  const dot = { rose: 'bg-rose-500', amber: 'bg-amber-500', slate: 'bg-slate-500' }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.015] px-3 py-1 text-[11px] text-slate-300 transition hover:border-white/[0.16] hover:bg-white/[0.03] hover:text-white"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="font-mono font-medium text-slate-200">{count}</span>
      <span>{count === 1 ? label : labelPlural}</span>
      <ChevronRight className="h-3 w-3 text-slate-600" />
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
  const pageSize = 10;

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
      ...filtered.map(u => [
        u.name,
        u.email,
        roleName(state.roles, u.roleId),
        u.status,
        u.lastActive ?? '',
        u.createdAt,
      ]),
    ];
    downloadCsv(`cybershield-users-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    mutate(
      () => adminRepository.recordExport(actor, filtered.length),
      `${filtered.length} users exported.`
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
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            className={`${FIELD} pl-8`}
            placeholder="Search users"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by role"
          className={`${FIELD} w-auto cursor-pointer appearance-none pr-7`}
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
          className={`${FIELD} w-auto cursor-pointer appearance-none pr-7`}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="suspended">Suspended</option>
        </select>
        {filtersActive && (
          <button type="button" className={BTN} onClick={clear}>
            Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className={BTN_OUTLINE}
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col />
            <col className="w-[180px]" />
            <col className="w-[120px]" />
            <col className="w-[140px]" />
            <col className="w-[44px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] font-medium text-slate-500">
              {(
                [
                  ['name', 'User'],
                  ['role', 'Role'],
                  ['status', 'Status'],
                  ['lastActive', 'Last active'],
                ] as const
              ).map(([key, label]) => (
                <th key={key} className="py-2 pr-4 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="inline-flex items-center gap-1 hover:text-slate-300"
                  >
                    {label}
                    {sort.key === key ? (
                      sort.direction === 'asc' ? (
                        <ArrowUp className="h-2.5 w-2.5 text-cyan-400" />
                      ) : (
                        <ArrowDown className="h-2.5 w-2.5 text-cyan-400" />
                      )
                    ) : (
                      <ArrowUpDown className="h-2.5 w-2.5 text-slate-700" />
                    )}
                  </button>
                </th>
              ))}
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
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

      {!visible.length && (
        <div className="py-12 text-center">
          <Users className="mx-auto h-5 w-5 text-slate-700" />
          <p className="mt-2 text-[12px] text-slate-400">No users match your filters</p>
          {filtersActive && (
            <button
              type="button"
              onClick={clear}
              className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] text-slate-500">
        <span>
          {filtered.length === 0
            ? 'No results'
            : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            className={BTN}
            disabled={currentPage <= 1}
            onClick={() => setPage(v => Math.max(1, v - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 font-mono text-[10px]">
            {currentPage} / {pages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            className={BTN}
            disabled={currentPage >= pages}
            onClick={() => setPage(v => Math.min(pages, v + 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
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
    <tr className="group transition hover:bg-white/[0.02]">
      <td className="py-2.5 pr-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={user.name} size={26} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[12px] font-medium text-slate-100">{user.name}</p>
              {user.id === actorId && (
                <span className="rounded-sm bg-white/[0.06] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-slate-500">
                  you
                </span>
              )}
            </div>
            <p className="truncate font-mono text-[10px] text-slate-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-4">
        <span className="truncate text-[11px] text-slate-400">
          {roleName(roles, user.roleId)}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <span className="inline-flex items-center gap-1.5">
          <StatusDot status={user.status} />
          <span className={`text-[11px] capitalize ${statusTextTone(user.status)}`}>
            {user.status}
          </span>
        </span>
      </td>
      <td className="py-2.5 pr-4 font-mono text-[10px] text-slate-500" title={formatDate(user.lastActive)}>
        {formatDate(user.lastActive, true)}
      </td>
      <td className="py-2.5 text-right">
        <RowMenu onEdit={onEdit} onStatus={onStatus} onDelete={onDelete} status={user.status} />
      </td>
    </tr>
  );
}

function RowMenu({
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
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label="Open user actions"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="grid h-6 w-6 place-items-center rounded text-slate-500 opacity-0 transition group-hover:opacity-100 hover:bg-white/[0.06] hover:text-slate-200 focus:opacity-100 aria-expanded:opacity-100"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-md border border-white/[0.08] bg-[#0d1219] py-1 shadow-xl">
          <MenuItem
            icon={Pencil}
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
          >
            Edit user
          </MenuItem>
          <MenuItem
            icon={UserCheck}
            onClick={() => {
              onStatus();
              setOpen(false);
            }}
          >
            {status === 'active' ? 'Suspend' : 'Activate'}
          </MenuItem>
          <div className="my-1 border-t border-white/[0.06]" />
          <MenuItem
            icon={Trash2}
            danger
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            Delete
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
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
  const selected = state.roles.find(r => r.id === selectedId) ?? state.roles[0];

  useEffect(() => {
    if (!state.roles.some(r => r.id === selectedId)) {
      setSelectedId(state.roles[0]?.id);
    }
  }, [state.roles, selectedId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* ── Role list ── */}
      <aside>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">{state.roles.length} roles</p>
          <button
            type="button"
            aria-label="Create role"
            onClick={() => setCreateOpen(true)}
            className="text-slate-500 hover:text-slate-200"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-0.5">
          {state.roles.map(role => {
            const members = state.users.filter(u => u.roleId === role.id).length;
            const isSelected = selected?.id === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedId(role.id)}
                className={`group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition ${
                  isSelected
                    ? 'bg-white/[0.06] text-white'
                    : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-medium">{role.name}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-slate-600">
                    {members} {members === 1 ? 'member' : 'members'}
                    {role.system && <span className="ml-1.5 text-slate-700">· system</span>}
                  </span>
                </span>
                {isSelected && <ChevronRight className="h-3 w-3 text-slate-600" />}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Editor ── */}
      {selected && (
        <RoleEditor
          key={`${selected.id}-${selected.permissions.join('.')}-${selected.description}`}
          role={selected}
          memberCount={state.users.filter(u => u.roleId === selected.id).length}
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
      current.includes(id) ? current.filter(i => i !== id) : [...current, id]
    );
  };

  const submit = () => {
    const clean = normalizeName(name);
    if (!clean) return setError('Role name is required.');
    if (clean.length < 2) return setError('Name must be at least 2 characters.');
    setError('');
    onSave({ name: clean, description: description.trim(), permissions });
  };

  return (
    <div className="min-w-0">
      {/* Header row */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-white">{role.name}</h2>
            <span className="rounded-sm border border-white/[0.08] px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-slate-500">
              {role.system ? 'System' : 'Custom'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {memberCount} assigned {memberCount === 1 ? 'member' : 'members'} ·{' '}
            {permissions.length} permissions
          </p>
        </div>
        {!role.system && (
          <button type="button" className={BTN_DANGER} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        {/* Left: name + description */}
        <div className="space-y-4">
          <label className="block">
            <span className={LABEL}>Name</span>
            <input
              className={FIELD}
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
              placeholder="What is this role responsible for?"
            />
          </label>

          {error && (
            <p className="text-[11px] text-rose-400" role="alert">
              {error}
            </p>
          )}

          {role.system && (
            <p className="text-[10px] leading-relaxed text-slate-600">
              System role names are fixed. Critical administrator permissions remain enabled to
              protect workspace continuity.
            </p>
          )}

          <div className="pt-2">
            <button type="button" className={BTN_PRIMARY} onClick={submit}>
              Save changes
            </button>
          </div>
        </div>

        {/* Right: permissions */}
        <div className="min-w-0">
          <p className="mb-4 text-[11px] font-medium text-slate-400">Permissions</p>
          <div className="space-y-6">
            {permissionCatalog.map(group => {
              const granted = group.permissions.filter(p => permissions.includes(p.id)).length;
              return (
                <div key={group.area}>
                  <div className="mb-2 flex items-baseline justify-between gap-4">
                    <h3 className="text-[12px] font-medium text-slate-200">{group.area}</h3>
                    <span className="font-mono text-[10px] text-slate-600">
                      {granted}/{group.permissions.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {group.permissions.map(permission => {
                      const checked = permissions.includes(permission.id);
                      return (
                        <label
                          key={permission.id}
                          className="group flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition hover:bg-white/[0.02]"
                        >
                          <span
                            className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded border transition ${
                              checked
                                ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                                : 'border-white/[0.15] bg-transparent group-hover:border-white/[0.25]'
                            }`}
                          >
                            {checked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                          </span>
                          <span className="flex-1 text-[12px] text-slate-300">
                            {permission.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(permission.id)}
                            className="sr-only"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
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
      ...filtered.map(e => [e.timestamp, e.action, e.actor, e.target, e.metadata]),
    ];
    downloadCsv(`cybershield-audit-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    try {
      adminRepository.recordAuditExport(actor, filtered.length);
      refresh();
      toast.success(`${filtered.length} audit events exported.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export could not be recorded.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            className={`${FIELD} pl-8`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search actor, target, detail"
          />
        </div>
        <select
          aria-label="Filter activity type"
          className={`${FIELD} w-auto cursor-pointer appearance-none pr-7`}
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
          className={BTN_OUTLINE}
          onClick={exportCsv}
          disabled={!filtered.length}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {filtered.map(entry => (
          <AuditLine key={entry.id} entry={entry} />
        ))}
      </div>

      {!filtered.length && (
        <div className="py-12 text-center">
          <p className="text-[12px] text-slate-400">No activity found</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setType('all');
            }}
            className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

function AuditLine({
  entry,
}: {
  entry: ReturnType<typeof adminRepository.getState>['audit'][number];
}) {
  return (
    <div className="flex items-start gap-4 py-2.5 text-[11px]">
      <time
        className="w-[130px] shrink-0 pt-0.5 font-mono text-[10px] text-slate-600"
        dateTime={entry.timestamp}
        title={formatDate(entry.timestamp)}
      >
        {formatDate(entry.timestamp, true)}
      </time>
      <div className="min-w-0 flex-1">
        <p className="text-slate-300">
          <span className="font-medium text-slate-100">{entry.actor}</span>{' '}
          <span className="text-slate-500">{entry.action.replace('.', ' ')}</span>{' '}
          <span className="font-medium text-slate-200">{entry.target}</span>
        </p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-slate-600">{entry.metadata}</p>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   MODAL SHELL
   ═════════════════════════════════════════════════════════════ */
function ModalShell({
  title,
  onClose,
  children,
  footer,
  width = 480,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  width?: number;
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
    const sel =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const frame = requestAnimationFrame(() => {
      const initial =
        dialogRef.current?.querySelector<HTMLElement>('[data-dialog-initial-focus]') ??
        dialogRef.current?.querySelector<HTMLElement>(sel);
      initial?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(sel)
      ).filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [mounted]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[10vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ fontFamily: FONT_SANS }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.14 }}
        className="w-full overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d1219] shadow-2xl"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h2 id="admin-dialog-title" className="text-[13px] font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] bg-white/[0.01] px-4 py-3">
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeName(name);
    const mail = email.trim().toLowerCase();
    if (!clean) return setError('Name is required.');
    if (clean.length < 2) return setError('Name must be at least 2 characters.');
    if (!isValidEmail(mail)) return setError('Enter a valid email address.');
    if (!roleId) return setError('Select a role.');
    setError('');
    onSave({ name: clean, email: mail, roleId, status });
  };

  return (
    <ModalShell
      title={user ? 'Edit user' : 'Invite user'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={BTN_OUTLINE} onClick={onClose}>
            Cancel
          </button>
          <button form="user-form" className={BTN_PRIMARY} type="submit">
            {user ? 'Save' : 'Send invite'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className={LABEL}>Full name</span>
          <input
            data-dialog-initial-focus
            className={FIELD}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Samira Joshi"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className={LABEL}>Work email</span>
          <input
            type="email"
            className={`${FIELD} font-mono`}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoComplete="email"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Role</span>
            <select
              className={`${FIELD} cursor-pointer appearance-none`}
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
            >
              {roles.length === 0 && <option value="">No roles</option>}
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL}>Status</span>
            <select
              className={`${FIELD} cursor-pointer appearance-none`}
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
          <p className="text-[11px] text-rose-400" role="alert">
            {error}
          </p>
        )}
        {!user && (
          <p className="text-[10px] leading-relaxed text-slate-600">
            No email is sent in this demo. The invitation is simulated locally.
          </p>
        )}
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
    const clean = normalizeName(name);
    if (!clean) return setError('Role name is required.');
    if (clean.length < 2) return setError('Name must be at least 2 characters.');
    setError('');
    onSave({ name: clean, description: description.trim(), permissions });
  };

  return (
    <ModalShell
      title="Create role"
      width={520}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={BTN_OUTLINE} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={submit}>
            Create
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className={LABEL}>Role name</span>
          <input
            data-dialog-initial-focus
            className={FIELD}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Incident coordinator"
          />
        </label>
        <label className="block">
          <span className={LABEL}>Description</span>
          <textarea
            className={`${TEXTAREA} min-h-16`}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <div>
          <p className={LABEL}>Starting permissions</p>
          <div className="max-h-56 overflow-y-auto rounded border border-white/[0.08]">
            {permissionCatalog.flatMap(g => g.permissions).map(p => {
              const checked = permissions.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2.5 border-b border-white/[0.04] px-2.5 py-1.5 last:border-0 hover:bg-white/[0.02]"
                >
                  <span
                    className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded border transition ${
                      checked
                        ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                        : 'border-white/[0.15]'
                    }`}
                  >
                    {checked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-[12px] text-slate-300">{p.label}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setPermissions(cur =>
                        cur.includes(p.id) ? cur.filter(x => x !== p.id) : [...cur, p.id]
                      )
                    }
                    className="sr-only"
                  />
                </label>
              );
            })}
          </div>
        </div>
        {error && (
          <p className="text-[11px] text-rose-400" role="alert">
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
  const danger = tone === 'danger';
  return (
    <ModalShell
      title={title}
      width={420}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={BTN_OUTLINE} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            data-dialog-initial-focus
            className={danger ? BTN_DANGER : BTN_PRIMARY}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[12px] leading-relaxed text-slate-400">{message}</p>
    </ModalShell>
  );
}