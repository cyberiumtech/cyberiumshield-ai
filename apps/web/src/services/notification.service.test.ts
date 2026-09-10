import { describe, expect, it } from 'vitest';
import { mapSecurityEventToNotification } from './notification.service';

describe('mapSecurityEventToNotification', () => {
  it('maps a real malware event to the malware module', () => {
    const notification = mapSecurityEventToNotification({
      id: 42,
      event_type: 'QUARANTINE',
      source: 'malware-detector',
      severity: 'critical',
      title: 'Threat quarantined',
      payload: { action: 'QUARANTINED', file_name: 'invoice.exe' },
      occurred_at: '2026-09-11T01:02:03',
    });

    expect(notification).toMatchObject({
      id: 'security-event:42',
      type: 'critical',
      title: 'Threat quarantined',
      message: 'QUARANTINED: invoice.exe',
      read: false,
      link: '/malware',
    });
    expect(notification.timestamp.toISOString()).toBe('2026-09-11T01:02:03.000Z');
  });

  it('uses persisted event details instead of placeholder copy', () => {
    const notification = mapSecurityEventToNotification({
      id: 'inc-1',
      event_type: 'incident.created',
      source: 'incident-response',
      severity: 'high',
      title: 'Incident opened',
      payload: { message: 'Endpoint isolation requested for workstation-7.' },
      occurred_at: '2026-09-11T01:02:03Z',
    });

    expect(notification.type).toBe('incident');
    expect(notification.message).toBe('Endpoint isolation requested for workstation-7.');
    expect(notification.link).toBe('/incidents');
  });
});
