import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSettings, resetScanHistory, saveCompanySettings, saveTinyUrlSettings,
  SCAN_HISTORY_UPDATED_EVENT, SETTINGS_STORAGE_KEY, subscribeToSettings,
} from './settings.service';

describe('settings service', () => {
  beforeEach(() => localStorage.clear());

  it('uses the authenticated organization for the initial company default', () => {
    expect(getSettings('Northstar Security').company.companyName).toBe('Northstar Security');
    expect(getSettings('Northstar Security').tinyUrl.visibility).toBe('public');
  });

  it('saves sections without overwriting other settings and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSettings(listener);
    saveTinyUrlSettings({ enabled: true, apiKey: 'secret-value', visibility: 'private' });
    saveCompanySettings({
      ...getSettings().company,
      companyName: 'Meridian SOC',
      email: 'ops@meridian.example',
    });

    expect(getSettings().tinyUrl).toEqual({ enabled: true, apiKey: 'secret-value', visibility: 'private' });
    expect(getSettings().company.companyName).toBe('Meridian SOC');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('recovers safe defaults from corrupt or unsupported storage', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{broken');
    expect(getSettings('Recovered Org').company.companyName).toBe('Recovered Org');
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(getSettings().notifications.database).toBe(true);
  });

  it('resets only scan-history keys and dispatches the update event', () => {
    const listener = vi.fn();
    window.addEventListener(SCAN_HISTORY_UPDATED_EVENT, listener);
    localStorage.setItem('email_spam_scan_logs', '[]');
    localStorage.setItem('malware_scan_logs', '[]');
    localStorage.setItem('cybershield_user', '{"id":"safe"}');
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{"version":1}');

    expect(resetScanHistory()).toBe(2);
    expect(localStorage.getItem('email_spam_scan_logs')).toBeNull();
    expect(localStorage.getItem('malware_scan_logs')).toBeNull();
    expect(localStorage.getItem('cybershield_user')).toBe('{"id":"safe"}');
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe('{"version":1}');
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(SCAN_HISTORY_UPDATED_EVENT, listener);
  });
});
