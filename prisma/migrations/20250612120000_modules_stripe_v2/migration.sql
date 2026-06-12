-- Stripe price IDs, user bundle, new modules, magazzino/preventivi/report

ALTER TABLE IF EXISTS moduli ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS stripe_user_bundle_subscription_id VARCHAR(255);
ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS stripe_user_bundle_status VARCHAR(50);
ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS user_bundle_trial_ends_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS organizzazioni ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS scadenze_notificate ADD COLUMN IF NOT EXISTS canale VARCHAR(20) NOT NULL DEFAULT 'manuale';
ALTER TABLE IF EXISTS scadenze_notificate ADD COLUMN IF NOT EXISTS email_destinatario VARCHAR(255);

INSERT INTO moduli (code, nome, descrizione) VALUES
  ('magazzino_ricambi', 'Magazzino ricambi', 'Gestione giacenze ricambi e alert sotto soglia'),
  ('report_cliente', 'Report al cliente', 'Invio rapportino PDF via email al cliente'),
  ('preventivi', 'Preventivi', 'Creazione preventivi e conversione in rapportino')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS magazzino_ricambi (
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
);
CREATE INDEX IF NOT EXISTS idx_magazzino_ricambi_org ON magazzino_ricambi(org_id);

CREATE TABLE IF NOT EXISTS preventivi (
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
);
CREATE INDEX IF NOT EXISTS idx_preventivi_org_stato ON preventivi(org_id, stato);

CREATE TABLE IF NOT EXISTS preventivo_righe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preventivo_id UUID NOT NULL REFERENCES preventivi(id) ON DELETE CASCADE,
  descrizione VARCHAR(500) NOT NULL,
  quantita DECIMAL(10, 2) NOT NULL DEFAULT 1,
  prezzo_unitario DECIMAL(10, 2) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'materiale'
);
CREATE INDEX IF NOT EXISTS idx_preventivo_righe_preventivo ON preventivo_righe(preventivo_id);

CREATE TABLE IF NOT EXISTS report_cliente_invii (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(100) NOT NULL DEFAULT 'default',
  rapportino_id UUID NOT NULL REFERENCES rapportini(id) ON DELETE CASCADE,
  utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  email_destinatario VARCHAR(255) NOT NULL,
  stato VARCHAR(20) NOT NULL DEFAULT 'inviato',
  errore TEXT,
  inviato_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_cliente_invii_rapportino ON report_cliente_invii(rapportino_id);
CREATE INDEX IF NOT EXISTS idx_report_cliente_invii_org ON report_cliente_invii(org_id);
