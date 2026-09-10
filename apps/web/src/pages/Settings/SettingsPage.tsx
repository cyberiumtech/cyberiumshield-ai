import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell, Building2, Eye, EyeOff, Image, Link2, Mail,
  RefreshCcw, ShieldAlert, TestTube2, Trash2, Upload, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../services/auth.service';
import { testPusherConnection, testTinyUrlConnection } from '../../services/integration.service';
import defaultLogo from '../../assets/images/Cybershield-AI.png';
import {
  applyFavicon, CompanySettings, EmailSettings, getEffectiveFavicon,
  getEffectiveLogo, getSettings, resetBrandingSettings, resetScanHistory,
  saveBrandingSettings, saveCompanySettings, saveEmailSettings, saveNotificationSettings,
  saveTinyUrlSettings, validatePusherConfiguration, validateTinyUrlConfiguration,
} from '../../services/settings.service';

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

const BTN_DANGER =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded bg-rose-500 px-3 text-[12px] font-medium text-white transition hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-40';

const FIELD =
  'w-full h-8 rounded border border-white/[0.08] bg-[#07101e] px-2.5 text-[12px] text-slate-100 outline-none transition placeholder:text-slate-600 hover:border-white/[0.15] focus:border-cyan-500/60 disabled:cursor-not-allowed disabled:opacity-50';

const TEXTAREA = `${FIELD} h-auto py-2 leading-relaxed resize-y`;

const LABEL = 'block mb-1.5 text-[11px] font-medium text-slate-400';

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────────── */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BRAND_ASSET_SIZE = 350 * 1024;

const sections = [
  ['company', 'Company profile', Building2],
  ['tinyurl', 'TinyURL', Link2],
  ['email', 'Email delivery', Mail],
  ['notifications', 'Notifications', Bell],
  ['branding', 'Branding', Image],
  ['data-reset', 'Data reset', ShieldAlert],
] as const;

const validUrl = (value: string) => {
  if (!value.trim()) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const initial = useMemo(() => getSettings(user?.organization_name), [user?.organization_name]);
  const [company, setCompany] = useState(initial.company);
  const [tinyUrl, setTinyUrl] = useState(initial.tinyUrl);
  const [email, setEmail] = useState(initial.email);
  const [notifications, setNotifications] = useState(initial.notifications);
  const [branding, setBranding] = useState(initial.branding);
  const [tinyStatus, setTinyStatus] = useState('');
  const [pusherStatus, setPusherStatus] = useState('');
  const [testingTinyUrl, setTestingTinyUrl] = useState(false);
  const [testingPusher, setTestingPusher] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const [activeSection, setActiveSection] = useState<string>('company');

  useEffect(() => applyFavicon(branding, defaultLogo), [branding]);

  /* Scroll spy */
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-120px 0px -55% 0px', threshold: 0 }
    );
    sections.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  /* ── Handlers ── */
  const saveCompany = (event: FormEvent) => {
    event.preventDefault();
    const next = Object.fromEntries(
      Object.entries(company).map(([k, v]) => [k, v.trim()])
    ) as unknown as CompanySettings;
    if (!next.companyName) return toast.error('Company name is required.');
    if (next.email && !EMAIL.test(next.email))
      return toast.error('Enter a valid company email address.');
    if (!validUrl(next.website))
      return toast.error('Website must begin with http:// or https://.');
    try {
      saveCompanySettings(next);
      setCompany(next);
      if (user) {
        const updatedUser: User = {
          ...user,
          organization_name: next.companyName,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem('cybershield_user', JSON.stringify(updatedUser));
        queryClient.setQueryData(['user'], updatedUser);
      }
      toast.success('Company profile saved.');
    } catch {
      toast.error('Browser storage is unavailable. Company profile was not saved.');
    }
  };

  const saveTiny = (event: FormEvent) => {
    event.preventDefault();
    try {
      saveTinyUrlSettings(tinyUrl);
      toast.success('TinyURL settings saved locally.');
    } catch {
      toast.error('Browser storage is unavailable. TinyURL settings were not saved.');
    }
  };

  const saveEmail = (event: FormEvent) => {
    event.preventDefault();
    if (email.zeptoFromAddress && !EMAIL.test(email.zeptoFromAddress))
      return toast.error('Enter a valid ZeptoMail from address.');
    if (email.smtpPort < 1 || email.smtpPort > 65535)
      return toast.error('SMTP port must be between 1 and 65535.');
    if (email.smtpFromAddress && !EMAIL.test(email.smtpFromAddress))
      return toast.error('Enter a valid SMTP from address.');
    try {
      saveEmailSettings(email);
      toast.success('Email settings saved locally.');
    } catch {
      toast.error('Browser storage is unavailable. Email settings were not saved.');
    }
  };

  const saveNotifications = (event: FormEvent) => {
    event.preventDefault();
    try {
      saveNotificationSettings(notifications);
      toast.success('Notification settings saved locally.');
    } catch {
      toast.error('Browser storage is unavailable. Notification settings were not saved.');
    }
  };

  const testTinyUrl = async () => {
    const validation = validateTinyUrlConfiguration(tinyUrl);
    if (!validation.ok) return setTinyStatus(validation.message);
    setTestingTinyUrl(true);
    setTinyStatus('Contacting TinyURL…');
    try {
      const result = await testTinyUrlConnection(tinyUrl);
      setTinyStatus(result.message);
      toast.success(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TinyURL connection test failed.';
      setTinyStatus(message);
      toast.error(message);
    } finally {
      setTestingTinyUrl(false);
    }
  };

  const testPusher = async () => {
    const validation = validatePusherConfiguration(notifications);
    if (!validation.ok) return setPusherStatus(validation.message);
    setTestingPusher(true);
    setPusherStatus('Contacting Pusher…');
    try {
      const result = await testPusherConnection(notifications);
      setPusherStatus(result.message);
      toast.success(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pusher connection test failed.';
      setPusherStatus(message);
      toast.error(message);
    } finally {
      setTestingPusher(false);
    }
  };

  const saveBranding = (event: FormEvent) => {
    event.preventDefault();
    if (!validUrl(branding.logoUrl) || !validUrl(branding.faviconUrl))
      return toast.error('External image URLs must begin with http:// or https://.');
    try {
      saveBrandingSettings(branding);
      applyFavicon(branding, defaultLogo);
      toast.success('Branding saved and applied.');
    } catch {
      toast.error('Branding could not be saved. Try smaller image files or clear browser storage.');
    }
  };

  const upload = (kind: 'logo' | 'favicon') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const accepted =
      kind === 'logo'
        ? ['image/png', 'image/jpeg', 'image/webp']
        : ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'];
    if (!accepted.includes(file.type))
      return toast.error(
        kind === 'logo' ? 'Logo must be PNG, JPG, or WebP.' : 'Favicon must be PNG, ICO, or SVG.'
      );
    if (file.size > MAX_BRAND_ASSET_SIZE)
      return toast.error('Image must be 350 KB or smaller for browser storage.');
    const reader = new FileReader();
    reader.onload = () =>
      setBranding(current => ({
        ...current,
        [kind === 'logo' ? 'logoDataUrl' : 'faviconDataUrl']: String(reader.result),
      }));
    reader.onerror = () => toast.error('The selected image could not be read.');
    reader.readAsDataURL(file);
  };

  const restoreBranding = () => {
    try {
      const next = resetBrandingSettings();
      setBranding(next);
      applyFavicon(next, defaultLogo);
      toast.success('Default branding restored.');
    } catch {
      toast.error('Default branding could not be restored.');
    }
  };

  const confirmReset = () => {
    if (resetText !== 'RESET LOGS') return;
    const removed = resetScanHistory();
    setResetOpen(false);
    setResetText('');
    toast.success(
      removed
        ? `Logs data reset. ${removed} stored log ${removed === 1 ? 'set' : 'sets'} removed.`
        : 'Logs data reset. No saved scan history was found.'
    );
  };

  /* ── Status summary ── */
  const statusChips = [
    {
      label: 'Company',
      state: company.companyName ? 'configured' : 'needs setup',
      active: Boolean(company.companyName),
    },
    {
      label: 'TinyURL',
      state: tinyUrl.enabled ? (tinyUrl.apiKey ? 'configured' : 'needs key') : 'disabled',
      active: tinyUrl.enabled && Boolean(tinyUrl.apiKey),
    },
    {
      label: 'Email',
      state: email.zeptoApiKey ? 'configured' : 'needs setup',
      active: Boolean(email.zeptoApiKey),
    },
    {
      label: 'Pusher',
      state: notifications.pusherEnabled ? 'local config' : 'disabled',
      active: notifications.pusherEnabled,
    },
    {
      label: 'Branding',
      state: branding.logoDataUrl || branding.logoUrl ? 'custom' : 'default',
      active: Boolean(branding.logoDataUrl || branding.logoUrl),
    },
  ];

  /* ── Render ── */
  return (
    <div
      style={{ fontFamily: FONT_SANS }}
      className="mx-auto w-full max-w-[1360px] px-6 pb-16 pt-6 text-slate-200"
    >
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-white">Settings</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Organization identity, delivery providers, notification channels, and branding.
            </p>
          </div>
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 sm:max-w-md">
            <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
            Browser-local configuration. Move secrets to encrypted server-side storage before
            production use.
          </p>
        </div>

        {/* Status chips */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4">
          {statusChips.map(chip => (
            <span key={chip.label} className="inline-flex items-center gap-1.5 text-[11px]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${chip.active ? 'bg-emerald-500' : 'bg-slate-600'}`}
              />
              <span className="font-medium text-slate-300">{chip.label}</span>
              <span className="text-slate-500">{chip.state}</span>
            </span>
          ))}
        </div>
      </header>

      {/* ═══════════════ LAYOUT ═══════════════ */}
      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* ── Sidebar ── */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav aria-label="Settings sections" className="space-y-0.5">
            {sections.map(([id, label, Icon]) => {
              const active = activeSection === id;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-[12px] font-medium transition ${
                    active
                      ? 'bg-white/[0.06] text-white'
                      : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500'}`}
                  />
                  <span className="truncate">{label}</span>
                </a>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="min-w-0 space-y-6">
          {/* ═══ COMPANY ═══ */}
          <Section
            id="company"
            title="Company profile"
            description="Legal and operational details shown across your workspace."
          >
            <form onSubmit={saveCompany} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Company name"
                  required
                  value={company.companyName}
                  onChange={value => setCompany({ ...company, companyName: value })}
                />
                <Field
                  label="Email"
                  type="email"
                  value={company.email}
                  onChange={value => setCompany({ ...company, email: value })}
                />
                <Field
                  label="Phone"
                  type="tel"
                  value={company.phone}
                  onChange={value => setCompany({ ...company, phone: value })}
                />
                <Field
                  label="Website"
                  type="url"
                  placeholder="https://example.com"
                  value={company.website}
                  onChange={value => setCompany({ ...company, website: value })}
                />
                <Field
                  label="Address"
                  value={company.address}
                  onChange={value => setCompany({ ...company, address: value })}
                  className="sm:col-span-2"
                />
                <Field
                  label="City"
                  value={company.city}
                  onChange={value => setCompany({ ...company, city: value })}
                />
                <Field
                  label="State / Province"
                  value={company.state}
                  onChange={value => setCompany({ ...company, state: value })}
                />
                <Field
                  label="Postal code"
                  value={company.postalCode}
                  onChange={value => setCompany({ ...company, postalCode: value })}
                />
                <Field
                  label="Country"
                  value={company.country}
                  onChange={value => setCompany({ ...company, country: value })}
                />
                <Field
                  label="PAN / VAT number"
                  value={company.panVatNumber}
                  onChange={value => setCompany({ ...company, panVatNumber: value })}
                />
                <Field
                  label="Registration number"
                  value={company.registrationNumber}
                  onChange={value => setCompany({ ...company, registrationNumber: value })}
                />
              </div>
              <Actions>
                <button type="submit" className={BTN_PRIMARY}>
                  Save changes
                </button>
              </Actions>
            </form>
          </Section>

          {/* ═══ TINYURL ═══ */}
          <Section
            id="tinyurl"
            title="TinyURL"
            description="Default behavior for links generated by the platform."
          >
            <form onSubmit={saveTiny} className="space-y-4">
              <Toggle
                label="Enable TinyURL shortening"
                description="Allow CyberShield to prepare shortened links through TinyURL."
                checked={tinyUrl.enabled}
                onChange={enabled => {
                  setTinyUrl({ ...tinyUrl, enabled });
                  setTinyStatus('');
                }}
              />
              <div className={!tinyUrl.enabled ? 'pointer-events-none opacity-50' : ''}>
                <SecretField
                  label="TinyURL API key"
                  value={tinyUrl.apiKey}
                  onChange={apiKey => setTinyUrl({ ...tinyUrl, apiKey })}
                  disabled={!tinyUrl.enabled}
                  autoComplete="off"
                />
              </div>
              <fieldset disabled={!tinyUrl.enabled} className={!tinyUrl.enabled ? 'opacity-50' : ''}>
                <legend className={LABEL}>Default link visibility</legend>
                <div className="inline-flex rounded border border-white/[0.08] p-0.5">
                  {(['public', 'private'] as const).map(option => (
                    <label
                      key={option}
                      className={`cursor-pointer rounded-sm px-3 py-1 text-[11px] font-medium capitalize transition ${
                        tinyUrl.visibility === option
                          ? 'bg-white/[0.08] text-white'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name="visibility"
                        value={option}
                        checked={tinyUrl.visibility === option}
                        onChange={() => setTinyUrl({ ...tinyUrl, visibility: option })}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>
              {tinyStatus && <StatusLine message={tinyStatus} />}
              <Actions>
                <button
                  type="button"
                  className={BTN_OUTLINE}
                  onClick={() => void testTinyUrl()}
                  disabled={testingTinyUrl || !tinyUrl.enabled}
                >
                  <TestTube2 className="h-3.5 w-3.5" />
                  {testingTinyUrl ? 'Testing…' : 'Test connection'}
                </button>
                <button type="submit" className={BTN_PRIMARY}>
                  Save changes
                </button>
              </Actions>
            </form>
          </Section>

          {/* ═══ EMAIL ═══ */}
          <Section
            id="email"
            title="Email delivery"
            description="ZeptoMail primary delivery with a controlled SMTP fallback."
          >
            <form onSubmit={saveEmail} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <SecretField
                  label="ZeptoMail API key"
                  value={email.zeptoApiKey}
                  onChange={zeptoApiKey => setEmail({ ...email, zeptoApiKey })}
                  autoComplete="off"
                />
                <Field
                  label="ZeptoMail from address"
                  type="email"
                  value={email.zeptoFromAddress}
                  onChange={zeptoFromAddress => setEmail({ ...email, zeptoFromAddress })}
                />
                <Field
                  label="From name"
                  value={email.zeptoFromName}
                  onChange={zeptoFromName => setEmail({ ...email, zeptoFromName })}
                />
              </div>

              <fieldset className="border-t border-white/[0.06] pt-5">
                <legend className="sr-only">SMTP fallback</legend>
                <Toggle
                  label="SMTP fallback"
                  description="Use SMTP only if primary ZeptoMail delivery is unavailable."
                  checked={email.smtpEnabled}
                  onChange={smtpEnabled => setEmail({ ...email, smtpEnabled })}
                />
                <div
                  className={`mt-4 grid gap-4 sm:grid-cols-2 ${!email.smtpEnabled ? 'pointer-events-none opacity-50' : ''}`}
                  aria-disabled={!email.smtpEnabled}
                >
                  <Field
                    label="SMTP host"
                    disabled={!email.smtpEnabled}
                    value={email.smtpHost}
                    onChange={smtpHost => setEmail({ ...email, smtpHost })}
                  />
                  <Field
                    label="Port"
                    type="number"
                    min={1}
                    max={65535}
                    disabled={!email.smtpEnabled}
                    value={String(email.smtpPort)}
                    onChange={smtpPort => setEmail({ ...email, smtpPort: Number(smtpPort) })}
                  />
                  <Field
                    label="Username"
                    autoComplete="off"
                    disabled={!email.smtpEnabled}
                    value={email.smtpUsername}
                    onChange={smtpUsername => setEmail({ ...email, smtpUsername })}
                  />
                  <SecretField
                    label="Password"
                    disabled={!email.smtpEnabled}
                    value={email.smtpPassword}
                    onChange={smtpPassword => setEmail({ ...email, smtpPassword })}
                    autoComplete="new-password"
                  />
                  <SelectField
                    label="Encryption"
                    disabled={!email.smtpEnabled}
                    value={email.smtpEncryption}
                    onChange={smtpEncryption =>
                      setEmail({
                        ...email,
                        smtpEncryption: smtpEncryption as EmailSettings['smtpEncryption'],
                      })
                    }
                    options={[
                      ['none', 'None'],
                      ['tls', 'TLS'],
                      ['ssl', 'SSL'],
                    ]}
                  />
                  <Field
                    label="From name"
                    disabled={!email.smtpEnabled}
                    value={email.smtpFromName}
                    onChange={smtpFromName => setEmail({ ...email, smtpFromName })}
                  />
                  <Field
                    label="From address"
                    type="email"
                    disabled={!email.smtpEnabled}
                    value={email.smtpFromAddress}
                    onChange={smtpFromAddress => setEmail({ ...email, smtpFromAddress })}
                  />
                </div>
              </fieldset>

              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                Credentials remain in this browser for demonstration only.
              </p>

              <Actions>
                <button type="submit" className={BTN_PRIMARY}>
                  Save changes
                </button>
              </Actions>
            </form>
          </Section>

          {/* ═══ NOTIFICATIONS ═══ */}
          <Section
            id="notifications"
            title="Notifications"
            description="How operators receive security and workflow events."
          >
            <form onSubmit={saveNotifications} className="space-y-6">
              <fieldset>
                <legend className={LABEL}>Notification channels</legend>
                <div className="divide-y divide-white/[0.04] border-y border-white/[0.06]">
                  <Toggle
                    compact
                    label="Database"
                    description="In-app notification bell"
                    checked={notifications.database}
                    onChange={database => setNotifications({ ...notifications, database })}
                  />
                  <Toggle
                    compact
                    label="Email"
                    description="Send via ZeptoMail"
                    checked={notifications.email}
                    onChange={emailChannel =>
                      setNotifications({ ...notifications, email: emailChannel })
                    }
                  />
                  <Toggle
                    compact
                    label="Real-time"
                    description="Instant browser notification via Pusher"
                    checked={notifications.realtime}
                    onChange={realtime =>
                      setNotifications({
                        ...notifications,
                        realtime,
                        pusherEnabled: realtime ? notifications.pusherEnabled : false,
                      })
                    }
                  />
                </div>
              </fieldset>

              <div className="rounded border border-white/[0.08] bg-[#07101e] p-4">
                <Toggle
                  label="Enable Pusher real-time notifications"
                  description={
                    notifications.realtime
                      ? 'Connect the real-time channel to Pusher.'
                      : 'Turn on the Real-time channel above first.'
                  }
                  checked={notifications.pusherEnabled}
                  disabled={!notifications.realtime}
                  onChange={pusherEnabled =>
                    setNotifications({
                      ...notifications,
                      pusherEnabled,
                      realtime: pusherEnabled || notifications.realtime,
                    })
                  }
                />
                <div
                  className={`mt-4 grid gap-4 sm:grid-cols-2 ${!notifications.pusherEnabled ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <Field
                    label="App ID"
                    disabled={!notifications.pusherEnabled}
                    value={notifications.pusherAppId}
                    onChange={pusherAppId => setNotifications({ ...notifications, pusherAppId })}
                  />
                  <Field
                    label="Cluster"
                    disabled={!notifications.pusherEnabled}
                    value={notifications.pusherCluster}
                    onChange={pusherCluster =>
                      setNotifications({ ...notifications, pusherCluster })
                    }
                  />
                  <SecretField
                    label="App key"
                    disabled={!notifications.pusherEnabled}
                    value={notifications.pusherAppKey}
                    onChange={pusherAppKey =>
                      setNotifications({ ...notifications, pusherAppKey })
                    }
                    autoComplete="off"
                  />
                  <SecretField
                    label="App secret"
                    disabled={!notifications.pusherEnabled}
                    value={notifications.pusherAppSecret}
                    onChange={pusherAppSecret =>
                      setNotifications({ ...notifications, pusherAppSecret })
                    }
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {pusherStatus && <StatusLine message={pusherStatus} />}
              <Actions>
                <button
                  type="button"
                  className={BTN_OUTLINE}
                  onClick={() => void testPusher()}
                  disabled={testingPusher || !notifications.pusherEnabled}
                >
                  <TestTube2 className="h-3.5 w-3.5" />
                  {testingPusher ? 'Testing…' : 'Test connection'}
                </button>
                <button type="submit" className={BTN_PRIMARY}>
                  Save changes
                </button>
              </Actions>
            </form>
          </Section>

          {/* ═══ BRANDING ═══ */}
          <Section
            id="branding"
            title="Branding"
            description="Apply a recognizable organization mark across the application shell."
          >
            <form onSubmit={saveBranding} className="space-y-6">
              <BrandAsset
                title="Logo"
                description="PNG, JPG, or WebP · max 350 KB"
                preview={getEffectiveLogo(branding, defaultLogo)}
                hasUpload={Boolean(branding.logoDataUrl)}
                url={branding.logoUrl}
                onUrl={logoUrl => setBranding({ ...branding, logoUrl })}
                onUpload={upload('logo')}
                accept="image/png,image/jpeg,image/webp"
                onClear={() => setBranding({ ...branding, logoDataUrl: '' })}
              />
              <BrandAsset
                title="Favicon"
                description="PNG, ICO, or SVG · max 350 KB"
                preview={getEffectiveFavicon(branding, defaultLogo)}
                hasUpload={Boolean(branding.faviconDataUrl)}
                url={branding.faviconUrl}
                onUrl={faviconUrl => setBranding({ ...branding, faviconUrl })}
                onUpload={upload('favicon')}
                accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                onClear={() => setBranding({ ...branding, faviconDataUrl: '' })}
              />
              <p className="text-[11px] text-slate-500">
                Uploaded files take precedence over external URLs.
              </p>
              <Actions>
                <button type="button" className={BTN_OUTLINE} onClick={restoreBranding}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Restore defaults
                </button>
                <button type="submit" className={BTN_PRIMARY}>
                  Save changes
                </button>
              </Actions>
            </form>
          </Section>

          {/* ═══ DATA RESET ═══ */}
          <section id="data-reset" tabIndex={-1} className="scroll-mt-6">
            <div className="border border-rose-500/25 bg-[#0b1424] p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-semibold text-white">Reset logs data</h2>
                  <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
                    Deletes only the browser scan history stored under email spam, malware, and
                    phishing log keys. Authentication, settings, incidents, users, roles, theme, and
                    language remain untouched.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className={`${BTN_DANGER} shrink-0`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Reset logs
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* ═══════════════ RESET DIALOG ═══════════════ */}
      {resetOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={event => event.target === event.currentTarget && setResetOpen(false)}
          style={{ fontFamily: FONT_SANS }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            className="w-full max-w-md rounded-lg border border-white/[0.08] bg-[#0d1219] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-4 py-3">
              <h2 id="reset-title" className="text-[13px] font-semibold text-white">
                Confirm logs reset
              </h2>
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                aria-label="Close"
                className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-[12px] leading-relaxed text-slate-400">
                Type <strong className="font-mono text-slate-200">RESET LOGS</strong> to delete
                only the three browser scan-history stores.
              </p>
              <div className="mt-4">
                <Field
                  label="Confirmation"
                  value={resetText}
                  onChange={setResetText}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/[0.06] bg-white/[0.01] px-4 py-3">
              <button type="button" className={BTN_OUTLINE} onClick={() => setResetOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={BTN_DANGER}
                disabled={resetText !== 'RESET LOGS'}
                onClick={confirmReset}
              >
                Reset logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SECTION WRAPPER
   ═════════════════════════════════════════════════════════════ */
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} tabIndex={-1} className={`${PANEL} scroll-mt-6`}>
      <header className="border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="text-[14px] font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   FORM FIELDS
   ═════════════════════════════════════════════════════════════ */
interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  autoComplete?: string;
  min?: number;
  max?: number;
  autoFocus?: boolean;
}

function Field({ label, value, onChange, type = 'text', className = '', ...props }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className={LABEL}>
        {label}
        {props.required && <span className="ml-1 text-rose-400">*</span>}
      </span>
      <input
        {...props}
        aria-label={label}
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        className={FIELD}
      />
    </label>
  );
}

function SecretField(props: Omit<FieldProps, 'type'>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Field {...props} type={shown ? 'text' : 'password'} />
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => setShown(!shown)}
        aria-label={`${shown ? 'Hide' : 'Show'} ${props.label}`}
        className="absolute bottom-[7px] right-1.5 grid h-6 w-6 place-items-center rounded text-slate-500 hover:text-slate-200 disabled:hidden"
      >
        {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        className={`${FIELD} cursor-pointer appearance-none pr-8`}
      >
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ═════════════════════════════════════════════════════════════
   TOGGLE
   ═════════════════════════════════════════════════════════════ */
function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  compact = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 ${
        compact ? 'py-2.5' : 'py-0.5'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-slate-200">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-4.5 w-8 shrink-0 rounded-full border border-white/[0.1] bg-white/[0.04] transition peer-checked:border-cyan-500/60 peer-checked:bg-cyan-500/30 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500/40 after:absolute after:left-[2px] after:top-1/2 after:h-3.5 after:w-3.5 after:-translate-y-1/2 after:rounded-full after:bg-slate-500 after:transition-all peer-checked:after:translate-x-[15px] peer-checked:after:bg-cyan-400"
        style={{ height: 18, width: 32 }}
      />
    </label>
  );
}

/* ═════════════════════════════════════════════════════════════
   BRAND ASSET
   ═════════════════════════════════════════════════════════════ */
function BrandAsset({
  title,
  description,
  preview,
  hasUpload,
  url,
  onUrl,
  onUpload,
  onClear,
  accept,
}: {
  title: string;
  description: string;
  preview: string;
  hasUpload: boolean;
  url: string;
  onUrl: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  accept: string;
}) {
  return (
    <fieldset className="grid gap-5 border-b border-white/[0.06] pb-6 last:border-0 last:pb-0 sm:grid-cols-[140px_minmax(0,1fr)]">
      <legend className="sr-only">{title}</legend>
      <div className="flex h-24 items-center justify-center rounded border border-dashed border-white/[0.1] bg-[#07101e] p-3">
        <img src={preview} alt={`${title} preview`} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="min-w-0 space-y-3">
        <div>
          <h3 className="text-[12px] font-medium text-slate-200">{title}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded border border-white/[0.1] bg-transparent px-3 text-[12px] font-medium text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.04]">
            <Upload className="h-3.5 w-3.5" />
            Choose file
            <input type="file" accept={accept} onChange={onUpload} className="sr-only" />
          </label>
          {hasUpload && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
            >
              Clear upload
            </button>
          )}
        </div>
        <Field
          label={`External ${title.toLowerCase()} URL`}
          type="url"
          placeholder="https://example.com/asset.png"
          value={url}
          onChange={onUrl}
        />
      </div>
    </fieldset>
  );
}

/* ═════════════════════════════════════════════════════════════
   SHARED BITS
   ═════════════════════════════════════════════════════════════ */
function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.06] pt-4">
      {children}
    </div>
  );
}

function StatusLine({ message }: { message: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="border-l-2 border-amber-500 bg-amber-500/[0.04] px-3 py-2 text-[11px] leading-relaxed text-amber-400"
    >
      {message}
    </p>
  );
}