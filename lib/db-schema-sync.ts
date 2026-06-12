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
  `CREATE TABLE IF NOT EXISTS rapportino_immagini (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id VARCHAR(100) NOT NULL DEFAULT 'default',
    rapportino_id UUID NOT NULL REFERENCES rapportini(id) ON DELETE CASCADE,
    storage_key VARCHAR(512) NOT NULL,
    bucket VARCHAR(100) NOT NULL DEFAULT 'rapportini-active',
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT,
    caption TEXT,
    uploaded_by UUID REFERENCES utenti(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rapportino_immagini_rapportino ON rapportino_immagini(rapportino_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rapportino_immagini_org ON rapportino_immagini(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rapportino_immagini_archive ON rapportino_immagini(archived_at, created_at)`,
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
    ('notifiche_scadenze', 'Notifiche scadenze manutenzioni', 'Avvisi automatici per le scadenze di manutenzione'),
    ('magazzino_ricambi', 'Magazzino ricambi', 'Gestione giacenze ricambi e alert sotto soglia'),
    ('report_cliente', 'Invia documentazione', 'Invia rapportini e preventivi PDF via email al cliente'),
    ('preventivi', 'Preventivi', 'Creazione preventivi e conversione in rapportino')
  ON CONFLICT (code) DO NOTHING`,
  `ALTER TABLE IF EXISTS moduli ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255)`,
  `ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS stripe_user_bundle_subscription_id VARCHAR(255)`,
  `ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS stripe_user_bundle_status VARCHAR(50)`,
  `ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS user_bundle_trial_ends_at TIMESTAMPTZ`,
  `ALTER TABLE IF EXISTS organizzazioni ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`,
  `ALTER TABLE IF EXISTS scadenze_notificate ADD COLUMN IF NOT EXISTS canale VARCHAR(20) NOT NULL DEFAULT 'manuale'`,
  `ALTER TABLE IF EXISTS scadenze_notificate ADD COLUMN IF NOT EXISTS email_destinatario VARCHAR(255)`,
  `CREATE TABLE IF NOT EXISTS magazzino_ricambi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id VARCHAR(100) NOT NULL DEFAULT 'default',
    materiale_id UUID REFERENCES materiali(id) ON DELETE SET NULL,
    nome VARCHAR(200) NOT NULL,
    codice VARCHAR(64),
    descrizione TEXT,
    giacenza INT NOT NULL DEFAULT 0,
    soglia_minima INT NOT NULL DEFAULT 5,
    prezzo_unitario DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_magazzino_ricambi_org ON magazzino_ricambi(org_id)`,
  `CREATE TABLE IF NOT EXISTS preventivi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id VARCHAR(100) NOT NULL DEFAULT 'default',
    numero VARCHAR(32) NOT NULL,
    cliente_id UUID NOT NULL REFERENCES clienti(id) ON DELETE RESTRICT,
    utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE RESTRICT,
    stato VARCHAR(20) NOT NULL DEFAULT 'bozza',
    totale DECIMAL(10, 2) NOT NULL DEFAULT 0,
    note TEXT,
    rapportino_id UUID REFERENCES rapportini(id) ON DELETE SET NULL,
    valido_fino DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_preventivi_org_numero UNIQUE (org_id, numero)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_preventivi_org_stato ON preventivi(org_id, stato)`,
  `CREATE TABLE IF NOT EXISTS preventivo_righe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preventivo_id UUID NOT NULL REFERENCES preventivi(id) ON DELETE CASCADE,
    descrizione VARCHAR(500) NOT NULL,
    quantita DECIMAL(10, 2) NOT NULL DEFAULT 1,
    prezzo_unitario DECIMAL(10, 2) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'materiale'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_preventivo_righe_preventivo ON preventivo_righe(preventivo_id)`,
  `CREATE TABLE IF NOT EXISTS report_cliente_invii (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id VARCHAR(100) NOT NULL DEFAULT 'default',
    rapportino_id UUID NOT NULL REFERENCES rapportini(id) ON DELETE CASCADE,
    utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
    email_destinatario VARCHAR(255) NOT NULL,
    stato VARCHAR(20) NOT NULL DEFAULT 'inviato',
    errore TEXT,
    inviato_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_report_cliente_invii_rapportino ON report_cliente_invii(rapportino_id)`,
  `CREATE INDEX IF NOT EXISTS idx_report_cliente_invii_org ON report_cliente_invii(org_id)`,
  // Preventivi: rendi opzionali i campi (nessun campo obbligatorio)
  `ALTER TABLE IF EXISTS preventivi ALTER COLUMN cliente_id DROP NOT NULL`,
  `ALTER TABLE IF EXISTS preventivi ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(255)`,
  `ALTER TABLE IF EXISTS preventivi ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(255)`,
  `ALTER TABLE IF EXISTS preventivi ADD COLUMN IF NOT EXISTS titolo VARCHAR(255)`,
  `ALTER TABLE IF EXISTS preventivo_righe ALTER COLUMN descrizione DROP NOT NULL`,
  `ALTER TABLE IF EXISTS preventivo_righe ALTER COLUMN prezzo_unitario SET DEFAULT 0`,
  // Invia documentazione: supporto invio anche preventivi
  `ALTER TABLE IF EXISTS report_cliente_invii ALTER COLUMN rapportino_id DROP NOT NULL`,
  `ALTER TABLE IF EXISTS report_cliente_invii ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(20) NOT NULL DEFAULT 'rapportino'`,
  `ALTER TABLE IF EXISTS report_cliente_invii ADD COLUMN IF NOT EXISTS preventivo_id UUID REFERENCES preventivi(id) ON DELETE CASCADE`,
  `UPDATE moduli SET nome = 'Invia documentazione', descrizione = 'Invia rapportini e preventivi PDF via email al cliente' WHERE code = 'report_cliente'`,
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
  `ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)`,
  `ALTER TABLE IF EXISTS utente_moduli ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)`,
  `ALTER TABLE IF EXISTS utente_moduli ADD COLUMN IF NOT EXISTS stripe_subscription_status VARCHAR(50)`,
  `ALTER TABLE IF EXISTS utente_moduli ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS idx_utente_moduli_stripe_subscription ON utente_moduli(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL`,
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
