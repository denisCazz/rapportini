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
  `CREATE TABLE IF NOT EXISTS moduli (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    descrizione TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS utente_moduli (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id VARCHAR(100) NOT NULL DEFAULT 'default',
    utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    modulo_id UUID NOT NULL REFERENCES moduli(id) ON DELETE CASCADE,
    attivo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_utente_moduli_utente_modulo UNIQUE (utente_id, modulo_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_utente_moduli_org_id ON utente_moduli(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_utente_moduli_utente_id ON utente_moduli(utente_id)`,
  `INSERT INTO moduli (code, nome, descrizione) VALUES
    ('pianificazione_interventi', 'Pianificazione interventi', 'Calendario e pianificazione degli interventi tecnici'),
    ('assegnazione_lavori', 'Assegnazione lavori ai tecnici', 'Assegna e gestisci i lavori per ogni tecnico'),
    ('notifiche_scadenze', 'Notifiche scadenze manutenzioni', 'Avvisi automatici per le scadenze di manutenzione')
  ON CONFLICT (code) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS interventi_pianificati (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id VARCHAR(100) NOT NULL DEFAULT 'default',
    cliente_id UUID REFERENCES clienti(id) ON DELETE SET NULL,
    utente_id UUID REFERENCES utenti(id) ON DELETE SET NULL,
    titolo VARCHAR(255) NOT NULL,
    descrizione TEXT,
    data_pianificata DATE NOT NULL,
    ora_pianificata TIME,
    stato VARCHAR(20) NOT NULL DEFAULT 'pianificato',
    creato_da UUID REFERENCES utenti(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_interventi_pianificati_org_data ON interventi_pianificati(org_id, data_pianificata)`,
  `CREATE INDEX IF NOT EXISTS idx_interventi_pianificati_utente ON interventi_pianificati(utente_id)`,
  `CREATE TABLE IF NOT EXISTS scadenze_notificate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id VARCHAR(100) NOT NULL DEFAULT 'default',
    rapportino_id UUID NOT NULL REFERENCES rapportini(id) ON DELETE CASCADE,
    utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    data_scadenza DATE NOT NULL,
    notificato_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_scadenze_notificate UNIQUE (rapportino_id, utente_id, data_scadenza)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_scadenze_notificate_org ON scadenze_notificate(org_id)`,
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
