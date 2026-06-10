import { describe, expect, it } from 'vitest';
import { canCreateRapportini } from '@/lib/roles';

describe('canCreateRapportini', () => {
  it('allows operatore and admin_cat', () => {
    expect(canCreateRapportini('operatore')).toBe(true);
    expect(canCreateRapportini('admin_cat')).toBe(true);
  });

  it('denies platform admin', () => {
    expect(canCreateRapportini('admin')).toBe(false);
  });
});
