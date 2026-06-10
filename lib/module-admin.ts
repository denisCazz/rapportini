/** Unico account autorizzato alla gestione manuale moduli in admin. */
export const MODULES_SUPER_ADMIN_EMAIL = 'deniscazzulo@icloud.com';

export function canManageModulesAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === MODULES_SUPER_ADMIN_EMAIL.toLowerCase();
}
