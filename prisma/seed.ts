/**
 * Seed sul database indicato da .env (stessa risoluzione URL di `npm run db:push`).
 * Esegui dopo `db:push` o `migrate deploy`.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from '../lib/database-url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
config({ path: resolve(root, '.env') });
config({ path: resolve(root, '.env.local') });

process.env.DATABASE_URL = resolveDatabaseUrl();
if (!process.env.DATABASE_URL?.trim()) {
  console.error('DATABASE_URL non risolvibile: controlla le variabili POSTGRES_* in .env');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const orgId = (
    process.env.SEED_DEFAULT_ORG_ID ||
    process.env.DEFAULT_ORG_ID ||
    process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ||
    'default'
  )
    .toString()
    .trim();

  await prisma.organizzazioni.upsert({
    where: { org_id: orgId },
    create: {
      org_id: orgId,
      nome_azienda: process.env.SEED_ORG_NAME?.trim() || 'Organizzazione',
    },
    update: {
      nome_azienda: process.env.SEED_ORG_NAME?.trim() || undefined,
    },
  });

  console.log(`Seed: organizzazione "${orgId}" ok.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
