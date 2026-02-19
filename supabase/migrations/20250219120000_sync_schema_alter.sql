-- ============================================
-- Bitora - Migrazioni ALTER per DB esistente
-- ============================================
-- Best practice: migrazioni idempotenti (IF EXISTS / IF NOT EXISTS)
-- Esegui nel SQL Editor Supabase o con: supabase db push
--
-- SET lock_timeout = '5s';  -- decommenta se errori di lock

-- ============================================
-- 1. TABELLE MANCANTI (CREATE IF NOT EXISTS)
-- ============================================

CREATE TABLE IF NOT EXISTS utenti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id VARCHAR(100) NOT NULL DEFAULT 'default',
  username VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  ruolo VARCHAR(20) NOT NULL CHECK (ruolo IN ('admin', 'operatore')),
  nome VARCHAR(255) NOT NULL,
  cognome VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(255),
  qualifica VARCHAR(255),
  firma TEXT,
  attivo BOOLEAN DEFAULT true,
  ultimo_accesso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_utenti_org_id_username UNIQUE (org_id, username)
);

CREATE TABLE IF NOT EXISTS clienti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id VARCHAR(100) NOT NULL DEFAULT 'default',
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
  CONSTRAINT unique_cliente UNIQUE (org_id, nome, cognome, telefono)
);

CREATE TABLE IF NOT EXISTS organizzazioni (
  org_id VARCHAR(100) PRIMARY KEY,
  nome_azienda VARCHAR(255),
  logo TEXT,
  indirizzo VARCHAR(500),
  partita_iva VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rapportini (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id VARCHAR(100) NOT NULL DEFAULT 'default',
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
  firma_operatore TEXT,
  firma_cliente TEXT,
  data_creazione TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marche (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(100) NOT NULL DEFAULT 'default',
  nome VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, nome)
);

CREATE TABLE IF NOT EXISTS modelli (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(100) NOT NULL DEFAULT 'default',
  marca_id UUID NOT NULL REFERENCES marche(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, marca_id, nome)
);

CREATE TABLE IF NOT EXISTS materiali (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(100) NOT NULL DEFAULT 'default',
  modello_id UUID NOT NULL REFERENCES modelli(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  descrizione TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, modello_id, nome)
);

-- ============================================
-- 2. COLONNE MANCANTI (ALTER ADD IF NOT EXISTS)
-- ============================================

ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS org_id VARCHAR(100) NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS qualifica VARCHAR(255);
ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS firma TEXT;
ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS attivo BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS ultimo_accesso TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS utenti ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE IF EXISTS clienti ADD COLUMN IF NOT EXISTS org_id VARCHAR(100) NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS clienti ADD COLUMN IF NOT EXISTS ragione_sociale VARCHAR(255);
ALTER TABLE IF EXISTS clienti ADD COLUMN IF NOT EXISTS partita_iva VARCHAR(50);
ALTER TABLE IF EXISTS clienti ADD COLUMN IF NOT EXISTS codice_fiscale VARCHAR(50);
ALTER TABLE IF EXISTS clienti ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS clienti ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS org_id VARCHAR(100) NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS data_creazione TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS rapportini ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE IF EXISTS organizzazioni ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS organizzazioni ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- 3. INDICI (CREATE INDEX IF NOT EXISTS)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_utenti_username ON utenti(username);
CREATE INDEX IF NOT EXISTS idx_utenti_ruolo ON utenti(ruolo);
CREATE INDEX IF NOT EXISTS idx_utenti_org_id ON utenti(org_id);

CREATE INDEX IF NOT EXISTS idx_clienti_nome_cognome ON clienti(nome, cognome);
CREATE INDEX IF NOT EXISTS idx_clienti_org_id ON clienti(org_id);

CREATE INDEX IF NOT EXISTS idx_rapportini_cliente ON rapportini(cliente_id);
CREATE INDEX IF NOT EXISTS idx_rapportini_utente ON rapportini(utente_id);
CREATE INDEX IF NOT EXISTS idx_rapportini_data ON rapportini(data_intervento);
CREATE INDEX IF NOT EXISTS idx_rapportini_tipo_stufa ON rapportini(tipo_stufa);
CREATE INDEX IF NOT EXISTS idx_rapportini_org_id ON rapportini(org_id);
CREATE INDEX IF NOT EXISTS idx_rapportini_org_utente ON rapportini(org_id, utente_id);
CREATE INDEX IF NOT EXISTS idx_rapportini_org_data ON rapportini(org_id, data_intervento DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_modelli_marca ON modelli(marca_id);
CREATE INDEX IF NOT EXISTS idx_materiali_modello ON materiali(modello_id);
CREATE INDEX IF NOT EXISTS idx_marche_nome ON marche(nome);
CREATE INDEX IF NOT EXISTS idx_marche_org_id ON marche(org_id);
CREATE INDEX IF NOT EXISTS idx_modelli_org_id ON modelli(org_id);
CREATE INDEX IF NOT EXISTS idx_materiali_org_id ON materiali(org_id);

-- ============================================
-- 4. FUNZIONI (CREATE OR REPLACE)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'idsocieta'), ''),
    NULLIF((current_setting('request.headers', true)::jsonb ->> 'x-org-id'), ''),
    NULLIF((current_setting('request.headers', true)::jsonb ->> 'x-user-idsocieta'), ''),
    NULLIF((current_setting('request.headers', true)::jsonb ->> 'x-tenant-id'), ''),
    'default'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claims', true)::jsonb ->> 'userId',
      current_setting('request.headers', true)::jsonb ->> 'x-user-id'
    ),
    ''
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'ruolo'), ''),
    NULLIF((current_setting('request.headers', true)::jsonb ->> 'x-user-ruolo'), ''),
    'operatore'
  );
$$;

-- ============================================
-- 5. TRIGGER (DROP IF EXISTS + CREATE)
-- ============================================

DROP TRIGGER IF EXISTS update_utenti_updated_at ON utenti;
CREATE TRIGGER update_utenti_updated_at BEFORE UPDATE ON utenti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clienti_updated_at ON clienti;
CREATE TRIGGER update_clienti_updated_at BEFORE UPDATE ON clienti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rapportini_updated_at ON rapportini;
CREATE TRIGGER update_rapportini_updated_at BEFORE UPDATE ON rapportini
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizzazioni_updated_at ON organizzazioni;
CREATE TRIGGER update_organizzazioni_updated_at BEFORE UPDATE ON organizzazioni
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_marche_updated_at ON marche;
CREATE TRIGGER update_marche_updated_at BEFORE UPDATE ON marche
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_modelli_updated_at ON modelli;
CREATE TRIGGER update_modelli_updated_at BEFORE UPDATE ON modelli
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_materiali_updated_at ON materiali;
CREATE TRIGGER update_materiali_updated_at BEFORE UPDATE ON materiali
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. RLS (ENABLE + DROP/CREATE POLICIES)
-- ============================================

ALTER TABLE IF EXISTS utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rapportini ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS marche ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS modelli ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS materiali ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "utenti_org_select" ON utenti;
DROP POLICY IF EXISTS "utenti_org_insert" ON utenti;
DROP POLICY IF EXISTS "utenti_org_update" ON utenti;
DROP POLICY IF EXISTS "utenti_org_delete" ON utenti;
CREATE POLICY "utenti_org_select" ON utenti FOR SELECT USING (
  org_id = (SELECT public.current_org_id()) AND ((SELECT public.current_user_role()) = 'admin' OR id = (SELECT public.current_user_id()))
);
CREATE POLICY "utenti_org_insert" ON utenti FOR INSERT WITH CHECK (org_id = (SELECT public.current_org_id()) AND (SELECT public.current_user_role()) = 'admin');
CREATE POLICY "utenti_org_update" ON utenti FOR UPDATE USING (
  org_id = (SELECT public.current_org_id()) AND ((SELECT public.current_user_role()) = 'admin' OR id = (SELECT public.current_user_id()))
) WITH CHECK (org_id = (SELECT public.current_org_id()) AND ((SELECT public.current_user_role()) = 'admin' OR id = (SELECT public.current_user_id())));
CREATE POLICY "utenti_org_delete" ON utenti FOR DELETE USING (org_id = (SELECT public.current_org_id()) AND (SELECT public.current_user_role()) = 'admin');

DROP POLICY IF EXISTS "clienti_org_select" ON clienti;
DROP POLICY IF EXISTS "clienti_org_insert" ON clienti;
DROP POLICY IF EXISTS "clienti_org_update" ON clienti;
DROP POLICY IF EXISTS "clienti_org_delete" ON clienti;
CREATE POLICY "clienti_org_select" ON clienti FOR SELECT USING (org_id = (SELECT public.current_org_id()));
CREATE POLICY "clienti_org_insert" ON clienti FOR INSERT WITH CHECK (org_id = (SELECT public.current_org_id()));
CREATE POLICY "clienti_org_update" ON clienti FOR UPDATE USING (org_id = (SELECT public.current_org_id())) WITH CHECK (org_id = (SELECT public.current_org_id()));
CREATE POLICY "clienti_org_delete" ON clienti FOR DELETE USING (org_id = (SELECT public.current_org_id()) AND (SELECT public.current_user_role()) = 'admin');

DROP POLICY IF EXISTS "rapportini_org_select" ON rapportini;
DROP POLICY IF EXISTS "rapportini_org_insert" ON rapportini;
DROP POLICY IF EXISTS "rapportini_org_update" ON rapportini;
DROP POLICY IF EXISTS "rapportini_org_delete" ON rapportini;
CREATE POLICY "rapportini_org_select" ON rapportini FOR SELECT USING (
  org_id = (SELECT public.current_org_id()) AND ((SELECT public.current_user_role()) = 'admin' OR utente_id = (SELECT public.current_user_id()))
);
CREATE POLICY "rapportini_org_insert" ON rapportini FOR INSERT WITH CHECK (
  org_id = (SELECT public.current_org_id()) AND ((SELECT public.current_user_role()) = 'admin' OR utente_id = (SELECT public.current_user_id()))
);
CREATE POLICY "rapportini_org_update" ON rapportini FOR UPDATE USING (
  org_id = (SELECT public.current_org_id()) AND ((SELECT public.current_user_role()) = 'admin' OR utente_id = (SELECT public.current_user_id()))
) WITH CHECK (org_id = (SELECT public.current_org_id()) AND ((SELECT public.current_user_role()) = 'admin' OR utente_id = (SELECT public.current_user_id())));
CREATE POLICY "rapportini_org_delete" ON rapportini FOR DELETE USING (
  org_id = (SELECT public.current_org_id()) AND ((SELECT public.current_user_role()) = 'admin' OR utente_id = (SELECT public.current_user_id()))
);

DROP POLICY IF EXISTS "marche_org_select" ON marche;
DROP POLICY IF EXISTS "marche_org_insert" ON marche;
DROP POLICY IF EXISTS "marche_org_update" ON marche;
DROP POLICY IF EXISTS "marche_org_delete" ON marche;
CREATE POLICY "marche_org_select" ON marche FOR SELECT USING (org_id = (SELECT public.current_org_id()));
CREATE POLICY "marche_org_insert" ON marche FOR INSERT WITH CHECK (org_id = (SELECT public.current_org_id()));
CREATE POLICY "marche_org_update" ON marche FOR UPDATE USING (org_id = (SELECT public.current_org_id())) WITH CHECK (org_id = (SELECT public.current_org_id()));
CREATE POLICY "marche_org_delete" ON marche FOR DELETE USING (org_id = (SELECT public.current_org_id()) AND (SELECT public.current_user_role()) = 'admin');

DROP POLICY IF EXISTS "modelli_org_select" ON modelli;
DROP POLICY IF EXISTS "modelli_org_insert" ON modelli;
DROP POLICY IF EXISTS "modelli_org_update" ON modelli;
DROP POLICY IF EXISTS "modelli_org_delete" ON modelli;
CREATE POLICY "modelli_org_select" ON modelli FOR SELECT USING (org_id = (SELECT public.current_org_id()));
CREATE POLICY "modelli_org_insert" ON modelli FOR INSERT WITH CHECK (org_id = (SELECT public.current_org_id()));
CREATE POLICY "modelli_org_update" ON modelli FOR UPDATE USING (org_id = (SELECT public.current_org_id())) WITH CHECK (org_id = (SELECT public.current_org_id()));
CREATE POLICY "modelli_org_delete" ON modelli FOR DELETE USING (org_id = (SELECT public.current_org_id()) AND (SELECT public.current_user_role()) = 'admin');

DROP POLICY IF EXISTS "materiali_org_select" ON materiali;
DROP POLICY IF EXISTS "materiali_org_insert" ON materiali;
DROP POLICY IF EXISTS "materiali_org_update" ON materiali;
DROP POLICY IF EXISTS "materiali_org_delete" ON materiali;
CREATE POLICY "materiali_org_select" ON materiali FOR SELECT USING (org_id = (SELECT public.current_org_id()));
CREATE POLICY "materiali_org_insert" ON materiali FOR INSERT WITH CHECK (org_id = (SELECT public.current_org_id()));
CREATE POLICY "materiali_org_update" ON materiali FOR UPDATE USING (org_id = (SELECT public.current_org_id())) WITH CHECK (org_id = (SELECT public.current_org_id()));
CREATE POLICY "materiali_org_delete" ON materiali FOR DELETE USING (org_id = (SELECT public.current_org_id()) AND (SELECT public.current_user_role()) = 'admin');
