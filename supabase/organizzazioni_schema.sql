-- Tabella organizzazioni per impostazioni azienda persistenti
-- Esegui in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS organizzazioni (
  org_id VARCHAR(100) PRIMARY KEY,
  nome_azienda VARCHAR(255),
  logo TEXT,
  indirizzo VARCHAR(500),
  partita_iva VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_organizzazioni_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizzazioni_updated_at ON organizzazioni;
CREATE TRIGGER update_organizzazioni_updated_at
  BEFORE UPDATE ON organizzazioni
  FOR EACH ROW EXECUTE FUNCTION update_organizzazioni_updated_at();

-- Inserisci default per org esistenti
INSERT INTO organizzazioni (org_id, nome_azienda)
SELECT DISTINCT org_id, 'Bitora - Gestione Rapportini'
FROM utenti
ON CONFLICT (org_id) DO NOTHING;
