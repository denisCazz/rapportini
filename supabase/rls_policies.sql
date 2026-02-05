-- ============================================
-- Row Level Security (RLS) Policies
-- Esegui questo script su Supabase SQL Editor
-- ============================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapportini ENABLE ROW LEVEL SECURITY;
ALTER TABLE marche ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelli ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiali ENABLE ROW LEVEL SECURITY;

-- ============================================
-- UTENTI
-- ============================================

-- Elimina policy esistenti
DROP POLICY IF EXISTS "utenti_select_policy" ON utenti;
DROP POLICY IF EXISTS "utenti_insert_policy" ON utenti;
DROP POLICY IF EXISTS "utenti_update_policy" ON utenti;
DROP POLICY IF EXISTS "utenti_delete_policy" ON utenti;

-- Gli utenti possono vedere solo se stessi (o tutti se admin)
-- NOTA: Questa policy richiede che l'app passi l'ID utente via RLS context
-- Per semplicità, permettiamo lettura a tutti gli utenti autenticati
CREATE POLICY "utenti_select_policy" ON utenti
  FOR SELECT USING (true);

-- Solo admin può inserire nuovi utenti
CREATE POLICY "utenti_insert_policy" ON utenti
  FOR INSERT WITH CHECK (true);

-- Utenti possono aggiornare solo se stessi, admin può aggiornare tutti
CREATE POLICY "utenti_update_policy" ON utenti
  FOR UPDATE USING (true);

-- Solo admin può eliminare utenti
CREATE POLICY "utenti_delete_policy" ON utenti
  FOR DELETE USING (true);

-- ============================================
-- CLIENTI
-- ============================================

DROP POLICY IF EXISTS "clienti_select_policy" ON clienti;
DROP POLICY IF EXISTS "clienti_insert_policy" ON clienti;
DROP POLICY IF EXISTS "clienti_update_policy" ON clienti;
DROP POLICY IF EXISTS "clienti_delete_policy" ON clienti;

-- Tutti gli utenti autenticati possono vedere i clienti
CREATE POLICY "clienti_select_policy" ON clienti
  FOR SELECT USING (true);

-- Tutti gli utenti autenticati possono inserire clienti
CREATE POLICY "clienti_insert_policy" ON clienti
  FOR INSERT WITH CHECK (true);

-- Tutti gli utenti autenticati possono aggiornare clienti
CREATE POLICY "clienti_update_policy" ON clienti
  FOR UPDATE USING (true);

-- Solo admin può eliminare clienti
CREATE POLICY "clienti_delete_policy" ON clienti
  FOR DELETE USING (true);

-- ============================================
-- RAPPORTINI
-- ============================================

DROP POLICY IF EXISTS "rapportini_select_policy" ON rapportini;
DROP POLICY IF EXISTS "rapportini_insert_policy" ON rapportini;
DROP POLICY IF EXISTS "rapportini_update_policy" ON rapportini;
DROP POLICY IF EXISTS "rapportini_delete_policy" ON rapportini;

-- Operatori vedono solo i propri rapportini, admin vede tutti
-- NOTA: Il controllo effettivo avviene lato API
CREATE POLICY "rapportini_select_policy" ON rapportini
  FOR SELECT USING (true);

-- Operatori possono inserire rapportini
CREATE POLICY "rapportini_insert_policy" ON rapportini
  FOR INSERT WITH CHECK (true);

-- Operatori possono aggiornare solo i propri rapportini
CREATE POLICY "rapportini_update_policy" ON rapportini
  FOR UPDATE USING (true);

-- Operatori possono eliminare solo i propri rapportini, admin può eliminare tutti
CREATE POLICY "rapportini_delete_policy" ON rapportini
  FOR DELETE USING (true);

-- ============================================
-- MARCHE, MODELLI, MATERIALI (catalogo)
-- ============================================

DROP POLICY IF EXISTS "marche_select_policy" ON marche;
DROP POLICY IF EXISTS "marche_insert_policy" ON marche;
DROP POLICY IF EXISTS "modelli_select_policy" ON modelli;
DROP POLICY IF EXISTS "modelli_insert_policy" ON modelli;
DROP POLICY IF EXISTS "materiali_select_policy" ON materiali;
DROP POLICY IF EXISTS "materiali_insert_policy" ON materiali;

-- Tutti possono leggere il catalogo
CREATE POLICY "marche_select_policy" ON marche FOR SELECT USING (true);
CREATE POLICY "modelli_select_policy" ON modelli FOR SELECT USING (true);
CREATE POLICY "materiali_select_policy" ON materiali FOR SELECT USING (true);

-- Tutti gli utenti autenticati possono aggiungere al catalogo
CREATE POLICY "marche_insert_policy" ON marche FOR INSERT WITH CHECK (true);
CREATE POLICY "modelli_insert_policy" ON modelli FOR INSERT WITH CHECK (true);
CREATE POLICY "materiali_insert_policy" ON materiali FOR INSERT WITH CHECK (true);

-- ============================================
-- INDICI per performance
-- ============================================

-- Indice per ricerca rapportini per utente
CREATE INDEX IF NOT EXISTS idx_rapportini_utente_id ON rapportini(utente_id);

-- Indice per ricerca rapportini per cliente
CREATE INDEX IF NOT EXISTS idx_rapportini_cliente_id ON rapportini(cliente_id);

-- Indice per ricerca rapportini per data
CREATE INDEX IF NOT EXISTS idx_rapportini_data_intervento ON rapportini(data_intervento DESC);

-- Indice per ricerca rapportini per tipo stufa
CREATE INDEX IF NOT EXISTS idx_rapportini_tipo_stufa ON rapportini(tipo_stufa);

-- Indice per ricerca clienti per nome/cognome
CREATE INDEX IF NOT EXISTS idx_clienti_nome_cognome ON clienti(nome, cognome);

-- Indice per ricerca full-text su descrizione rapportini
CREATE INDEX IF NOT EXISTS idx_rapportini_descrizione_gin ON rapportini USING gin(to_tsvector('italian', descrizione));

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Le policy sopra sono permissive perché il controllo degli accessi
-- avviene principalmente lato API (Next.js middleware + API routes).
-- 
-- Per un controllo RLS più granulare, dovresti:
-- 1. Usare Supabase Auth invece di autenticazione custom
-- 2. Passare il JWT di Supabase nelle richieste
-- 3. Usare auth.uid() nelle policy per identificare l'utente
--
-- Esempio di policy più restrittiva (richiede Supabase Auth):
-- CREATE POLICY "rapportini_select_own" ON rapportini
--   FOR SELECT USING (
--     utente_id = auth.uid() OR 
--     EXISTS (SELECT 1 FROM utenti WHERE id = auth.uid() AND ruolo = 'admin')
--   );
