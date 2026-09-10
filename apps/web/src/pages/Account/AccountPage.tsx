import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Grid2X2,
  LockKeyhole,
  Monitor,
  Moon,
  Settings,
  Sun,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import type { User } from '../../services/auth.service';
import { isAdminRole } from '../../components/AdminRoute/AdminRoute';

/* ─────────────────────────────────────────────────────────────
   FONTS + STYLES
   ───────────────────────────────────────────────────────────── */
const FONT_SANS = "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

const PANEL = 'border border-white/[0.08] bg-[#0b1424]';

const BTN =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded px-2.5 text-[12px] font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_PRIMARY =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded bg-cyan-500 px-3 text-[12px] font-medium text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_OUTLINE =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded border border-white/[0.1] bg-transparent px-3 text-[12px] font-medium text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.04] focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const FIELD =
  'w-full h-8 rounded border border-white/[0.08] bg-[#07101e] px-2.5 text-[12px] text-slate-100 outline-none transition placeholder:text-slate-600 hover:border-white/[0.15] focus:border-cyan-500/60 disabled:cursor-not-allowed disabled:opacity-60';

const LABEL = 'block mb-1.5 text-[11px] font-medium text-slate-400';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */
function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  );
}

function formatRole(role: string) {
  return role.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
    new Date(value)
  );
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function relativeUpdated(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  return days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`;
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
export function AccountPage() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [savedProfile, setSavedProfile] = useState({
    name: '',
    email: '',
    organizationName: '',
    avatar: undefined as string | undefined,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!user) return;
    const profile = {
      name: user.name,
      email: user.email,
      organizationName: user.organization_name,
      avatar: user.avatar,
    };
    setName(profile.name);
    setEmail(profile.email);
    setOrganizationName(profile.organizationName);
    setAvatar(profile.avatar);
    setSavedProfile(profile);
  }, [user]);

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (/\d/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  }, [newPassword]);

  if (isLoading || !user) {
    return (
      <div
        style={{ fontFamily: FONT_SANS }}
        className="mx-auto max-w-[1200px] px-6 py-8 text-[12px] text-slate-500"
      >
        Loading account…
      </div>
    );
  }

  /* ── Handlers ── */
  const handleAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Use a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Profile photos must be 2 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    setName(savedProfile.name);
    setEmail(savedProfile.email);
    setOrganizationName(savedProfile.organizationName);
    setAvatar(savedProfile.avatar);
    setEditing(false);
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return toast.error('Full name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return toast.error('Enter a valid email address.');
    if (!organizationName.trim()) return toast.error('Organization name is required.');

    const profile = {
      name: name.trim(),
      email: email.trim(),
      organizationName: organizationName.trim(),
      avatar,
    };
    const updatedUser: User = {
      ...user,
      name: profile.name,
      email: profile.email,
      organization_name: profile.organizationName,
      avatar: profile.avatar,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('cybershield_user', JSON.stringify(updatedUser));
    queryClient.setQueryData(['user'], updatedUser);
    setName(profile.name);
    setEmail(profile.email);
    setOrganizationName(profile.organizationName);
    setSavedProfile(profile);
    setEditing(false);
    toast.success('Profile updated.');
  };

  const handlePassword = (event: FormEvent) => {
    event.preventDefault();
    if (!currentPassword) return toast.error('Enter your current password.');
    if (newPassword.length < 8)
      return toast.error('New password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordOpen(false);
    toast.success('Password updated.');
  };

  const role = formatRole(user.role || 'administrator');
  const quickActions: ReadonlyArray<readonly [LucideIcon, string, string]> = [
    [Grid2X2, 'Dashboard', '/dashboard'],
    [CreditCard, 'Subscription', '/subscription'],
    ...(isAdminRole(user.role) ? [[Settings, 'Settings', '/settings'] as const] : []),
  ];

  /* ── Render ── */
  return (
    <div
      style={{ fontFamily: FONT_SANS }}
      className="mx-auto w-full max-w-[1200px] px-6 pb-16 pt-6 text-slate-200"
    >
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="mb-8 flex flex-wrap items-center gap-4 border-b border-white/[0.06] pb-6">
        <Avatar src={avatar} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[20px] font-semibold tracking-tight text-white">{name}</h1>
            <span className="rounded-sm border border-cyan-500/30 bg-cyan-500/[0.08] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-cyan-400">
              {role}
            </span>
          </div>
          <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{email}</p>
          <p className="mt-1 text-[11px] text-slate-600">
            Member since {formatDate(user.created_at)}
          </p>
        </div>
      </header>

      {/* ═══════════════ 2-COLUMN GRID ═══════════════ */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        {/* ── MAIN COLUMN ── */}
        <div className="min-w-0 space-y-6">
          {/* ═══ PROFILE INFORMATION ═══ */}
          <section className={PANEL}>
            <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-white">Profile information</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Manage your public account details.
                </p>
              </div>
              {!editing && (
                <button type="button" onClick={() => setEditing(true)} className={BTN_OUTLINE}>
                  Edit
                </button>
              )}
            </header>

            <form onSubmit={handleSave} className="space-y-5 p-5">
              {/* Avatar row */}
              <div className="flex flex-wrap items-center gap-4">
                <Avatar src={avatar} name={name} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-slate-200">Profile photo</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    JPG, PNG, or WebP · up to 2 MB
                  </p>
                </div>
                {editing && (
                  <label className={`${BTN_OUTLINE} cursor-pointer`}>
                    <Upload className="h-3.5 w-3.5" />
                    Change photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatar}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className={LABEL}>Full name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={!editing}
                    className={FIELD}
                  />
                </label>
                <label className="block">
                  <span className={LABEL}>Email address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={!editing}
                    className={FIELD}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className={LABEL}>Organization name</span>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={e => setOrganizationName(e.target.value)}
                    disabled={!editing}
                    className={FIELD}
                  />
                </label>
              </div>

              {editing && (
                <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
                  <button type="button" onClick={handleCancel} className={BTN}>
                    Cancel
                  </button>
                  <button type="submit" className={BTN_PRIMARY}>
                    Save changes
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* ═══ CHANGE PASSWORD ═══ */}
          <section className={PANEL}>
            <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-white">Password</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Use a strong, unique password for your account.
                </p>
              </div>
              {!passwordOpen && (
                <button
                  type="button"
                  onClick={() => setPasswordOpen(true)}
                  className={BTN_OUTLINE}
                >
                  Change
                </button>
              )}
            </header>

            {passwordOpen ? (
              <form onSubmit={handlePassword} className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <PasswordField
                      label="Current password"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      show={showPassword}
                      toggle={() => setShowPassword(!showPassword)}
                    />
                  </div>
                  <PasswordField
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showPassword}
                    toggle={() => setShowPassword(!showPassword)}
                  />
                  <PasswordField
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showPassword}
                    toggle={() => setShowPassword(!showPassword)}
                  />
                </div>

                {/* Strength meter */}
                <div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength ? 'bg-cyan-500' : 'bg-white/[0.06]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Use at least 8 characters, with mixed case, a number, and a symbol.
                  </p>
                </div>

                <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(false)}
                    className={BTN}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={BTN_PRIMARY}>
                    Update password
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2.5 px-5 py-4 text-[12px] text-slate-500">
                <LockKeyhole className="h-3.5 w-3.5 text-slate-600" />
                Your password is protected.
              </div>
            )}
          </section>

          {/* ═══ APPEARANCE ═══ */}
          <section className={PANEL}>
            <header className="border-b border-white/[0.06] px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-white">Appearance</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Choose how the workspace looks. System follows your OS setting.
              </p>
            </header>
            <div className="grid grid-cols-3 gap-2 p-5">
              {(
                [
                  ['light', Sun, 'Light'],
                  ['dark', Moon, 'Dark'],
                  ['system', Monitor, 'System'],
                ] as [Theme, typeof Sun, string][]
              ).map(([value, Icon, label]) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={`flex h-10 items-center justify-center gap-2 rounded border text-[12px] font-medium transition ${
                      active
                        ? 'border-cyan-500/50 bg-cyan-500/[0.08] text-cyan-400'
                        : 'border-white/[0.08] text-slate-500 hover:border-white/[0.16] hover:text-slate-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {active && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="space-y-6">
          {/* Account details */}
          <section className={PANEL}>
            <header className="border-b border-white/[0.06] px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-white">Account details</h2>
            </header>
            <dl className="divide-y divide-white/[0.05]">
              <DetailRow
                label="Status"
                value={
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                }
              />
              <DetailRow label="Role" value={<span className="text-[12px] text-slate-300">{role}</span>} />
              <DetailRow
                label="Joined"
                value={
                  <span className="font-mono text-[11px] text-slate-300">
                    {formatFullDate(user.created_at)}
                  </span>
                }
              />
              <DetailRow
                label="Last updated"
                value={
                  <span className="font-mono text-[11px] text-slate-300">
                    {relativeUpdated(user.updated_at)}
                  </span>
                }
              />
            </dl>
          </section>

          {/* Quick actions */}
          <section className={PANEL}>
            <header className="border-b border-white/[0.06] px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-white">Quick actions</h2>
            </header>
            <div className="p-2">
              {quickActions.map(([Icon, label, path]) => (
                <Link
                  key={path}
                  to={path}
                  className="group flex items-center gap-3 rounded px-3 py-2.5 text-[12px] text-slate-400 transition hover:bg-white/[0.03] hover:text-slate-200"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded border border-white/[0.08] bg-[#07101e] text-slate-500 transition group-hover:text-cyan-400">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{label}</span>
                  <span className="ml-auto text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-slate-400">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   AVATAR
   ═════════════════════════════════════════════════════════════ */
function Avatar({
  src,
  name,
  size = 'md',
}: {
  src?: string;
  name: string;
  size?: 'md' | 'lg';
}) {
  const dimension = size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
  const fontSize = size === 'lg' ? 'text-[18px]' : 'text-[13px]';

  if (src) {
    return (
      <img
        src={src}
        alt={`${name} avatar`}
        className={`${dimension} shrink-0 rounded-full border border-white/[0.08] object-cover`}
      />
    );
  }
  return (
    <div
      className={`${dimension} grid shrink-0 place-items-center rounded-full border border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.12] to-violet-500/[0.08] font-mono font-semibold text-cyan-400 ${fontSize}`}
    >
      {getInitials(name)}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   DETAIL ROW
   ═════════════════════════════════════════════════════════════ */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 text-right">{value}</dd>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PASSWORD FIELD
   ═════════════════════════════════════════════════════════════ */
function PasswordField({
  label,
  value,
  onChange,
  show,
  toggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  toggle: () => void;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <span className="relative block">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={event => onChange(event.target.value)}
          className={`${FIELD} pr-9`}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-slate-500 hover:text-slate-200"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </span>
    </label>
  );
}