import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { testPusherConnection, testTinyUrlConnection } from './integration.service';

vi.mock('./api', () => ({
  default: { post: vi.fn() },
}));

const post = vi.mocked(api.post);

describe('integration service', () => {
  beforeEach(() => post.mockReset());

  it('sends the TinyURL key to the backend connection endpoint', async () => {
    post.mockResolvedValue({
      data: { ok: true, provider: 'tinyurl', message: 'TinyURL connection verified successfully.' },
    });

    await testTinyUrlConnection({ enabled: true, apiKey: 'tiny-secret', visibility: 'private' });

    expect(post).toHaveBeenCalledWith('/v1/integrations/tinyurl/test', { api_key: 'tiny-secret' });
  });

  it('sends all Pusher credentials to the backend connection endpoint', async () => {
    post.mockResolvedValue({
      data: { ok: true, provider: 'pusher', message: 'Pusher connection verified successfully.' },
    });

    await testPusherConnection({
      database: true,
      email: false,
      realtime: true,
      pusherEnabled: true,
      pusherAppId: '123',
      pusherCluster: 'eu',
      pusherAppKey: 'public-key',
      pusherAppSecret: 'private-secret',
    });

    expect(post).toHaveBeenCalledWith('/v1/integrations/pusher/test', {
      app_id: '123',
      cluster: 'eu',
      app_key: 'public-key',
      app_secret: 'private-secret',
    });
  });
});
