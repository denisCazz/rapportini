-- Schema per gestione materiali utilizzati
-- Tabelle per marche, modelli e materiali/componenti

-- Tabella marche
CREATE TABLE IF NOT EXISTS marche (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella modelli
CREATE TABLE IF NOT EXISTS modelli (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id UUID NOT NULL REFERENCES marche(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(marca_id, nome)
);

-- Tabella materiali/componenti
CREATE TABLE IF NOT EXISTS materiali (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modello_id UUID NOT NULL REFERENCES modelli(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  descrizione TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(modello_id, nome)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_modelli_marca ON modelli(marca_id);
CREATE INDEX IF NOT EXISTS idx_materiali_modello ON materiali(modello_id);
CREATE INDEX IF NOT EXISTS idx_marche_nome ON marche(nome);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marche_updated_at
  BEFORE UPDATE ON marche
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modelli_updated_at
  BEFORE UPDATE ON modelli
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materiali_updated_at
  BEFORE UPDATE ON materiali
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserimento dati di test: Nordica
INSERT INTO marche (id, nome) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Nordica')
ON CONFLICT (nome) DO NOTHING;

-- Modelli Nordica
INSERT INTO modelli (id, marca_id, nome) VALUES 
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Suprema'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Idro'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Milano')
ON CONFLICT (marca_id, nome) DO NOTHING;

-- Materiali per Nordica Suprema
INSERT INTO materiali (id, modello_id, nome, descrizione) VALUES 
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011', 'Bruciatore', 'Bruciatore principale'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000011', 'Sensore temperatura', 'Sensore di controllo temperatura'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000011', 'Ventola', 'Ventola di aspirazione'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000011', 'Pompa', 'Pompa di alimentazione pellet')
ON CONFLICT (modello_id, nome) DO NOTHING;

-- Materiali per Nordica Idro
INSERT INTO materiali (id, modello_id, nome, descrizione) VALUES 
  ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000012', 'Scambiatore', 'Scambiatore di calore'),
  ('00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000012', 'Valvola termostatica', 'Valvola di controllo temperatura'),
  ('00000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000000012', 'Bruciatore idro', 'Bruciatore per sistema idro'),
  ('00000000-0000-0000-0000-000000000114', '00000000-0000-0000-0000-000000000012', 'Pompa circolazione', 'Pompa di circolazione acqua')
ON CONFLICT (modello_id, nome) DO NOTHING;

-- Materiali per Nordica Milano
INSERT INTO materiali (id, modello_id, nome, descrizione) VALUES 
  ('00000000-0000-0000-0000-000000000121', '00000000-0000-0000-0000-000000000013', 'Bruciatore Milano', 'Bruciatore specifico Milano'),
  ('00000000-0000-0000-0000-000000000122', '00000000-0000-0000-0000-000000000013', 'Sensore fumi', 'Sensore di controllo fumi'),
  ('00000000-0000-0000-0000-000000000123', '00000000-0000-0000-0000-000000000013', 'Ventola Milano', 'Ventola di aspirazione Milano')
ON CONFLICT (modello_id, nome) DO NOTHING;

-- Inserimento dati di test: Extrafame
INSERT INTO marche (id, nome) VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Extrafame')
ON CONFLICT (nome) DO NOTHING;

-- Modelli Extrafame
INSERT INTO modelli (id, marca_id, nome) VALUES 
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'Eva'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000002', 'Idro Eva'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000002', 'Sofia')
ON CONFLICT (marca_id, nome) DO NOTHING;

-- Materiali per Extrafame Eva
INSERT INTO materiali (id, modello_id, nome, descrizione) VALUES 
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000021', 'Bruciatore Eva', 'Bruciatore principale Eva'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000021', 'Sensore pressione', 'Sensore di controllo pressione'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000021', 'Ventola Eva', 'Ventola di aspirazione Eva'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000021', 'Pompa pellet Eva', 'Pompa di alimentazione pellet Eva')
ON CONFLICT (modello_id, nome) DO NOTHING;

-- Materiali per Extrafame Idro Eva
INSERT INTO materiali (id, modello_id, nome, descrizione) VALUES 
  ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000022', 'Scambiatore Idro Eva', 'Scambiatore di calore Idro Eva'),
  ('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000022', 'Valvola Idro Eva', 'Valvola di controllo Idro Eva'),
  ('00000000-0000-0000-0000-000000000213', '00000000-0000-0000-0000-000000000022', 'Bruciatore Idro Eva', 'Bruciatore per sistema idro Eva'),
  ('00000000-0000-0000-0000-000000000214', '00000000-0000-0000-0000-000000000022', 'Pompa circolazione Idro Eva', 'Pompa di circolazione acqua Idro Eva')
ON CONFLICT (modello_id, nome) DO NOTHING;

-- Materiali per Extrafame Sofia
INSERT INTO materiali (id, modello_id, nome, descrizione) VALUES 
  ('00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000023', 'Bruciatore Sofia', 'Bruciatore specifico Sofia'),
  ('00000000-0000-0000-0000-000000000222', '00000000-0000-0000-0000-000000000023', 'Sensore temperatura Sofia', 'Sensore di controllo temperatura Sofia'),
  ('00000000-0000-0000-0000-000000000223', '00000000-0000-0000-0000-000000000023', 'Ventola Sofia', 'Ventola di aspirazione Sofia')
ON CONFLICT (modello_id, nome) DO NOTHING;

