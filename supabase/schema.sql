-- Schema per il database Supabase
-- Esegui questo script nella SQL Editor di Supabase

-- Tabella utenti (per autenticazione)
CREATE TABLE IF NOT EXISTS utenti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  ruolo VARCHAR(20) NOT NULL CHECK (ruolo IN ('admin', 'operatore')),
  nome VARCHAR(255) NOT NULL,
  cognome VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(255),
  qualifica VARCHAR(255),
  attivo BOOLEAN DEFAULT true,
  ultimo_accesso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indice per ricerca rapida username
CREATE INDEX IF NOT EXISTS idx_utenti_username ON utenti(username);
CREATE INDEX IF NOT EXISTS idx_utenti_ruolo ON utenti(ruolo);

-- Inserisci utenti di default
-- Password iniziali: "admin123" per admin, "operatore123" per operatore
-- IMPORTANTE: Dopo il primo setup, esegui lo script per hashare le password con bcrypt
-- Vedi: supabase/setup_users.sql per generare gli hash corretti
INSERT INTO utenti (username, password_hash, ruolo, nome, cognome, email) VALUES
  ('admin', 'admin123', 'admin', 'Admin', 'Sistema', 'admin@bitora.it'),
  ('operatore', 'operatore123', 'operatore', 'Gianfranco', 'Tropini', 'gianfranco.tropini@bitora.it')
ON CONFLICT (username) DO NOTHING;

-- Tabella clienti
CREATE TABLE IF NOT EXISTS clienti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cognome VARCHAR(255) NOT NULL,
  ragione_sociale VARCHAR(255),
  indirizzo VARCHAR(500) NOT NULL,
  citta VARCHAR(255) NOT NULL,
  cap VARCHAR(10) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  partita_iva VARCHAR(50),
  codice_fiscale VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Indice per ricerca rapida
  CONSTRAINT unique_cliente UNIQUE (nome, cognome, telefono)
);

-- Tabella rapportini
-- Ogni rapportino è associato direttamente a un utente (operatore)
CREATE TABLE IF NOT EXISTS rapportini (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  utente_id UUID NOT NULL REFERENCES utenti(id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES clienti(id) ON DELETE RESTRICT,
  data_intervento DATE NOT NULL,
  ora_intervento TIME NOT NULL,
  tipo_stufa VARCHAR(20) NOT NULL CHECK (tipo_stufa IN ('pellet', 'legno')),
  marca VARCHAR(255) NOT NULL,
  modello VARCHAR(255) NOT NULL,
  numero_serie VARCHAR(255),
  tipo_intervento VARCHAR(255) NOT NULL,
  descrizione TEXT NOT NULL,
  materiali_utilizzati TEXT,
  note TEXT,
  firma_cliente TEXT,
  data_creazione TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per migliorare le performance delle query
CREATE INDEX IF NOT EXISTS idx_rapportini_cliente ON rapportini(cliente_id);
CREATE INDEX IF NOT EXISTS idx_rapportini_utente ON rapportini(utente_id);
CREATE INDEX IF NOT EXISTS idx_rapportini_data ON rapportini(data_intervento);
CREATE INDEX IF NOT EXISTS idx_rapportini_tipo_stufa ON rapportini(tipo_stufa);
CREATE INDEX IF NOT EXISTS idx_clienti_nome_cognome ON clienti(nome, cognome);

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_utenti_updated_at BEFORE UPDATE ON utenti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clienti_updated_at BEFORE UPDATE ON clienti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rapportini_updated_at BEFORE UPDATE ON rapportini
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Abilita Row Level Security (RLS)
ALTER TABLE utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapportini ENABLE ROW LEVEL SECURITY;

-- Policy per permettere tutte le operazioni (puoi restringere in base alle tue esigenze)
-- In produzione, dovresti creare policy più specifiche basate sugli utenti autenticati
CREATE POLICY "Enable all operations for utenti" ON utenti
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for clienti" ON clienti
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for rapportini" ON rapportini
  FOR ALL USING (true) WITH CHECK (true);

