import bcrypt from 'bcryptjs';

/**
 * Alcuni file .env / Docker Compose salvano `$$` all’inizio dell’hash (escape del `$`);
 * in dotenv Node resta `$$2a$...` e la validazione bcrypt falliva.
 */
export function normalizeSuperUserPasswordHash(raw: string): string {
  const h = raw.trim();
  if (/^\$\$2[abxy]\$\d{1,2}\$/.test(h)) return h.slice(1);
  return h;
}

function resolvedSuperUserPasswordHash(): string {
  return normalizeSuperUserPasswordHash(process.env.SUPER_USER_PASSWORD_HASH || '');
}

/** UUID fisso nel JWT per il super user (nessuna riga obbligatoria in `utenti`). */
export function getSuperUserJwtUserId(): string {
  return (process.env.SUPER_USER_JWT_USER_ID || '00000000-0000-4000-8000-000000000001').trim();
}

export function isSuperUserConfigured(): boolean {
  const u = (process.env.SUPER_USER_USERNAME || '').trim();
  const h = resolvedSuperUserPasswordHash();
  return Boolean(u && h && /^\$2[abxy]\$/.test(h));
}

export async function verifySuperUserCredentials(username: string, password: string): Promise<boolean> {
  if (!isSuperUserConfigured()) return false;
  const envUser = (process.env.SUPER_USER_USERNAME || '').trim();
  if (!envUser) return false;
  if (username.trim().toLowerCase() !== envUser.toLowerCase()) return false;
  const hash = resolvedSuperUserPasswordHash();
  return bcrypt.compare(password, hash);
}

export function resolveSuperUserOrgId(fallbackFromRequest: string): string {
  const fromReq = fallbackFromRequest.trim();
  if (fromReq) return fromReq;
  return (
    (process.env.SUPER_USER_ORG_ID || '').trim() ||
    (process.env.DEFAULT_ORG_ID || '').trim() ||
    (process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '').trim() ||
    'default'
  );
}

export function isSuperUserRefreshPayload(payload: {
  userId: string;
  username?: string;
}): boolean {
  if (!isSuperUserConfigured()) return false;
  return (
    payload.userId === getSuperUserJwtUserId() &&
    (payload.username || '').trim().toLowerCase() ===
      (process.env.SUPER_USER_USERNAME || '').trim().toLowerCase()
  );
}

export function superUserDisplayProfile(): { nome: string; cognome: string } {
  return {
    nome: (process.env.SUPER_USER_NOME || 'Super').trim() || 'Super',
    cognome: (process.env.SUPER_USER_COGNOME || 'Admin').trim() || 'Admin',
  };
}
