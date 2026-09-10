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
  Save,
  Settings,
  Sun,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import type { User } from '../../services/auth.service';
import { isAdminRole } from '../../components/AdminRoute/AdminRoute';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function formatRole(role: string) {
  return role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(value));
}

function relativeUpdated(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  return days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-zinc-800 bg-[#121215] ${className}`}>{children}</section>;
}

function CardHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
      <div>
        <h2 className="font-semibold text-zinc-100">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', disabled = false, placeholder }: { label: string; value: string; onChange?: (value: string) => void; type?: string; disabled?: boolean; placeholder?: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange?.(event.target.value)} disabled={disabled} placeholder={placeholder} className="w-full rounded-lg border border-zinc-800 bg-[#09090b] px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/10 disabled:cursor-not-allowed disabled:text-zinc-500" />
    </label>
  );
}

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

  if (isLoading || !user) return <div className="p-8 text-sm text-zinc-500">Loading account...</div>;

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email address.');
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
    if (newPassword.length < 8) return toast.error('New password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordOpen(false);
    toast.success('Password updated.');
  };

  const role = formatRole(user.role || 'administrator');
  const quickActions = [
    [Grid2X2, 'Dashboard', '/dashboard'],
    [CreditCard, 'Subscription', '/subscription'],
    ...(isAdminRole(user.role) ? [[Settings, 'Settings', '/settings']] : []),
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-zinc-100">
      <header className="flex flex-wrap items-center gap-4 border-b border-zinc-800 pb-6">
        <Avatar src={avatar} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">{role}</span>
          </div>
          <p className="mt-1 truncate text-sm text-zinc-400">{email}</p>
          <p className="mt-1 text-xs text-zinc-600">Member since {formatDate(user.created_at)}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeading title="Profile information" subtitle="Manage your public account details." action={!editing && <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white">Edit</button>} />
            <form onSubmit={handleSave} className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar src={avatar} name={name} />
                {editing && <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-500"><Upload className="h-4 w-4" /> Change photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} className="hidden" /></label>}
                <p className="text-xs text-zinc-600">JPG, PNG, or WebP · up to 2 MB</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full name" value={name} onChange={setName} disabled={!editing} />
                <Field label="Email address" value={email} onChange={setEmail} type="email" disabled={!editing} />
                <Field label="Organization name" value={organizationName} onChange={setOrganizationName} disabled={!editing} />
              </div>
              {editing && <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4"><button type="button" onClick={handleCancel} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white"><X className="h-4 w-4" /> Cancel</button><button type="submit" className="flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"><Save className="h-4 w-4" /> Save changes</button></div>}
            </form>
          </Card>

          <Card>
            <CardHeading title="Change password" subtitle="Use a strong, unique password for your account." action={!passwordOpen && <button type="button" onClick={() => setPasswordOpen(true)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white">Change</button>} />
            {passwordOpen ? <form onSubmit={handlePassword} className="space-y-4 p-5"><PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} /><PasswordField label="New password" value={newPassword} onChange={setNewPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} /><div className="flex gap-1">{[1, 2, 3, 4].map((level) => <div key={level} className={`h-1 flex-1 rounded-full ${level <= passwordStrength ? 'bg-indigo-400' : 'bg-zinc-800'}`} />)}</div><p className="text-xs text-zinc-600">Use at least 8 characters, with mixed case, a number, and a symbol.</p><PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} /><div className="flex justify-end gap-2 border-t border-zinc-800 pt-4"><button type="button" onClick={() => setPasswordOpen(false)} className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button><button type="submit" className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400">Update password</button></div></form> : <div className="flex items-center gap-3 p-5 text-sm text-zinc-500"><LockKeyhole className="h-4 w-4" /> Your password is protected.</div>}
          </Card>

          <Card>
            <CardHeading title="Appearance" subtitle="Choose how the workspace looks. System follows your OS setting." />
            <div className="grid grid-cols-3 gap-2 p-5">{([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'System']] as [Theme, typeof Sun, string][]).map(([value, Icon, label]) => <button type="button" key={value} onClick={() => setTheme(value)} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${theme === value ? 'border-indigo-400/60 bg-indigo-500/10 text-indigo-200' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}><Icon className="h-4 w-4" />{label}{theme === value && <Check className="h-3.5 w-3.5" />}</button>)}</div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card><CardHeading title="Account details" /><dl className="divide-y divide-zinc-800 px-5">{[['Status', <span className="inline-flex items-center gap-1.5 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active</span>], ['Role', role], ['Joined', new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })], ['Last updated', relativeUpdated(user.updated_at)]].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-zinc-500">{label}</dt><dd className="text-right text-zinc-300">{value}</dd></div>)}</dl></Card>
          <Card><CardHeading title="Quick actions" /><div className="p-2">{quickActions.map(([Icon, label, path]) => <Link key={path} to={path} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"><Icon className="h-4 w-4" /></span>{label}<span className="ml-auto text-zinc-700">→</span></Link>)}</div></Card>
        </aside>
      </div>
    </div>
  );
}

function Avatar({ src, name, size = 'md' }: { src?: string; name: string; size?: 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-lg' : 'h-12 w-12 text-sm';
  return src ? <img src={src} alt={`${name} avatar`} className={`${sizeClass} rounded-full border border-zinc-700 object-cover`} /> : <div className={`${sizeClass} flex items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 font-semibold text-indigo-200`}><UserRound className="mr-1 h-4 w-4" />{getInitials(name)}</div>;
}

function PasswordField({ label, value, onChange, show, toggle }: { label: string; value: string; onChange: (value: string) => void; show: boolean; toggle: () => void }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-zinc-300">{label}</span><span className="relative block"><input type={show ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-zinc-800 bg-[#09090b] px-3 py-2.5 pr-10 text-sm text-zinc-100 outline-none focus:border-indigo-400/70" /><button type="button" onClick={toggle} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>;
}
