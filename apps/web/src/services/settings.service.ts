export const SETTINGS_STORAGE_KEY = 'cybershield.settings.v1';
export const SETTINGS_EVENT = 'cyber:settings-updated';
export const SCAN_HISTORY_UPDATED_EVENT = 'cyber:scan-history-updated';
export const SCAN_LOG_KEYS = [
  'email_spam_scan_logs',
  'malware_scan_logs',
  'phishing_scan_logs',
] as const;

export interface CompanySettings {
  companyName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  panVatNumber: string;
  registrationNumber: string;
}

export interface TinyUrlSettings {
  enabled: boolean;
  apiKey: string;
  visibility: 'public' | 'private';
}

export interface EmailSettings {
  zeptoApiKey: string;
  zeptoFromAddress: string;
  zeptoFromName: string;
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpEncryption: 'none' | 'tls' | 'ssl';
  smtpFromName: string;
  smtpFromAddress: string;
}

export interface NotificationSettings {
  database: boolean;
  email: boolean;
  realtime: boolean;
  pusherEnabled: boolean;
  pusherAppId: string;
  pusherCluster: string;
  pusherAppKey: string;
  pusherAppSecret: string;
}

export interface BrandingSettings {
  logoDataUrl: string;
  logoUrl: string;
  faviconDataUrl: string;
  faviconUrl: string;
}

export interface AppSettings {
  version: 1;
  company: CompanySettings;
  tinyUrl: TinyUrlSettings;
  email: EmailSettings;
  notifications: NotificationSettings;
  branding: BrandingSettings;
}

const defaults: AppSettings = {
  version: 1,
  company: {
    companyName: '', email: '', phone: '', website: '', address: '', city: '', state: '',
    postalCode: '', country: '', panVatNumber: '', registrationNumber: '',
  },
  tinyUrl: { enabled: false, apiKey: '', visibility: 'public' },
  email: {
    zeptoApiKey: '', zeptoFromAddress: '', zeptoFromName: '', smtpEnabled: false,
    smtpHost: '', smtpPort: 587, smtpUsername: '', smtpPassword: '', smtpEncryption: 'tls',
    smtpFromName: '', smtpFromAddress: '',
  },
  notifications: {
    database: true, email: false, realtime: false, pusherEnabled: false,
    pusherAppId: '', pusherCluster: '', pusherAppKey: '', pusherAppSecret: '',
  },
  branding: { logoDataUrl: '', logoUrl: '', faviconDataUrl: '', faviconUrl: '' },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown) => typeof value === 'string' ? value : '';
const bool = (value: unknown, fallback = false) => typeof value === 'boolean' ? value : fallback;

function normalize(raw: unknown, organizationName = ''): AppSettings {
  if (!isRecord(raw) || raw.version !== 1) return {
    ...structuredClone(defaults),
    company: { ...defaults.company, companyName: organizationName },
  };
  const company = isRecord(raw.company) ? raw.company : {};
  const tinyUrl = isRecord(raw.tinyUrl) ? raw.tinyUrl : {};
  const email = isRecord(raw.email) ? raw.email : {};
  const notifications = isRecord(raw.notifications) ? raw.notifications : {};
  const branding = isRecord(raw.branding) ? raw.branding : {};
  const port = Number(email.smtpPort);
  return {
    version: 1,
    company: {
      companyName: text(company.companyName) || organizationName,
      email: text(company.email), phone: text(company.phone), website: text(company.website),
      address: text(company.address), city: text(company.city), state: text(company.state),
      postalCode: text(company.postalCode), country: text(company.country),
      panVatNumber: text(company.panVatNumber), registrationNumber: text(company.registrationNumber),
    },
    tinyUrl: {
      enabled: bool(tinyUrl.enabled), apiKey: text(tinyUrl.apiKey),
      visibility: tinyUrl.visibility === 'private' ? 'private' : 'public',
    },
    email: {
      zeptoApiKey: text(email.zeptoApiKey), zeptoFromAddress: text(email.zeptoFromAddress),
      zeptoFromName: text(email.zeptoFromName), smtpEnabled: bool(email.smtpEnabled),
      smtpHost: text(email.smtpHost), smtpPort: Number.isInteger(port) ? port : 587,
      smtpUsername: text(email.smtpUsername), smtpPassword: text(email.smtpPassword),
      smtpEncryption: email.smtpEncryption === 'none' || email.smtpEncryption === 'ssl' ? email.smtpEncryption : 'tls',
      smtpFromName: text(email.smtpFromName), smtpFromAddress: text(email.smtpFromAddress),
    },
    notifications: {
      database: bool(notifications.database, true), email: bool(notifications.email),
      realtime: bool(notifications.realtime), pusherEnabled: bool(notifications.pusherEnabled),
      pusherAppId: text(notifications.pusherAppId), pusherCluster: text(notifications.pusherCluster),
      pusherAppKey: text(notifications.pusherAppKey), pusherAppSecret: text(notifications.pusherAppSecret),
    },
    branding: {
      logoDataUrl: text(branding.logoDataUrl), logoUrl: text(branding.logoUrl),
      faviconDataUrl: text(branding.faviconDataUrl), faviconUrl: text(branding.faviconUrl),
    },
  };
}

export function getSettings(organizationName = ''): AppSettings {
  if (typeof window === 'undefined') return normalize(null, organizationName);
  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) return normalize(null, organizationName);
  try {
    return normalize(JSON.parse(raw), organizationName);
  } catch {
    return normalize(null, organizationName);
  }
}

function persist(next: AppSettings): AppSettings {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
  return next;
}

function saveSection<K extends keyof Omit<AppSettings, 'version'>>(key: K, value: AppSettings[K]) {
  return persist({ ...getSettings(), [key]: value })[key];
}

export const saveCompanySettings = (value: CompanySettings) => saveSection('company', value);
export const saveTinyUrlSettings = (value: TinyUrlSettings) => saveSection('tinyUrl', value);
export const saveEmailSettings = (value: EmailSettings) => saveSection('email', value);
export const saveNotificationSettings = (value: NotificationSettings) => saveSection('notifications', value);
export const saveBrandingSettings = (value: BrandingSettings) => saveSection('branding', value);

export function resetBrandingSettings() {
  return saveBrandingSettings({ ...defaults.branding });
}

export function getEffectiveLogo(branding: BrandingSettings, fallback: string) {
  return branding.logoDataUrl || branding.logoUrl || fallback;
}

export function getEffectiveFavicon(branding: BrandingSettings, fallback: string) {
  return branding.faviconDataUrl || branding.faviconUrl || fallback;
}

export function applyFavicon(branding: BrandingSettings, fallback: string) {
  if (typeof document === 'undefined') return;
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.createElement('link');
  favicon.rel = 'icon';
  favicon.href = getEffectiveFavicon(branding, fallback);
  document.head.appendChild(favicon);
}

export function subscribeToSettings(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const storage = (event: StorageEvent) => event.key === SETTINGS_STORAGE_KEY && listener();
  window.addEventListener(SETTINGS_EVENT, listener);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, listener);
    window.removeEventListener('storage', storage);
  };
}

export interface ConnectionCheckResult { ok: boolean; message: string }

export function validateTinyUrlConfiguration(value: TinyUrlSettings): ConnectionCheckResult {
  if (!value.enabled) return { ok: false, message: 'Enable TinyURL shortening before checking its configuration.' };
  if (!value.apiKey.trim()) return { ok: false, message: 'Enter a TinyURL API key before checking the configuration.' };
  return { ok: true, message: 'Configuration is complete. A live TinyURL connection test requires a secure backend endpoint.' };
}

export function validatePusherConfiguration(value: NotificationSettings): ConnectionCheckResult {
  if (!value.pusherEnabled) return { ok: false, message: 'Enable Pusher real-time notifications before checking its configuration.' };
  if (![value.pusherAppId, value.pusherCluster, value.pusherAppKey, value.pusherAppSecret].every(item => item.trim())) {
    return { ok: false, message: 'Complete App ID, cluster, app key, and app secret before checking the configuration.' };
  }
  return { ok: true, message: 'Configuration is complete. A live Pusher connection test requires a secure backend endpoint.' };
}

export function resetScanHistory(): number {
  let removed = 0;
  SCAN_LOG_KEYS.forEach(key => {
    if (window.localStorage.getItem(key) !== null) removed += 1;
    window.localStorage.removeItem(key);
  });
  window.dispatchEvent(new CustomEvent(SCAN_HISTORY_UPDATED_EVENT));
  return removed;
}
