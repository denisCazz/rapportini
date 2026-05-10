const MIN_JWT_SECRET_LENGTH = 32;

let cachedSecret: Uint8Array | null = null;

/**
 * JWT signing secret — never use fallback in production.
 * Requires JWT_SECRET env var, minimum 32 characters.
 */
export function getJwtSecretBytes(): Uint8Array {
  if (cachedSecret) {
    return cachedSecret;
  }
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.trim().length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET is required and must be at least ${MIN_JWT_SECRET_LENGTH} characters (set in .env.local)`
    );
  }
  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}

/** Reset cache (tests only) */
export function __resetJwtSecretCacheForTests(): void {
  cachedSecret = null;
}
