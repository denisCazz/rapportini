import { describe, expect, it } from 'vitest';
import { requiresAdminAccess } from '@/lib/middleware-auth';

describe('requiresAdminAccess', () => {
  it('richiede admin per pagine e API admin', () => {
    expect(requiresAdminAccess('/admin')).toBe(true);
    expect(requiresAdminAccess('/admin/users')).toBe(true);
    expect(requiresAdminAccess('/api/admin/modules')).toBe(true);
  });

  it('richiede admin solo per lista/creazione utenti', () => {
    expect(requiresAdminAccess('/api/users')).toBe(true);
    expect(requiresAdminAccess('/api/users/')).toBe(true);
  });

  it('consente profilo personale e cambio password su /api/users/:id', () => {
    const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    expect(requiresAdminAccess(`/api/users/${userId}`)).toBe(false);
    expect(requiresAdminAccess(`/api/users/${userId}/password`)).toBe(false);
  });

  it('non blocca altre API autenticate', () => {
    expect(requiresAdminAccess('/api/rapportini')).toBe(false);
    expect(requiresAdminAccess('/utente')).toBe(false);
  });
});
