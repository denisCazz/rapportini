import { describe, expect, it } from 'vitest';
import { canAdminAccessUserOrg } from '@/lib/user-scope';

describe('canAdminAccessUserOrg', () => {
  it('allows platform admin to access default and cat org users', () => {
    expect(canAdminAccessUserOrg('admin', 'default', 'default')).toBe(true);
    expect(canAdminAccessUserOrg('admin', 'default', 'cat-12345678901')).toBe(true);
  });

  it('denies platform admin access to unrelated orgs', () => {
    expect(canAdminAccessUserOrg('admin', 'default', 'other-org')).toBe(false);
  });

  it('restricts cat admin to their own org', () => {
    expect(canAdminAccessUserOrg('admin_cat', 'cat-12345678901', 'cat-12345678901')).toBe(true);
    expect(canAdminAccessUserOrg('admin_cat', 'cat-12345678901', 'cat-98765432109')).toBe(false);
    expect(canAdminAccessUserOrg('admin_cat', 'cat-12345678901', 'default')).toBe(false);
  });
});
