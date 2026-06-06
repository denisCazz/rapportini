const MIN_JWT_SECRET_LENGTH = 32;

const PLACEHOLDER_SECRETS = new Set([
  'your-super-secret-jwt-key-min-32-characters-long',
  'change-me-use-openssl-rand-base64-32-chars',
]);

let cachedSecret: Uint8Array | null = null;

export function isJwtSecretPlaceholder(secret = process.env.JWT_SECRET): boolean {
  const raw = (secret || '').trim();
  return !raw || PLACEHOLDER_SECRETS.has(raw);
}

/** Valida JWT_SECRET senza cache — utile per health check. */
export function validateJwtSecretConfig(): void {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.trim().length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET is required and must be at least ${MIN_JWT_SECRET_LENGTH} characters (set in .env.local)`
    );
  }
  if (process.env.NODE_ENV === 'production' && isJwtSecretPlaceholder(raw)) {
    throw new Error('JWT_SECRET placeholder non consentito in produzione');
  }
}

/**
 * JWT signing secret — never use fallback in production.
 * Requires JWT_SECRET env var, minimum 32 characters.
 */
export function getJwtSecretBytes(): Uint8Array {
  if (cachedSecret) {
    return cachedSecret;
  }
  validateJwtSecretConfig();
  const raw = process.env.JWT_SECRET!.trim();
  if (process.env.NODE_ENV !== 'production' && isJwtSecretPlaceholder(raw)) {
    console.warn('[auth] JWT_SECRET è un placeholder — cambialo prima del deploy in produzione');
  }
  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}

/** Reset cache (tests only) */
export function __resetJwtSecretCacheForTests(): void {
  cachedSecret = null;
}
