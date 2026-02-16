-- ============================================
-- Row Level Security (RLS) Policies - org_id
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
-- Helper functions per claims/header
-- ============================================

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
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
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claims', true)::jsonb ->> 'userId',
      current_setting('request.headers', true)::jsonb ->> 'x-user-id'
    ),
    ''
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'ruolo'), ''),
    NULLIF((current_setting('request.headers', true)::jsonb ->> 'x-user-ruolo'), ''),
    'operatore'
  );
$$;

-- ============================================
-- Drop policy esistenti
-- ============================================

DROP POLICY IF EXISTS "utenti_select_policy" ON utenti;
DROP POLICY IF EXISTS "utenti_insert_policy" ON utenti;
DROP POLICY IF EXISTS "utenti_update_policy" ON utenti;
DROP POLICY IF EXISTS "utenti_delete_policy" ON utenti;
DROP POLICY IF EXISTS "utenti_tenant_select" ON utenti;
DROP POLICY IF EXISTS "utenti_tenant_insert" ON utenti;
DROP POLICY IF EXISTS "utenti_tenant_update" ON utenti;
DROP POLICY IF EXISTS "utenti_tenant_delete" ON utenti;

DROP POLICY IF EXISTS "clienti_select_policy" ON clienti;
DROP POLICY IF EXISTS "clienti_insert_policy" ON clienti;
DROP POLICY IF EXISTS "clienti_update_policy" ON clienti;
DROP POLICY IF EXISTS "clienti_delete_policy" ON clienti;
DROP POLICY IF EXISTS "clienti_tenant_select" ON clienti;
DROP POLICY IF EXISTS "clienti_tenant_insert" ON clienti;
DROP POLICY IF EXISTS "clienti_tenant_update" ON clienti;
DROP POLICY IF EXISTS "clienti_tenant_delete" ON clienti;

DROP POLICY IF EXISTS "rapportini_select_policy" ON rapportini;
DROP POLICY IF EXISTS "rapportini_insert_policy" ON rapportini;
DROP POLICY IF EXISTS "rapportini_update_policy" ON rapportini;
DROP POLICY IF EXISTS "rapportini_delete_policy" ON rapportini;
DROP POLICY IF EXISTS "rapportini_tenant_select" ON rapportini;
DROP POLICY IF EXISTS "rapportini_tenant_insert" ON rapportini;
DROP POLICY IF EXISTS "rapportini_tenant_update" ON rapportini;
DROP POLICY IF EXISTS "rapportini_tenant_delete" ON rapportini;

DROP POLICY IF EXISTS "marche_select_policy" ON marche;
DROP POLICY IF EXISTS "marche_insert_policy" ON marche;
DROP POLICY IF EXISTS "modelli_select_policy" ON modelli;
DROP POLICY IF EXISTS "modelli_insert_policy" ON modelli;
DROP POLICY IF EXISTS "materiali_select_policy" ON materiali;
DROP POLICY IF EXISTS "materiali_insert_policy" ON materiali;

DROP POLICY IF EXISTS "marche_org_select" ON marche;
DROP POLICY IF EXISTS "marche_org_insert" ON marche;
DROP POLICY IF EXISTS "marche_org_update" ON marche;
DROP POLICY IF EXISTS "marche_org_delete" ON marche;

DROP POLICY IF EXISTS "modelli_org_select" ON modelli;
DROP POLICY IF EXISTS "modelli_org_insert" ON modelli;
DROP POLICY IF EXISTS "modelli_org_update" ON modelli;
DROP POLICY IF EXISTS "modelli_org_delete" ON modelli;

DROP POLICY IF EXISTS "materiali_org_select" ON materiali;
DROP POLICY IF EXISTS "materiali_org_insert" ON materiali;
DROP POLICY IF EXISTS "materiali_org_update" ON materiali;
DROP POLICY IF EXISTS "materiali_org_delete" ON materiali;

-- ============================================
-- UTENTI
-- ============================================

CREATE POLICY "utenti_org_select" ON utenti
  FOR SELECT USING (
    org_id = public.current_org_id()
    AND (
      public.current_user_role() = 'admin'
      OR id = public.current_user_id()
    )
  );

CREATE POLICY "utenti_org_insert" ON utenti
  FOR INSERT WITH CHECK (
    org_id = public.current_org_id()
    AND public.current_user_role() = 'admin'
  );

CREATE POLICY "utenti_org_update" ON utenti
  FOR UPDATE USING (
    org_id = public.current_org_id()
    AND (
      public.current_user_role() = 'admin'
      OR id = public.current_user_id()
    )
  )
  WITH CHECK (
    org_id = public.current_org_id()
    AND (
      public.current_user_role() = 'admin'
      OR id = public.current_user_id()
    )
  );

CREATE POLICY "utenti_org_delete" ON utenti
  FOR DELETE USING (
    org_id = public.current_org_id()
    AND public.current_user_role() = 'admin'
  );

-- ============================================
-- CLIENTI
-- ============================================

CREATE POLICY "clienti_org_select" ON clienti
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY "clienti_org_insert" ON clienti
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "clienti_org_update" ON clienti
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "clienti_org_delete" ON clienti
  FOR DELETE USING (
    org_id = public.current_org_id()
    AND public.current_user_role() = 'admin'
  );

-- ============================================
-- RAPPORTINI
-- ============================================

CREATE POLICY "rapportini_org_select" ON rapportini
  FOR SELECT USING (
    org_id = public.current_org_id()
    AND (
      public.current_user_role() = 'admin'
      OR utente_id = public.current_user_id()
    )
  );

CREATE POLICY "rapportini_org_insert" ON rapportini
  FOR INSERT WITH CHECK (
    org_id = public.current_org_id()
    AND (
      public.current_user_role() = 'admin'
      OR utente_id = public.current_user_id()
    )
  );

CREATE POLICY "rapportini_org_update" ON rapportini
  FOR UPDATE USING (
    org_id = public.current_org_id()
    AND (
      public.current_user_role() = 'admin'
      OR utente_id = public.current_user_id()
    )
  )
  WITH CHECK (
    org_id = public.current_org_id()
    AND (
      public.current_user_role() = 'admin'
      OR utente_id = public.current_user_id()
    )
  );

CREATE POLICY "rapportini_org_delete" ON rapportini
  FOR DELETE USING (
    org_id = public.current_org_id()
    AND (
      public.current_user_role() = 'admin'
      OR utente_id = public.current_user_id()
    )
  );

-- ============================================
-- MARCHE, MODELLI, MATERIALI
-- ============================================

CREATE POLICY "marche_org_select" ON marche
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY "marche_org_insert" ON marche
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "marche_org_update" ON marche
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "marche_org_delete" ON marche
  FOR DELETE USING (
    org_id = public.current_org_id()
    AND public.current_user_role() = 'admin'
  );

CREATE POLICY "modelli_org_select" ON modelli
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY "modelli_org_insert" ON modelli
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "modelli_org_update" ON modelli
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "modelli_org_delete" ON modelli
  FOR DELETE USING (
    org_id = public.current_org_id()
    AND public.current_user_role() = 'admin'
  );

CREATE POLICY "materiali_org_select" ON materiali
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY "materiali_org_insert" ON materiali
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "materiali_org_update" ON materiali
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "materiali_org_delete" ON materiali
  FOR DELETE USING (
    org_id = public.current_org_id()
    AND public.current_user_role() = 'admin'
  );

-- ============================================
-- Indici tenant per performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_utenti_org_id ON utenti(org_id);
CREATE INDEX IF NOT EXISTS idx_clienti_org_id ON clienti(org_id);
CREATE INDEX IF NOT EXISTS idx_rapportini_org_id ON rapportini(org_id);
CREATE INDEX IF NOT EXISTS idx_marche_org_id ON marche(org_id);
CREATE INDEX IF NOT EXISTS idx_modelli_org_id ON modelli(org_id);
CREATE INDEX IF NOT EXISTS idx_materiali_org_id ON materiali(org_id);
