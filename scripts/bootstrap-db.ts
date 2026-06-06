/**
 * Bootstrap database proprietario: verifica connessione, push schema, seed admin.
 * Richiede POSTGRES_PASSWORD (e opz. SEED_ADMIN_PASSWORD) in .env
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from '../lib/database-url';

import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
config({ path: resolve(root, '.env') });
config({ path: resolve(root, '.env.local') });

const url = resolveDatabaseUrl();
if (!url.trim()) {
  console.error('❌ DATABASE_URL non risolvibile. Compila POSTGRES_* in .env');
  process.exit(1);
}

if (!process.env.POSTGRES_PASSWORD?.trim() && !process.env.DATABASE_URL?.includes('@')) {
  console.warn('⚠️  POSTGRES_PASSWORD vuota — connessione probabilmente fallirà.');
}

process.env.DATABASE_URL = url;

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connessione database OK');
  } catch (e) {
    console.error('❌ Connessione fallita:', e instanceof Error ? e.message : e);
    console.error('   Prova POSTGRES_SSLMODE=disable o require in .env');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  console.log('→ prisma db push…');
  const push = spawnSync('npx', ['tsx', 'scripts/prisma-with-database-url.ts', 'db', 'push'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  if (push.status !== 0) process.exit(push.status ?? 1);

  if (process.env.SEED_ADMIN_PASSWORD?.trim()) {
    console.log('→ prisma db seed…');
    const seed = spawnSync('npx', ['tsx', 'scripts/prisma-with-database-url.ts', 'db', 'seed'], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32',
    });
    if (seed.status !== 0) process.exit(seed.status ?? 1);
  } else {
    console.warn('⚠️  SEED_ADMIN_PASSWORD non impostata — skip seed. Esegui: npm run db:seed');
  }

  console.log('✅ Bootstrap completato');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
