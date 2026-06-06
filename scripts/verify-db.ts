import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from '../lib/database-url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
config({ path: resolve(root, '.env') });

process.env.DATABASE_URL = resolveDatabaseUrl();

async function main() {
  const prisma = new PrismaClient();
  const [utenti, org] = await Promise.all([
    prisma.utenti.count(),
    prisma.organizzazioni.count(),
  ]);
  console.log(`✅ utenti: ${utenti}, organizzazioni: ${org}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
