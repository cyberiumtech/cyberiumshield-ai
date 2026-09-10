import axios from 'axios';
import api from './api';
import type { NotificationSettings, TinyUrlSettings } from './settings.service';

export interface IntegrationConnectionResult {
  ok: boolean;
  provider: 'tinyurl' | 'pusher';
  message: string;
}

function connectionError(error: unknown, provider: string): Error {
  if (axios.isAxiosError<{ detail?: unknown }>(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return new Error(detail);
    if (!error.response) {
      return new Error(`Unable to reach the integration server. Start the backend before testing ${provider}.`);
    }
  }
  return new Error(`${provider} connection test failed.`);
}

export async function testTinyUrlConnection(
  settings: TinyUrlSettings,
): Promise<IntegrationConnectionResult> {
  try {
    const response = await api.post<IntegrationConnectionResult>('/v1/integrations/tinyurl/test', {
      api_key: settings.apiKey,
    });
    return response.data;
  } catch (error) {
    throw connectionError(error, 'TinyURL');
  }
}

export async function testPusherConnection(
  settings: NotificationSettings,
): Promise<IntegrationConnectionResult> {
  try {
    const response = await api.post<IntegrationConnectionResult>('/v1/integrations/pusher/test', {
      app_id: settings.pusherAppId,
      cluster: settings.pusherCluster,
      app_key: settings.pusherAppKey,
      app_secret: settings.pusherAppSecret,
    });
    return response.data;
  } catch (error) {
    throw connectionError(error, 'Pusher');
  }
}
