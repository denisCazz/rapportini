/** Percorsi UI/API che richiedono ruolo admin (org admin o super-admin). */
export function requiresAdminAccess(pathname: string): boolean {
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    return true;
  }
  // Solo lista/creazione utenti: GET/PATCH/DELETE su /api/users/:id sono
  // gestiti nell'handler (profilo personale o admin su altri utenti).
  return pathname === '/api/users' || pathname === '/api/users/';
}
