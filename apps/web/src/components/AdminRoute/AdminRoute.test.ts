import { describe, expect, it } from 'vitest';
import { isAdminRole } from './AdminRoute';

describe('isAdminRole', () => {
  it('normalizes accepted administrator roles', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('Administrator')).toBe(true);
  });

  it('rejects non-admin and absent roles', () => {
    expect(isAdminRole('security_analyst')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});
