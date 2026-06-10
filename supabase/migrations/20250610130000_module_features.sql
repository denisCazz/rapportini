CREATE TABLE IF NOT EXISTS interventi_pianificati (
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
);

CREATE INDEX IF NOT EXISTS idx_interventi_pianificati_org_data
  ON interventi_pianificati(org_id, data_pianificata);

CREATE INDEX IF NOT EXISTS idx_interventi_pianificati_utente
  ON interventi_pianificati(utente_id);

CREATE TABLE IF NOT EXISTS scadenze_notificate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(100) NOT NULL DEFAULT 'default',
  rapportino_id UUID NOT NULL REFERENCES rapportini(id) ON DELETE CASCADE,
  utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  data_scadenza DATE NOT NULL,
  notificato_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_scadenze_notificate UNIQUE (rapportino_id, utente_id, data_scadenza)
);

CREATE INDEX IF NOT EXISTS idx_scadenze_notificate_org
  ON scadenze_notificate(org_id);
