/**
 * Configurazione ambienti TEST e PROD.
 * Imposta APP_ENV=TEST o APP_ENV=PROD per commutare tra i due database.
 */

import {
  buildPostgresUrlFromParts,
  getAppEnvFromEnv,
  resolveDatabaseUrl,
  type AppEnvKind,
} from '@/lib/database-url';

export type AppEnv = AppEnvKind;

const rawEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || 'PROD';
export const APP_ENV: AppEnv = rawEnv === 'TEST' ? 'TEST' : 'PROD';

/** @deprecated Usa `buildPostgresUrlFromParts` da `@/lib/database-url`. */
export function buildPostgresUrlFromEnv(): string {
  return buildPostgresUrlFromParts(process.env, APP_ENV);
}

/** URL Postgres per Prisma (runtime API): override URL o campi POSTGRES_* / POSTGRES_TEST_*. */
export function getDatabaseUrl(): string {
  return resolveDatabaseUrl(process.env);
}

export const databaseUrl = getDatabaseUrl();

export function isTestEnv(): boolean {
  return getAppEnvFromEnv(process.env) === 'TEST';
}

export function isProdEnv(): boolean {
  return getAppEnvFromEnv(process.env) === 'PROD';
}
