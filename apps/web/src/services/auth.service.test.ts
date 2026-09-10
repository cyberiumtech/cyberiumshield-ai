import { describe, expect, it } from 'vitest';
import { getAuthenticatedHomePath } from './auth.service';

describe('getAuthenticatedHomePath', () => {
  it.each(['admin', 'administrator', 'Administrator'])('routes %s users to administration', role => {
    expect(getAuthenticatedHomePath({ role })).toBe('/admin');
  });

  it.each(['security_analyst', 'viewer', ''])('routes %s users to the dashboard', role => {
    expect(getAuthenticatedHomePath({ role })).toBe('/dashboard');
  });
});
