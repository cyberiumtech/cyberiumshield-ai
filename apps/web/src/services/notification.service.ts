import type { Notification } from '../components/Navbar/types';
import api from './api';

export interface SecurityEventRecord {
  id: number | string;
  event_type: string;
  source: string;
  severity: string;
  title: string;
  payload?: Record<string, unknown> | null;
  occurred_at: string;
}

const routeForEvent = (event: SecurityEventRecord) => {
  const category = `${event.source} ${event.event_type}`.toLowerCase();
  if (category.includes('incident')) return '/incidents';
  if (category.includes('malware') || category.includes('quarantine')) return '/malware';
  if (category.includes('phishing')) return '/phishing';
  if (category.includes('email') || category.includes('spam')) return '/email-spam';
  if (category.includes('network')) return '/network';
  if (category.includes('vulnerab')) return '/vulnerability';
  if (category.includes('threat') || category.includes('intel')) return '/threat-intelligence';
  return '/security-center';
};

const typeForEvent = (event: SecurityEventRecord): Notification['type'] => {
  const severity = event.severity.toLowerCase();
  const category = `${event.source} ${event.event_type}`.toLowerCase();
  if (severity === 'critical') return 'critical';
  if (category.includes('incident')) return 'incident';
  if (
    severity === 'high' ||
    category.includes('threat') ||
    category.includes('malware') ||
    category.includes('phishing') ||
    category.includes('quarantine')
  ) {
    return 'threat';
  }
  return 'system';
};

const payloadText = (payload: Record<string, unknown> | null | undefined, key: string) => {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const messageForEvent = (event: SecurityEventRecord) => {
  const explicitMessage =
    payloadText(event.payload, 'message') ??
    payloadText(event.payload, 'description') ??
    payloadText(event.payload, 'detail');
  if (explicitMessage) return explicitMessage;

  const action = payloadText(event.payload, 'action');
  const subject =
    payloadText(event.payload, 'file_name') ??
    payloadText(event.payload, 'filename') ??
    payloadText(event.payload, 'resource') ??
    payloadText(event.payload, 'indicator');
  if (action && subject) return `${action}: ${subject}`;
  if (subject) return subject;
  if (action) return action;

  return `Reported by ${event.source}`;
};

const parseTimestamp = (value: string) => {
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const timestamp = new Date(normalized);
  return Number.isNaN(timestamp.getTime()) ? new Date(0) : timestamp;
};

export function mapSecurityEventToNotification(event: SecurityEventRecord): Notification {
  return {
    id: `security-event:${event.id}`,
    type: typeForEvent(event),
    title: event.title,
    message: messageForEvent(event),
    timestamp: parseTimestamp(event.occurred_at),
    read: false,
    link: routeForEvent(event),
  };
}

export async function getSystemNotifications(limit = 30): Promise<Notification[]> {
  const response = await api.get<SecurityEventRecord[]>('/v1/storage/security-events', {
    params: { limit },
  });
  return response.data.map(mapSecurityEventToNotification);
}
