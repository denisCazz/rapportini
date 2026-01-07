-- ============================================
-- QUERY ALTER PER AGGIORNARE IL DATABASE ESISTENTE
-- ============================================
-- Esegui questo script nella SQL Editor di Supabase
-- se hai già creato le tabelle con lo schema precedente

-- ============================================
-- 1. AGGIORNA TABELLA UTENTI
-- ============================================

-- Aggiungi colonna telefono se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'utenti' 
    AND column_name = 'telefono'
  ) THEN
    ALTER TABLE utenti ADD COLUMN telefono VARCHAR(50);
    RAISE NOTICE 'Colonna telefono aggiunta alla tabella utenti';
  ELSE
    RAISE NOTICE 'Colonna telefono già esistente';
  END IF;
END $$;

-- Aggiungi colonna qualifica se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'utenti' 
    AND column_name = 'qualifica'
  ) THEN
    ALTER TABLE utenti ADD COLUMN qualifica VARCHAR(255);
    RAISE NOTICE 'Colonna qualifica aggiunta alla tabella utenti';
  ELSE
    RAISE NOTICE 'Colonna qualifica già esistente';
  END IF;
END $$;

-- Aggiorna utente operatore esistente con valori di default
UPDATE utenti 
SET 
  telefono = COALESCE(telefono, '+39 333 1234567'),
  qualifica = COALESCE(qualifica, 'Tecnico specializzato')
WHERE username = 'operatore' 
  AND (telefono IS NULL OR qualifica IS NULL);

-- ============================================
-- 2. VERIFICA TRIGGER updated_at PER UTENTI
-- ============================================

-- Crea la funzione se non esiste
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea il trigger per utenti se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_utenti_updated_at'
  ) THEN
    CREATE TRIGGER update_utenti_updated_at 
    BEFORE UPDATE ON utenti
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Trigger update_utenti_updated_at creato';
  ELSE
    RAISE NOTICE 'Trigger update_utenti_updated_at già esistente';
  END IF;
END $$;

-- ============================================
-- 3. VERIFICA STRUTTURA FINALE
-- ============================================

-- Mostra la struttura della tabella utenti
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'utenti'
ORDER BY ordinal_position;

-- Verifica i trigger
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'utenti';

