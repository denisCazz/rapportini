-- FIX COMPLETO tabella organizzazioni
-- Risolve errori su org_id, nome_azienda, logo, indirizzo, partita_iva
-- Esegui nel SQL Editor di Supabase

-- 1. Elimina la tabella esistente (se ha struttura errata)
DROP TABLE IF EXISTS organizzazioni CASCADE;

-- 2. Ricrea con schema corretto
CREATE TABLE organizzazioni (
  org_id VARCHAR(100) PRIMARY KEY,
  nome_azienda VARCHAR(255),
  logo TEXT,
  indirizzo VARCHAR(500),
  partita_iva VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trigger per updated_at
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

-- 4. Popola con org_id da utenti
INSERT INTO organizzazioni (org_id, nome_azienda)
SELECT DISTINCT org_id, 'Bitora - Gestione Rapportini'
FROM utenti
ON CONFLICT (org_id) DO NOTHING;
