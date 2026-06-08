import { prisma } from '@/lib/db';

/**
 * Patch SQL idempotenti allineate a supabase/migrations/*.
 * Risolve errori Prisma quando il DB non ha ancora le colonne dello schema corrente.
 */
const SCHEMA_PATCHES: string[] = [
  `ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE IF EXISTS clienti ADD COLUMN IF NOT EXISTS via VARCHAR(255)`,
  `ALTER TABLE IF EXISTS clienti ADD COLUMN IF NOT EXISTS numero_civico VARCHAR(20)`,
  `ALTER TABLE IF EXISTS clienti ADD COLUMN IF NOT EXISTS provincia VARCHAR(10)`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS data_richiesta DATE`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS tipologia_intervento VARCHAR(50)`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS data_acquisto DATE`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS rivenditore VARCHAR(255)`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS motivo_chiamata TEXT`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS verifiche TEXT`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS installazione_eseguita_da VARCHAR(255)`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS spiegata_manutenzione VARCHAR(5)`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS impianto_elettrico VARCHAR(5)`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS condotto_fumi VARCHAR(5)`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS installazione_uni10683 VARCHAR(5)`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS controllo_parametri VARCHAR(5)`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS tipologia_installazione VARCHAR(50)`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS note_installazione TEXT`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS prossimo_intervento DATE`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS firma_cliente_privacy TEXT`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS presa_visione_condizioni_garanzia BOOLEAN DEFAULT false`,
  `ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS codice_errore VARCHAR(20)`,
];

let syncPromise: Promise<void> | null = null;

export function isDbSchemaSyncEnabled(): boolean {
  return process.env.SYNC_DB_ON_START !== 'false';
}

export async function syncDatabaseSchema(): Promise<void> {
  if (!isDbSchemaSyncEnabled()) return;
  if (!syncPromise) {
    syncPromise = runSchemaPatches();
  }
  return syncPromise;
}

async function runSchemaPatches(): Promise<void> {
  try {
    for (const sql of SCHEMA_PATCHES) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log('[db-schema-sync] Schema database allineato');
  } catch (error) {
    console.error(
      '[db-schema-sync] Errore sincronizzazione schema:',
      error instanceof Error ? error.message : error
    );
  }
}
