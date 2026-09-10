import { describe, expect, it } from 'vitest';
import { getAuthenticatedHomePath, mergeCachedUser, type User } from './auth.service';

const freshUser: User = {
  id: '7',
  name: 'Backend Name',
  email: 'person@example.com',
  email_verified_at: '2026-01-01T00:00:00.000Z',
  role: 'viewer',
  organization_id: 'backend-org',
  organization_name: 'Backend Organization',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('getAuthenticatedHomePath', () => {
  it.each(['admin', 'administrator', 'Administrator'])('routes %s users to administration', role => {
    expect(getAuthenticatedHomePath({ role })).toBe('/admin');
  });

  it.each(['security_analyst', 'viewer', ''])('routes %s users to the dashboard', role => {
    expect(getAuthenticatedHomePath({ role })).toBe('/dashboard');
  });
});

describe('mergeCachedUser', () => {
  it('rehydrates editable profile fields, including the avatar, for the same user id', () => {
    const cachedUser = {
      ...freshUser,
      name: 'Local Name',
      email: 'new-address@example.com',
      organization_name: 'Local Organization',
      avatar: 'data:image/png;base64,avatar',
      role: 'administrator',
      organization_id: 'tampered-org',
    };

    expect(mergeCachedUser(freshUser, JSON.stringify(cachedUser))).toEqual({
      ...freshUser,
      name: 'Local Name',
      email: 'new-address@example.com',
      organization_name: 'Local Organization',
      avatar: 'data:image/png;base64,avatar',
    });
  });

  it('accepts an email identity match when a cached id is unavailable', () => {
    const cachedUser = {
      email: ' PERSON@example.com ',
      name: 'Email Match',
      organization_name: 'Local Organization',
      avatar: 'data:image/webp;base64,avatar',
    };

    expect(mergeCachedUser(freshUser, JSON.stringify(cachedUser)).avatar).toBe(
      'data:image/webp;base64,avatar',
    );
  });

  it.each([
    null,
    '{not-json',
    '[]',
    JSON.stringify({ id: 'other-user', email: 'other@example.com', avatar: 'wrong' }),
  ])('ignores malformed or mismatched cached profile data: %s', cachedUser => {
    expect(mergeCachedUser(freshUser, cachedUser)).toEqual(freshUser);
  });
});
