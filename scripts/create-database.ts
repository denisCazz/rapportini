import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { buildPostgresUrlFromParts } from '../lib/database-url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
config({ path: resolve(root, '.env') });
config({ path: resolve(root, '.env.local') });

const dbName = (process.env.POSTGRES_DB || 'rapportini_eva').trim();
const adminUrl = buildPostgresUrlFromParts({ ...process.env, POSTGRES_DB: 'postgres' }, 'PROD');

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  try {
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
    console.log(`✅ Database "${dbName}" creato`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('already exists') || msg.includes('42P04')) {
      console.log(`ℹ️  Database "${dbName}" già esistente`);
    } else {
      console.error('❌', msg);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
