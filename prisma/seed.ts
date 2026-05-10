/**
 * Seed sul database indicato da .env (stessa risoluzione URL di `npm run db:push`).
 * Esegui dopo `db:push` o `migrate deploy`.
 *
 * Crea organizzazione + utente admin nel DB (login solo da tabella `utenti`).
 */
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
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

async function seedBootstrapAdmin(orgId: string) {
  const username = (process.env.SEED_ADMIN_USERNAME || 'admin').trim();
  const explicitPwd = process.env.SEED_ADMIN_PASSWORD?.trim();

  const existing = await prisma.utenti.findUnique({
    where: { org_id_username: { org_id: orgId, username } },
  });

  if (existing) {
    if (explicitPwd) {
      const password_hash = await bcrypt.hash(explicitPwd, 12);
      await prisma.utenti.update({
        where: { org_id_username: { org_id: orgId, username } },
        data: {
          password_hash,
          ruolo: 'admin',
          attivo: true,
          must_change_password: false,
        },
      });
      console.log(`Seed: password admin "${username}" aggiornata.`);
    } else {
      console.log(
        `Seed: utente admin "${username}" già presente (imposta SEED_ADMIN_PASSWORD nel .env solo per questo comando se vuoi resettare la password).`
      );
    }
    return;
  }

  const password = explicitPwd || `${randomBytes(18).toString('base64url')}aA1!`;
  const password_hash = await bcrypt.hash(password, 12);

  await prisma.utenti.create({
    data: {
      org_id: orgId,
      username,
      password_hash,
      ruolo: 'admin',
      nome: 'Amministratore',
      cognome: 'Sistema',
      attivo: true,
      must_change_password: !explicitPwd,
    },
  });

  if (explicitPwd) {
    console.log(`Seed: creato admin "${username}" (org "${orgId}").`);
  } else {
    console.log(`Seed: creato admin "${username}" (org "${orgId}").`);
    console.log(`      Password iniziale (copiala ora, non viene ripetuta): ${password}`);
  }
}

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

  await seedBootstrapAdmin(orgId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
