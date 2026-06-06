/**
 * Costruzione DATABASE_URL da variabili d’ambiente (runtime Next + script Prisma/seed).
 * Mantieni allineato con .env.example (POSTGRES_* / POSTGRES_TEST_*).
 */

export type AppEnvKind = 'TEST' | 'PROD';

export function getAppEnvFromEnv(env: NodeJS.ProcessEnv = process.env): AppEnvKind {
  const raw = env.APP_ENV || env.NEXT_PUBLIC_APP_ENV || 'PROD';
  return raw === 'TEST' ? 'TEST' : 'PROD';
}

/** In TEST, ogni POSTGRES_TEST_* ha priorità sul corrispondente POSTGRES_* se valorizzato (non vuoto). */
function pgField(env: NodeJS.ProcessEnv, appEnv: AppEnvKind, field: string): string {
  const baseKey = `POSTGRES_${field}`;
  const testKey = `POSTGRES_TEST_${field}`;
  if (appEnv === 'TEST') {
    const tv = env[testKey];
    if (tv !== undefined && String(tv).trim() !== '') return String(tv);
  }
  const v = env[baseKey];
  return v === undefined ? '' : String(v);
}

/**
 * Compone postgresql://… da POSTGRES_* (e POSTGRES_TEST_* se APP_ENV=TEST).
 * Ritorna stringa vuota se mancano host, user o database.
 */
export function buildPostgresUrlFromParts(env: NodeJS.ProcessEnv = process.env, appEnv?: AppEnvKind): string {
  const mode = appEnv ?? getAppEnvFromEnv(env);
  const host = pgField(env, mode, 'HOST').trim();
  const port = (pgField(env, mode, 'PORT').trim() || '5432').trim();
  const user = pgField(env, mode, 'USER').trim();
  const password = pgField(env, mode, 'PASSWORD');
  const database = pgField(env, mode, 'DB').trim();
  const schema = (pgField(env, mode, 'SCHEMA').trim() || 'public').trim();
  const sslmode = pgField(env, mode, 'SSLMODE').trim();
  if (!host || !user || !database) return '';
  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  let url = `postgresql://${u}:${p}@${host}:${port}/${database}?schema=${encodeURIComponent(schema)}`;
  if (sslmode) url += `&sslmode=${encodeURIComponent(sslmode)}`;
  const connectionLimit = (env.POSTGRES_CONNECTION_LIMIT || '').trim();
  if (connectionLimit) {
    url += `&connection_limit=${encodeURIComponent(connectionLimit)}`;
  } else if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== 'postgres') {
    url += '&connection_limit=10';
  }
  return url;
}

/**
 * URL effettivo per Prisma / app: override DATABASE_URL_* poi composizione da POSTGRES_*.
 */
export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const appEnv = getAppEnvFromEnv(env);
  let explicit = (env.DATABASE_URL || '').trim();
  if (appEnv === 'TEST') {
    explicit = (env.DATABASE_URL_TEST || '').trim() || explicit;
  } else {
    explicit = (env.DATABASE_URL_PROD || '').trim() || explicit;
  }
  if (explicit) return explicit;
  return buildPostgresUrlFromParts(env, appEnv);
}
