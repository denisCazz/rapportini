export type UserRole = 'admin' | 'admin_cat' | 'operatore';

const ADMIN_ROLES = new Set<UserRole>(['admin', 'admin_cat']);

export function normalizeUserRole(ruolo: string | null | undefined): UserRole {
  if (ruolo === 'admin') return 'admin';
  if (ruolo === 'admin_cat') return 'admin_cat';
  return 'operatore';
}

export function isOrgAdminRole(ruolo: string | null | undefined): boolean {
  return ADMIN_ROLES.has(normalizeUserRole(ruolo));
}

export function isPlatformAdmin(ruolo: string | null | undefined): boolean {
  return normalizeUserRole(ruolo) === 'admin';
}

export function isCatAdmin(ruolo: string | null | undefined): boolean {
  return normalizeUserRole(ruolo) === 'admin_cat';
}

/** Operatore sul campo e admin CAT possono compilare nuovi rapportini. */
export function canCreateRapportini(ruolo: string | null | undefined): boolean {
  const normalized = normalizeUserRole(ruolo);
  return normalized === 'operatore' || normalized === 'admin_cat';
}
