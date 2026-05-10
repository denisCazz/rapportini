/**
 * Hash password in chiaro nella tabella utenti (migrazione legacy → bcrypt).
 *
 * Uso: npm run hash-passwords
 * Carica .env e .env.local se presenti.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { resolveDatabaseUrl } from '../lib/database-url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
config({ path: resolve(root, '.env') });
config({ path: resolve(root, '.env.local') });

const url = resolveDatabaseUrl();
if (!url.trim()) {
  console.error('Errore: imposta le variabili POSTGRES_* o DATABASE_URL in .env');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function hashPasswords() {
  try {
    console.log('Recupero utenti...');
    const utenti = await prisma.utenti.findMany({
      select: { id: true, username: true, password_hash: true },
    });

    if (!utenti.length) {
      console.log('Nessun utente.');
      return;
    }

    for (const utente of utenti) {
      if (utente.password_hash && /^\$2[abxy]\$/.test(utente.password_hash)) {
        console.log(`✓ ${utente.username}: già bcrypt, salto.`);
        continue;
      }
      if (!utente.password_hash) {
        console.log(`⚠ ${utente.username}: password mancante, salto.`);
        continue;
      }
      console.log(`Hash ${utente.username}...`);
      const hashedPassword = await bcrypt.hash(utente.password_hash, 12);
      await prisma.utenti.update({
        where: { id: utente.id },
        data: { password_hash: hashedPassword },
      });
      console.log(`✓ ${utente.username}: ok.`);
    }
    console.log('\nCompletato.');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

hashPasswords();
