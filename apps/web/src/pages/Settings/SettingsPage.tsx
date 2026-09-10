import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell, Building2, ChevronRight, Eye, EyeOff, Image, Link2, Mail,
  RefreshCcw, Save, ServerCog, ShieldAlert, TestTube2, Trash2, Upload, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../services/auth.service';
import { testPusherConnection, testTinyUrlConnection } from '../../services/integration.service';
import defaultLogo from '../../assets/images/Cybershield-AI.png';
import {
  applyFavicon, BrandingSettings, CompanySettings, EmailSettings, getEffectiveFavicon,
  getEffectiveLogo, getSettings, NotificationSettings, resetBrandingSettings, resetScanHistory,
  saveBrandingSettings, saveCompanySettings, saveEmailSettings, saveNotificationSettings,
  saveTinyUrlSettings, TinyUrlSettings, validatePusherConfiguration, validateTinyUrlConfiguration,
} from '../../services/settings.service';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BRAND_ASSET_SIZE = 350 * 1024;
const sections = [
  ['company', 'Company profile', Building2], ['tinyurl', 'TinyURL', Link2],
  ['email', 'Email delivery', Mail], ['notifications', 'Notifications', Bell],
  ['branding', 'Branding', Image], ['data-reset', 'Data reset', ShieldAlert],
] as const;

const validUrl = (value: string) => {
  if (!value.trim()) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};

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

  useEffect(() => applyFavicon(branding, defaultLogo), [branding]);

  const saveCompany = (event: FormEvent) => {
    event.preventDefault();
    const next = Object.fromEntries(Object.entries(company).map(([key, value]) => [key, value.trim()])) as unknown as CompanySettings;
    if (!next.companyName) return toast.error('Company name is required.');
    if (next.email && !EMAIL.test(next.email)) return toast.error('Enter a valid company email address.');
    if (!validUrl(next.website)) return toast.error('Website must begin with http:// or https://.');
    try {
      saveCompanySettings(next);
      setCompany(next);
      if (user) {
        const updatedUser: User = { ...user, organization_name: next.companyName, updated_at: new Date().toISOString() };
        localStorage.setItem('cybershield_user', JSON.stringify(updatedUser));
        queryClient.setQueryData(['user'], updatedUser);
      }
      toast.success('Company profile saved.');
    } catch { toast.error('Browser storage is unavailable. Company profile was not saved.'); }
  };

  const saveTiny = (event: FormEvent) => {
    event.preventDefault();
    try { saveTinyUrlSettings(tinyUrl); toast.success('TinyURL settings saved locally.'); }
    catch { toast.error('Browser storage is unavailable. TinyURL settings were not saved.'); }
  };

  const saveEmail = (event: FormEvent) => {
    event.preventDefault();
    if (email.zeptoFromAddress && !EMAIL.test(email.zeptoFromAddress)) return toast.error('Enter a valid ZeptoMail from address.');
    if (email.smtpPort < 1 || email.smtpPort > 65535) return toast.error('SMTP port must be between 1 and 65535.');
    if (email.smtpFromAddress && !EMAIL.test(email.smtpFromAddress)) return toast.error('Enter a valid SMTP from address.');
    try { saveEmailSettings(email); toast.success('Email settings saved locally.'); }
    catch { toast.error('Browser storage is unavailable. Email settings were not saved.'); }
  };

  const saveNotifications = (event: FormEvent) => {
    event.preventDefault();
    try { saveNotificationSettings(notifications); toast.success('Notification settings saved locally.'); }
    catch { toast.error('Browser storage is unavailable. Notification settings were not saved.'); }
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
    if (!validUrl(branding.logoUrl) || !validUrl(branding.faviconUrl)) return toast.error('External image URLs must begin with http:// or https://.');
    try { saveBrandingSettings(branding); applyFavicon(branding, defaultLogo); toast.success('Branding saved and applied.'); }
    catch { toast.error('Branding could not be saved. Try smaller image files or clear browser storage.'); }
  };

  const upload = (kind: 'logo' | 'favicon') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const accepted = kind === 'logo'
      ? ['image/png', 'image/jpeg', 'image/webp']
      : ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'];
    if (!accepted.includes(file.type)) return toast.error(kind === 'logo' ? 'Logo must be PNG, JPG, or WebP.' : 'Favicon must be PNG, ICO, or SVG.');
    if (file.size > MAX_BRAND_ASSET_SIZE) return toast.error('Image must be 350 KB or smaller for browser storage.');
    const reader = new FileReader();
    reader.onload = () => setBranding(current => ({ ...current, [kind === 'logo' ? 'logoDataUrl' : 'faviconDataUrl']: String(reader.result) }));
    reader.onerror = () => toast.error('The selected image could not be read.');
    reader.readAsDataURL(file);
  };

  const restoreBranding = () => {
    try { const next = resetBrandingSettings(); setBranding(next); applyFavicon(next, defaultLogo); toast.success('Default branding restored.'); }
    catch { toast.error('Default branding could not be restored.'); }
  };

  const confirmReset = () => {
    if (resetText !== 'RESET LOGS') return;
    const removed = resetScanHistory();
    setResetOpen(false); setResetText('');
    toast.success(removed ? `Logs data reset. ${removed} stored log ${removed === 1 ? 'set' : 'sets'} removed.` : 'Logs data reset. No saved scan history was found.');
  };

  return (
    <div className="mx-auto max-w-[1500px] text-slate-200">
      <header className="mb-6 border-b border-slate-800 pb-6">
        <div className="flex items-start gap-4">
          <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-300"><ServerCog className="h-5 w-5" /></span>
          <div>
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-400">Administration / configuration ledger</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Settings</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Manage organization identity, delivery providers, notification channels, and visual branding.</p>
          </div>
        </div>
        <div className="mt-5 flex items-start gap-3 border-l-2 border-amber-400 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p><strong className="font-semibold">Browser-local configuration.</strong> Connection tests are sent through the CyberShield backend. Move saved secrets to encrypted server-side storage before production use.</p>
        </div>
      </header>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[230px_minmax(0,1fr)_240px]">
        <nav aria-label="Settings sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 xl:sticky xl:top-24 xl:mx-0 xl:block xl:h-fit xl:space-y-1 xl:overflow-visible xl:p-0">
          {sections.map(([id, label, Icon], index) => <a key={id} href={`#${id}`} className="group flex shrink-0 items-center gap-2.5 border-l-2 border-transparent px-3 py-2.5 text-sm text-slate-400 transition hover:border-cyan-400/60 hover:bg-slate-800/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 xl:w-full"><Icon className="h-4 w-4 text-slate-500 group-hover:text-cyan-400" /><span>{String(index + 1).padStart(2, '0')} · {label}</span><ChevronRight className="ml-auto hidden h-3.5 w-3.5 xl:block" /></a>)}
        </nav>

        <main className="min-w-0 space-y-6">
          <SettingsSection id="company" eyebrow="Organization identity" title="Company profile" description="The legal and operational details shown across your workspace." icon={<Building2 className="h-5 w-5" />}>
            <form onSubmit={saveCompany} className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name" required value={company.companyName} onChange={value => setCompany({ ...company, companyName: value })} />
              <Field label="Email" type="email" value={company.email} onChange={value => setCompany({ ...company, email: value })} />
              <Field label="Phone" type="tel" value={company.phone} onChange={value => setCompany({ ...company, phone: value })} />
              <Field label="Website" type="url" placeholder="https://example.com" value={company.website} onChange={value => setCompany({ ...company, website: value })} />
              <Field label="Address" value={company.address} onChange={value => setCompany({ ...company, address: value })} className="sm:col-span-2" />
              <Field label="City" value={company.city} onChange={value => setCompany({ ...company, city: value })} />
              <Field label="State / Province" value={company.state} onChange={value => setCompany({ ...company, state: value })} />
              <Field label="Postal code" value={company.postalCode} onChange={value => setCompany({ ...company, postalCode: value })} />
              <Field label="Country" value={company.country} onChange={value => setCompany({ ...company, country: value })} />
              <Field label="PAN / VAT number" value={company.panVatNumber} onChange={value => setCompany({ ...company, panVatNumber: value })} />
              <Field label="Registration number" value={company.registrationNumber} onChange={value => setCompany({ ...company, registrationNumber: value })} />
              <Actions><PrimaryButton label="Save company profile" /></Actions>
            </form>
          </SettingsSection>

          <SettingsSection id="tinyurl" eyebrow="Link infrastructure" title="TinyURL link shortening" description="Set the default behavior for links generated by the platform." icon={<Link2 className="h-5 w-5" />}>
            <form onSubmit={saveTiny} className="space-y-5">
              <Toggle label="Enable TinyURL shortening" description="Allow CyberShield to prepare shortened links through TinyURL." checked={tinyUrl.enabled} onChange={enabled => { setTinyUrl({ ...tinyUrl, enabled }); setTinyStatus(''); }} />
              <div className={!tinyUrl.enabled ? 'opacity-55' : ''} aria-disabled={!tinyUrl.enabled}>
                <SecretField label="TinyURL API key" value={tinyUrl.apiKey} onChange={apiKey => setTinyUrl({ ...tinyUrl, apiKey })} disabled={!tinyUrl.enabled} autoComplete="off" />
              </div>
              <fieldset disabled={!tinyUrl.enabled} className={!tinyUrl.enabled ? 'opacity-55' : ''}>
                <legend className="mb-2 text-sm font-medium text-slate-300">Default link visibility</legend>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-700/70 bg-slate-950/60 p-1">
                  {(['public', 'private'] as const).map(option => <label key={option} className={`cursor-pointer rounded-md px-3 py-2 text-center text-sm font-medium capitalize transition ${tinyUrl.visibility === option ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40' : 'text-slate-400 hover:text-slate-200'}`}><input type="radio" className="sr-only" name="visibility" value={option} checked={tinyUrl.visibility === option} onChange={() => setTinyUrl({ ...tinyUrl, visibility: option })} />{option}</label>)}
                </div>
              </fieldset>
              <ConnectionStatus message={tinyStatus} />
              <Actions><SecondaryButton type="button" onClick={() => void testTinyUrl()} label={testingTinyUrl ? 'Testing…' : 'Test connection'} disabled={testingTinyUrl || !tinyUrl.enabled} icon={<TestTube2 className={`h-4 w-4 ${testingTinyUrl ? 'animate-pulse' : ''}`} />} /><PrimaryButton label="Save TinyURL settings" /></Actions>
            </form>
          </SettingsSection>

          <SettingsSection id="email" eyebrow="Outbound delivery" title="Email delivery" description="Configure ZeptoMail with a controlled SMTP fallback path." icon={<Mail className="h-5 w-5" />}>
            <form onSubmit={saveEmail} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <SecretField label="ZeptoMail API key" value={email.zeptoApiKey} onChange={zeptoApiKey => setEmail({ ...email, zeptoApiKey })} autoComplete="off" />
                <Field label="ZeptoMail from address" type="email" value={email.zeptoFromAddress} onChange={zeptoFromAddress => setEmail({ ...email, zeptoFromAddress })} />
                <Field label="From name" value={email.zeptoFromName} onChange={zeptoFromName => setEmail({ ...email, zeptoFromName })} />
              </div>
              <fieldset className="border-t border-slate-800 pt-5">
                <legend className="sr-only">SMTP fallback</legend>
                <Toggle label="SMTP fallback" description="Use SMTP only if primary ZeptoMail delivery is unavailable." checked={email.smtpEnabled} onChange={smtpEnabled => setEmail({ ...email, smtpEnabled })} />
                <div className={`mt-5 grid gap-4 sm:grid-cols-2 ${!email.smtpEnabled ? 'opacity-55' : ''}`} aria-disabled={!email.smtpEnabled}>
                  <Field label="SMTP host" disabled={!email.smtpEnabled} value={email.smtpHost} onChange={smtpHost => setEmail({ ...email, smtpHost })} />
                  <Field label="Port" type="number" min={1} max={65535} disabled={!email.smtpEnabled} value={String(email.smtpPort)} onChange={smtpPort => setEmail({ ...email, smtpPort: Number(smtpPort) })} />
                  <Field label="Username" autoComplete="off" disabled={!email.smtpEnabled} value={email.smtpUsername} onChange={smtpUsername => setEmail({ ...email, smtpUsername })} />
                  <SecretField label="Password" disabled={!email.smtpEnabled} value={email.smtpPassword} onChange={smtpPassword => setEmail({ ...email, smtpPassword })} autoComplete="new-password" />
                  <SelectField label="Encryption" disabled={!email.smtpEnabled} value={email.smtpEncryption} onChange={smtpEncryption => setEmail({ ...email, smtpEncryption: smtpEncryption as EmailSettings['smtpEncryption'] })} options={[['none', 'None'], ['tls', 'TLS'], ['ssl', 'SSL']]} />
                  <Field label="From name" disabled={!email.smtpEnabled} value={email.smtpFromName} onChange={smtpFromName => setEmail({ ...email, smtpFromName })} />
                  <Field label="From address" type="email" disabled={!email.smtpEnabled} value={email.smtpFromAddress} onChange={smtpFromAddress => setEmail({ ...email, smtpFromAddress })} />
                </div>
              </fieldset>
              <SecurityNote />
              <Actions><PrimaryButton label="Save email settings" /></Actions>
            </form>
          </SettingsSection>

          <SettingsSection id="notifications" eyebrow="Signal routing" title="Notifications" description="Choose how operators receive security and workflow events." icon={<Bell className="h-5 w-5" />}>
            <form onSubmit={saveNotifications} className="space-y-6">
              <fieldset>
                <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Notification channels</legend>
                <div className="divide-y divide-slate-800 border-y border-slate-800">
                  <Toggle label="Database" description="In-app notification bell" checked={notifications.database} onChange={database => setNotifications({ ...notifications, database })} compact />
                  <Toggle label="Email" description="Send via ZeptoMail" checked={notifications.email} onChange={emailChannel => setNotifications({ ...notifications, email: emailChannel })} compact />
                  <Toggle label="Real-time" description="Instant browser notification via Pusher" checked={notifications.realtime} onChange={realtime => setNotifications({ ...notifications, realtime, pusherEnabled: realtime ? notifications.pusherEnabled : false })} compact />
                </div>
              </fieldset>
              <div className="border-l-2 border-violet-400/60 bg-violet-400/[0.04] p-4">
                <Toggle label="Enable Pusher real-time notifications" description={notifications.realtime ? 'Connect the real-time notification channel to Pusher.' : 'Turn on the Real-time channel above before enabling Pusher.'} checked={notifications.pusherEnabled} disabled={!notifications.realtime} onChange={pusherEnabled => setNotifications({ ...notifications, pusherEnabled, realtime: pusherEnabled || notifications.realtime })} />
                <div className={`mt-5 grid gap-4 sm:grid-cols-2 ${!notifications.pusherEnabled ? 'opacity-55' : ''}`}>
                  <Field label="App ID" disabled={!notifications.pusherEnabled} value={notifications.pusherAppId} onChange={pusherAppId => setNotifications({ ...notifications, pusherAppId })} />
                  <Field label="Cluster" disabled={!notifications.pusherEnabled} value={notifications.pusherCluster} onChange={pusherCluster => setNotifications({ ...notifications, pusherCluster })} />
                  <SecretField label="App key" disabled={!notifications.pusherEnabled} value={notifications.pusherAppKey} onChange={pusherAppKey => setNotifications({ ...notifications, pusherAppKey })} autoComplete="off" />
                  <SecretField label="App secret" disabled={!notifications.pusherEnabled} value={notifications.pusherAppSecret} onChange={pusherAppSecret => setNotifications({ ...notifications, pusherAppSecret })} autoComplete="new-password" />
                </div>
              </div>
              <ConnectionStatus message={pusherStatus} />
              <Actions><SecondaryButton type="button" onClick={() => void testPusher()} label={testingPusher ? 'Testing…' : 'Test connection'} disabled={testingPusher || !notifications.pusherEnabled} icon={<TestTube2 className={`h-4 w-4 ${testingPusher ? 'animate-pulse' : ''}`} />} /><PrimaryButton label="Save notification settings" /></Actions>
            </form>
          </SettingsSection>

          <SettingsSection id="branding" eyebrow="Workspace identity" title="Branding" description="Apply a recognizable organization mark across the application shell." icon={<Image className="h-5 w-5" />}>
            <form onSubmit={saveBranding} className="space-y-6">
              <BrandAsset title="Logo" description="PNG, JPG, or WebP · maximum 350 KB" preview={getEffectiveLogo(branding, defaultLogo)} hasUpload={Boolean(branding.logoDataUrl)} url={branding.logoUrl} onUrl={logoUrl => setBranding({ ...branding, logoUrl })} onUpload={upload('logo')} accept="image/png,image/jpeg,image/webp" onClear={() => setBranding({ ...branding, logoDataUrl: '' })} />
              <BrandAsset title="Favicon" description="PNG, ICO, or SVG · maximum 350 KB" preview={getEffectiveFavicon(branding, defaultLogo)} hasUpload={Boolean(branding.faviconDataUrl)} url={branding.faviconUrl} onUrl={faviconUrl => setBranding({ ...branding, faviconUrl })} onUpload={upload('favicon')} accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml" onClear={() => setBranding({ ...branding, faviconDataUrl: '' })} />
              <p className="text-xs text-slate-500">Uploaded files take precedence over external URLs. Clear the upload to use its URL.</p>
              <Actions><SecondaryButton type="button" onClick={restoreBranding} label="Restore defaults" icon={<RefreshCcw className="h-4 w-4" />} /><PrimaryButton label="Save branding" /></Actions>
            </form>
          </SettingsSection>

          <section id="data-reset" tabIndex={-1} className="scroll-mt-24 overflow-hidden border border-rose-500/30 bg-[#111827] focus:outline-none focus:ring-2 focus:ring-rose-400/50">
            <div className="border-l-4 border-rose-500 p-5 sm:p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-rose-400">Danger zone</p>
              <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div><h2 className="text-lg font-semibold text-white">Reset all logs data</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Deletes only browser scan history stored under email spam, malware, and phishing log keys. Authentication, settings, incidents, users, roles, theme, and language remain untouched.</p></div>
                <button type="button" onClick={() => setResetOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-rose-500/50 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-400"><Trash2 className="h-4 w-4" /> Reset logs data</button>
              </div>
            </div>
          </section>
        </main>

        <aside className="hidden xl:block">
          <div className="sticky top-24 border border-slate-800 bg-[#101827] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Configuration status</p>
            <div className="mt-4 space-y-4">
              <Status label="Company" state={company.companyName ? 'configured' : 'needs setup'} active={Boolean(company.companyName)} />
              <Status label="TinyURL" state={tinyUrl.enabled ? (tinyUrl.apiKey ? 'local config' : 'needs key') : 'disabled'} active={tinyUrl.enabled && Boolean(tinyUrl.apiKey)} />
              <Status label="Email" state={email.zeptoApiKey ? 'local config' : 'needs setup'} active={Boolean(email.zeptoApiKey)} />
              <Status label="Pusher" state={notifications.pusherEnabled ? 'awaiting backend' : 'disabled'} active={false} />
              <Status label="Branding" state={branding.logoDataUrl || branding.logoUrl ? 'custom' : 'default'} active={Boolean(branding.logoDataUrl || branding.logoUrl)} />
            </div>
            <p className="mt-5 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-500">“Local config” means values exist in this browser. It does not confirm a provider connection.</p>
          </div>
        </aside>
      </div>

      {resetOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && setResetOpen(false)}><div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="w-full max-w-md border border-rose-500/30 bg-[#111827] p-6 shadow-2xl shadow-black/50"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-400">Destructive action</p><h2 id="reset-title" className="mt-1 text-xl font-semibold text-white">Confirm logs reset</h2></div><button type="button" onClick={() => setResetOpen(false)} aria-label="Close reset dialog" className="p-1 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div><p className="mt-4 text-sm leading-6 text-slate-400">Type <strong className="font-mono text-slate-200">RESET LOGS</strong> to delete only the three browser scan-history stores.</p><Field label="Confirmation" value={resetText} onChange={setResetText} autoFocus /><div className="mt-5 flex justify-end gap-2"><SecondaryButton type="button" onClick={() => setResetOpen(false)} label="Cancel" /><button type="button" disabled={resetText !== 'RESET LOGS'} onClick={confirmReset} className="rounded-md bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40">Reset logs data</button></div></div></div>}
    </div>
  );
}

function SettingsSection({ id, eyebrow, title, description, icon, children }: { id: string; eyebrow: string; title: string; description: string; icon: ReactNode; children: ReactNode }) {
  return <section id={id} tabIndex={-1} className="scroll-mt-24 border border-slate-800 bg-[#111827] focus:outline-none focus:ring-2 focus:ring-cyan-400/50"><header className="flex items-start gap-3 border-b border-slate-800 px-5 py-4 sm:px-6"><span className="mt-0.5 text-cyan-400">{icon}</span><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-500">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div></header><div className="p-5 sm:p-6">{children}</div></section>;
}

interface FieldProps { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; disabled?: boolean; required?: boolean; className?: string; autoComplete?: string; min?: number; max?: number; autoFocus?: boolean }
function Field({ label, value, onChange, type = 'text', className = '', ...props }: FieldProps) {
  return <label className={`block space-y-2 ${className}`}><span className="text-sm font-medium text-slate-300">{label}{props.required && <span aria-hidden="true" className="ml-1 text-cyan-400">*</span>}</span><input {...props} aria-label={label} type={type} value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-500" /></label>;
}

function SecretField(props: Omit<FieldProps, 'type'>) {
  const [shown, setShown] = useState(false);
  return <div className="relative"><Field {...props} type={shown ? 'text' : 'password'} /><button type="button" disabled={props.disabled} onClick={() => setShown(!shown)} aria-label={`${shown ? 'Hide' : 'Show'} ${props.label}`} className="absolute bottom-2 right-2 rounded p-1.5 text-slate-500 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:hidden">{shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>;
}

function SelectField({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][]; disabled?: boolean }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-slate-300">{label}</span><select value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15 disabled:cursor-not-allowed disabled:text-slate-500">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function Toggle({ label, description, checked, onChange, disabled = false, compact = false }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; compact?: boolean }) {
  return <label className={`flex items-center justify-between gap-4 ${compact ? 'py-3.5' : ''} ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}><span><span className="block text-sm font-medium text-slate-200">{label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} className="peer sr-only" /><span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full border border-slate-600 bg-slate-800 transition peer-checked:border-cyan-400/60 peer-checked:bg-cyan-400/25 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-400 after:absolute after:left-[3px] after:top-[3px] after:h-4 after:w-4 after:rounded-full after:bg-slate-400 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:bg-cyan-300" /></label>;
}

function Actions({ children }: { children: ReactNode }) { return <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-5 sm:col-span-2">{children}</div>; }
function PrimaryButton({ label }: { label: string }) { return <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300"><Save className="h-4 w-4" />{label}</button>; }
function SecondaryButton({ label, icon, disabled = false, ...props }: { label: string; icon?: ReactNode; type: 'button'; onClick: () => void; disabled?: boolean }) { return <button {...props} disabled={disabled} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">{icon}{label}</button>; }
function ConnectionStatus({ message }: { message: string }) { return <div aria-live="polite">{message && <p className="border-l-2 border-amber-400 bg-amber-400/[0.05] px-3 py-2 text-xs leading-5 text-amber-100">{message}</p>}</div>; }
function SecurityNote() { return <p className="flex items-start gap-2 text-xs leading-5 text-amber-100"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" /> Credentials remain in this browser for demonstration only. Move them to encrypted server storage before production use.</p>; }
function Status({ label, state, active }: { label: string; state: string; active: boolean }) { return <div className="flex items-center gap-3"><span className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.45)]' : 'bg-slate-600'}`} /><div className="min-w-0"><p className="text-xs font-medium text-slate-300">{label}</p><p className="truncate text-[11px] capitalize text-slate-500">{state}</p></div></div>; }

function BrandAsset({ title, description, preview, hasUpload, url, onUrl, onUpload, onClear, accept }: { title: string; description: string; preview: string; hasUpload: boolean; url: string; onUrl: (value: string) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onClear: () => void; accept: string }) {
  return <fieldset className="grid gap-5 border-b border-slate-800 pb-6 sm:grid-cols-[150px_minmax(0,1fr)]"><legend className="sr-only">{title}</legend><div className="flex h-28 items-center justify-center border border-dashed border-slate-700 bg-slate-950/60 p-4"><img src={preview} alt={`${title} preview`} className="max-h-full max-w-full object-contain" /></div><div className="min-w-0 space-y-4"><div><h3 className="text-sm font-semibold text-white">{title}</h3><p className="mt-1 text-xs text-slate-500">{description}</p></div><div className="flex flex-wrap items-center gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200"><Upload className="h-4 w-4" /> Choose {title.toLowerCase()}<input type="file" accept={accept} onChange={onUpload} className="sr-only" /></label>{hasUpload && <button type="button" onClick={onClear} className="text-xs text-slate-400 underline-offset-4 hover:text-white hover:underline">Clear uploaded file</button>}</div><Field label={`External ${title.toLowerCase()} URL`} type="url" placeholder="https://example.com/asset.png" value={url} onChange={onUrl} /></div></fieldset>;
}
