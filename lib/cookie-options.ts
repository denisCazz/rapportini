/**
 * Secure flag for auth cookies: production, or explicit HTTPS app URL, or override.
 */
export function getAuthCookieSecure(): boolean {
  if (process.env.FORCE_SECURE_COOKIES === 'true') return true;
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  if (base.startsWith('https://')) return true;
  return process.env.NODE_ENV === 'production';
}

export const authCookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
};

export function authAccessCookieOptions(maxAgeSec: number) {
  return { ...authCookieBase, secure: getAuthCookieSecure(), maxAge: maxAgeSec };
}

export function authRefreshCookieOptions(maxAgeSec: number) {
  return { ...authCookieBase, secure: getAuthCookieSecure(), maxAge: maxAgeSec };
}
