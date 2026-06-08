/**
 * Allinea manualmente lo schema DB alle migrazioni idempotenti (senza prisma migrate).
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabaseUrl } from '../lib/database-url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
config({ path: resolve(root, '.env') });
config({ path: resolve(root, '.env.local') });

process.env.DATABASE_URL = resolveDatabaseUrl();
if (!process.env.DATABASE_URL.trim()) {
  console.error('❌ DATABASE_URL non risolvibile. Compila POSTGRES_* in .env');
  process.exit(1);
}

async function main() {
  const { syncDatabaseSchema } = await import('../lib/db-schema-sync');
  await syncDatabaseSchema();
  console.log('✅ db:sync completato');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
