#!/usr/bin/env npx tsx
/**
 * Carica .env / .env.local, imposta DATABASE_URL (da variabili separate o override),
 * poi esegue `npx prisma …` (db push, migrate deploy, generate, db seed, …).
 */
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabaseUrl } from '../lib/database-url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
config({ path: resolve(root, '.env') });
config({ path: resolve(root, '.env.local') });

const url = resolveDatabaseUrl();
if (!url.trim()) {
  console.error(
    'Manca la connessione al database: imposta DATABASE_URL / DATABASE_URL_PROD / DATABASE_URL_TEST ' +
      'oppure tutti i campi POSTGRES_HOST, POSTGRES_USER, POSTGRES_DB (e opzionalmente PORT, PASSWORD, SCHEMA, SSLMODE).'
  );
  process.exit(1);
}
process.env.DATABASE_URL = url;

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error('Uso: npx tsx scripts/prisma-with-database-url.ts <comando prisma…>');
  console.error('Esempi: db push | migrate deploy | generate | studio | db seed');
  process.exit(1);
}

const r = spawnSync('npx', ['prisma', ...prismaArgs], { cwd: root, stdio: 'inherit', env: process.env });
process.exit(r.status ?? 1);
