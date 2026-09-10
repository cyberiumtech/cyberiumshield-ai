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
   FONTS + PANEL STYLES
   ───────────────────────────────────────────────────────────── */
const FONT_SANS = "'Space Grotesk', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

/* Panels now have visible rounded borders + lifted surface */
const PANEL = 'rounded-xl border border-line-2 bg-panel';

/* Buttons / fields / labels */
const BTN =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-fg-3 transition hover:bg-tint-2 hover:text-fg focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_PRIMARY =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 text-[12px] font-medium text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const BTN_OUTLINE =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line-2 bg-transparent px-3.5 text-[12px] font-medium text-fg-2 transition hover:border-line-3 hover:bg-tint-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40';

const FIELD =
  'w-full h-10 rounded-lg border border-line-2 bg-field px-3 text-[13px] text-fg outline-none transition placeholder:text-fg-4 hover:border-line-3 focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60';

const LABEL = 'block mb-2 text-[12px] font-medium text-fg-2';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */
function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  );
}
function formatRole(role: string) {
  return role.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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
   MAIN
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
        className="mx-auto max-w-[1200px] px-6 py-8 text-[12px] text-fg-4"
      >
        Loading account…
      </div>
    );
  }

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

  return (
    <div
      style={{ fontFamily: FONT_SANS }}
      className="mx-auto w-full max-w-[1200px] px-6 pb-16 pt-6 text-fg-2"
    >
      {/* ═══ Profile header (no panel — sits on page background) ═══ */}
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar src={avatar} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-semibold tracking-tight text-fg">{name}</h1>
            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/[0.08] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-cyan-400">
              {role}
            </span>
          </div>
          <p className="mt-1 truncate font-mono text-[12px] text-fg-4">{email}</p>
          <p className="mt-1 text-[11px] text-fg-5">
            Member since {formatDate(user.created_at)}
          </p>
        </div>
      </header>

      {/* ═══ Grid ═══ */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        {/* ─── MAIN COLUMN ─── */}
        <div className="min-w-0 space-y-5">
          {/* ═══════ PROFILE INFORMATION ═══════ */}
          <section className={PANEL}>
            <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
              <h2 className="text-[15px] font-semibold text-fg">Profile information</h2>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[12px] font-medium text-cyan-400 transition hover:text-cyan-300"
                >
                  Edit
                </button>
              )}
            </header>

            <form onSubmit={handleSave} className="space-y-5 p-6">
              {/* Avatar block — inset field with border, matching reference */}
              <div className="rounded-lg border border-line-2 bg-field p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar src={avatar} name={name} />
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line-2 bg-panel px-3 text-[12px] font-medium text-fg-2 transition hover:border-line-3 hover:bg-tint-2">
                        <Upload className="h-3.5 w-3.5" />
                        Choose file
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleAvatar}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <p className="text-[12px] font-medium text-fg-2">Profile photo</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-fg-4">
                      JPG, PNG, or WebP · up to 2 MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Fields — stacked single column, matching reference */}
              <div className="space-y-4">
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
                <label className="block">
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
                <div className="flex justify-end gap-2 border-t border-line pt-4">
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

          {/* ═══════ PASSWORD ═══════ */}
          <section className={PANEL}>
            <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-fg">Change password</h2>
                <p className="mt-0.5 text-[12px] text-fg-4">
                  Use a strong, unique password for your account.
                </p>
              </div>
              {!passwordOpen && (
                <button
                  type="button"
                  onClick={() => setPasswordOpen(true)}
                  className="text-[12px] font-medium text-cyan-400 transition hover:text-cyan-300"
                >
                  Change
                </button>
              )}
            </header>

            {passwordOpen ? (
              <form onSubmit={handlePassword} className="space-y-4 p-6">
                <PasswordField
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showPassword}
                  toggle={() => setShowPassword(!showPassword)}
                />
                <PasswordField
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showPassword}
                  toggle={() => setShowPassword(!showPassword)}
                />
                <div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength ? 'bg-cyan-500' : 'bg-tint-3'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-fg-4">
                    Use at least 8 characters, with mixed case, a number, and a symbol.
                  </p>
                </div>
                <PasswordField
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showPassword}
                  toggle={() => setShowPassword(!showPassword)}
                />
                <div className="flex justify-end gap-2 border-t border-line pt-4">
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
              <div className="flex items-center gap-2.5 px-6 py-5 text-[12px] text-fg-4">
                <LockKeyhole className="h-3.5 w-3.5 text-fg-5" />
                Your password is protected.
              </div>
            )}
          </section>

          {/* ═══════ APPEARANCE ═══════ */}
          <section className={PANEL}>
            <header className="border-b border-line px-6 py-4">
              <h2 className="text-[15px] font-semibold text-fg">Appearance</h2>
              <p className="mt-0.5 text-[12px] text-fg-4">
                Choose how the workspace looks. System follows your OS setting.
              </p>
            </header>
            <div className="grid grid-cols-3 gap-2 p-6">
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
                    className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-[12px] font-medium transition ${
                      active
                        ? 'border-cyan-500/50 bg-cyan-500/[0.08] text-cyan-500'
                        : 'border-line-2 text-fg-4 hover:border-line-3 hover:bg-tint hover:text-fg-2'
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

        {/* ─── SIDEBAR ─── */}
        <aside className="space-y-5">
          {/* Account details */}
          <section className={PANEL}>
            <header className="border-b border-line px-6 py-4">
              <h2 className="text-[15px] font-semibold text-fg">Account details</h2>
            </header>
            <dl className="divide-y divide-line">
              <DetailRow
                label="Status"
                value={
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/[0.08] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                }
              />
              <DetailRow
                label="Role"
                value={<span className="text-[12px] text-fg-2">{role}</span>}
              />
              <DetailRow
                label="Joined"
                value={
                  <span className="font-mono text-[11px] text-fg-2">
                    {formatFullDate(user.created_at)}
                  </span>
                }
              />
              <DetailRow
                label="Last updated"
                value={
                  <span className="font-mono text-[11px] text-fg-2">
                    {relativeUpdated(user.updated_at)}
                  </span>
                }
              />
            </dl>
          </section>

          {/* Quick actions */}
          <section className={PANEL}>
            <header className="border-b border-line px-6 py-4">
              <h2 className="text-[15px] font-semibold text-fg">Quick actions</h2>
            </header>
            <div className="p-3">
              {quickActions.map(([Icon, label, path]) => (
                <Link
                  key={path}
                  to={path}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] text-fg-3 transition hover:bg-tint-2 hover:text-fg"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line-2 bg-field text-fg-4 transition group-hover:text-cyan-500">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{label}</span>
                  <span className="ml-auto text-fg-5 transition group-hover:translate-x-0.5 group-hover:text-fg-3">
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
        className={`${dimension} shrink-0 rounded-full border border-line-2 object-cover`}
      />
    );
  }
  return (
    <div
      className={`${dimension} grid shrink-0 place-items-center rounded-full border border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.12] to-violet-500/[0.08] font-mono font-semibold text-cyan-500 ${fontSize}`}
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
    <div className="flex items-center justify-between gap-4 px-6 py-3.5">
      <dt className="text-[12px] text-fg-4">{label}</dt>
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
          className={`${FIELD} pr-10`}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-fg-4 hover:bg-tint-2 hover:text-fg-2"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}