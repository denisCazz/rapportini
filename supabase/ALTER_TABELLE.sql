-- ============================================
-- QUERY ALTER PER AGGIORNARE LE TABELLE ESISTENTI
-- ============================================
-- Esegui questo script nella SQL Editor di Supabase
-- se hai già creato le tabelle con lo schema precedente
-- 
-- IMPORTANTE: Esegui prima supabase/alter_utenti.sql se non l'hai già fatto
-- per aggiungere telefono e qualifica alla tabella utenti

-- ============================================
-- STEP 1: Aggiungi colonna utente_id alla tabella rapportini
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rapportini' 
    AND column_name = 'utente_id'
  ) THEN
    ALTER TABLE rapportini ADD COLUMN utente_id UUID REFERENCES utenti(id) ON DELETE RESTRICT;
    RAISE NOTICE 'Colonna utente_id aggiunta alla tabella rapportini';
  ELSE
    RAISE NOTICE 'Colonna utente_id già esistente';
  END IF;
END $$;

-- ============================================
-- STEP 2: Migra i dati esistenti da operatori a utenti
-- ============================================
-- Se ci sono rapportini esistenti, cerca di associarli agli utenti
-- basandosi su nome, cognome e telefono

DO $$
DECLARE
  rapportino_record RECORD;
  utente_id_found UUID;
  total_migrated INTEGER := 0;
  total_failed INTEGER := 0;
  operatore_id_exists BOOLEAN;
BEGIN
  -- Verifica se la colonna operatore_id esiste ancora
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rapportini' 
    AND column_name = 'operatore_id'
  ) INTO operatore_id_exists;
  
  IF NOT operatore_id_exists THEN
    RAISE NOTICE 'La colonna operatore_id non esiste più. La migrazione potrebbe essere già stata completata.';
    RAISE NOTICE 'Verifico se ci sono rapportini senza utente_id...';
    
    -- Conta rapportini senza utente_id
    SELECT COUNT(*) INTO total_failed
    FROM rapportini
    WHERE utente_id IS NULL;
    
    IF total_failed > 0 THEN
      RAISE WARNING 'Ci sono % rapportini senza utente_id. Devi associarli manualmente.', total_failed;
    ELSE
      RAISE NOTICE 'Tutti i rapportini hanno un utente_id. La migrazione è già completata.';
    END IF;
    
    RETURN;
  END IF;
  
  -- Per ogni rapportino con operatore_id, cerca l'utente corrispondente
  FOR rapportino_record IN 
    SELECT r.id, r.operatore_id, o.nome, o.cognome, o.telefono, o.email
    FROM rapportini r
    JOIN operatori o ON r.operatore_id = o.id
    WHERE r.utente_id IS NULL
  LOOP
    -- Cerca utente con stesso nome, cognome e telefono
    SELECT id INTO utente_id_found
    FROM utenti
    WHERE nome = rapportino_record.nome
      AND cognome = rapportino_record.cognome
      AND (
        (telefono = rapportino_record.telefono) 
        OR (telefono IS NULL AND rapportino_record.telefono IS NULL)
        OR (rapportino_record.telefono IS NULL)
      )
      AND ruolo = 'operatore'
    LIMIT 1;
    
    -- Se trovato, aggiorna il rapportino
    IF utente_id_found IS NOT NULL THEN
      UPDATE rapportini
      SET utente_id = utente_id_found
      WHERE id = rapportino_record.id;
      
      total_migrated := total_migrated + 1;
      RAISE NOTICE 'Rapportino % associato all''utente %', rapportino_record.id, utente_id_found;
    ELSE
      -- Se non trovato, usa il primo utente operatore disponibile come fallback
      SELECT id INTO utente_id_found
      FROM utenti
      WHERE ruolo = 'operatore'
      ORDER BY created_at ASC
      LIMIT 1;
      
      IF utente_id_found IS NOT NULL THEN
        UPDATE rapportini
        SET utente_id = utente_id_found
        WHERE id = rapportino_record.id;
        
        total_migrated := total_migrated + 1;
        RAISE NOTICE 'Rapportino % associato all''utente operatore di default %', rapportino_record.id, utente_id_found;
      ELSE
        total_failed := total_failed + 1;
        RAISE WARNING 'Nessun utente operatore trovato per il rapportino % (operatore: % %)', 
          rapportino_record.id, rapportino_record.nome, rapportino_record.cognome;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migrazione completata: % rapportini migrati, % falliti', total_migrated, total_failed;
END $$;

-- ============================================
-- STEP 3: Verifica che tutti i rapportini abbiano utente_id
-- ============================================

DO $$
DECLARE
  rapportini_senza_utente INTEGER;
BEGIN
  SELECT COUNT(*) INTO rapportini_senza_utente
  FROM rapportini
  WHERE utente_id IS NULL;
  
  IF rapportini_senza_utente > 0 THEN
    RAISE WARNING 'Ci sono % rapportini senza utente_id. Risolvi prima di continuare.', rapportini_senza_utente;
    RAISE NOTICE 'Esegui questa query per vedere i rapportini senza utente_id:';
    RAISE NOTICE 'SELECT r.*, o.nome, o.cognome FROM rapportini r JOIN operatori o ON r.operatore_id = o.id WHERE r.utente_id IS NULL;';
  ELSE
    RAISE NOTICE 'Tutti i rapportini hanno un utente_id associato. Procedo con la rimozione di operatore_id.';
  END IF;
END $$;

-- ============================================
-- STEP 4: Rendi utente_id NOT NULL dopo la migrazione
-- ============================================

DO $$
BEGIN
  -- Verifica se ci sono rapportini senza utente_id
  IF EXISTS (SELECT 1 FROM rapportini WHERE utente_id IS NULL) THEN
    RAISE WARNING 'Non posso rendere utente_id NOT NULL: ci sono rapportini senza utente_id.';
    RAISE NOTICE 'Risolvi prima i rapportini senza utente_id, poi esegui manualmente:';
    RAISE NOTICE 'ALTER TABLE rapportini ALTER COLUMN utente_id SET NOT NULL;';
  ELSE
    -- Se tutti i rapportini hanno utente_id, rendilo NOT NULL
    ALTER TABLE rapportini ALTER COLUMN utente_id SET NOT NULL;
    RAISE NOTICE 'Colonna utente_id impostata come NOT NULL';
  END IF;
END $$;

-- ============================================
-- STEP 5: Rimuovi la foreign key constraint su operatore_id
-- ============================================

DO $$
DECLARE
  constraint_name TEXT;
  operatore_id_exists BOOLEAN;
BEGIN
  -- Verifica se la colonna operatore_id esiste ancora
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rapportini' 
    AND column_name = 'operatore_id'
  ) INTO operatore_id_exists;
  
  IF NOT operatore_id_exists THEN
    RAISE NOTICE 'La colonna operatore_id non esiste più. Salto la rimozione della foreign key.';
    RETURN;
  END IF;
  
  -- Trova il nome della constraint
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'rapportini'::regclass
    AND confrelid = 'operatori'::regclass
    AND contype = 'f'
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE rapportini DROP CONSTRAINT ' || quote_ident(constraint_name);
    RAISE NOTICE 'Foreign key constraint % rimossa', constraint_name;
  ELSE
    RAISE NOTICE 'Nessuna foreign key constraint trovata su operatore_id';
  END IF;
END $$;

-- ============================================
-- STEP 6: Rimuovi la colonna operatore_id
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rapportini' 
    AND column_name = 'operatore_id'
  ) THEN
    ALTER TABLE rapportini DROP COLUMN operatore_id;
    RAISE NOTICE 'Colonna operatore_id rimossa dalla tabella rapportini';
  ELSE
    RAISE NOTICE 'Colonna operatore_id già rimossa';
  END IF;
END $$;

-- ============================================
-- STEP 7: Aggiorna gli indici
-- ============================================

-- Rimuovi vecchio indice su operatore_id se esiste
DROP INDEX IF EXISTS idx_rapportini_operatore;

-- Crea nuovo indice su utente_id se non esiste
CREATE INDEX IF NOT EXISTS idx_rapportini_utente ON rapportini(utente_id);

-- ============================================
-- STEP 8: Rimuovi trigger e policy su operatori (opzionale)
-- ============================================

-- Rimuovi trigger su operatori se esiste
DROP TRIGGER IF EXISTS update_operatori_updated_at ON operatori;

-- Rimuovi policy su operatori se esiste
DROP POLICY IF EXISTS "Enable all operations for operatori" ON operatori;

-- ============================================
-- STEP 9: (OPZIONALE) Rimuovi la tabella operatori
-- ============================================
-- ATTENZIONE: Scommenta queste righe SOLO se:
-- 1. Tutti i dati sono stati migrati correttamente
-- 2. Hai verificato che non ci sono più riferimenti alla tabella operatori
-- 3. Hai fatto un backup del database

-- Verifica prima se ci sono ancora dati nella tabella operatori
DO $$
DECLARE
  operatori_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO operatori_count FROM operatori;
  
  IF operatori_count > 0 THEN
    RAISE NOTICE 'La tabella operatori contiene ancora % record(s).', operatori_count;
    RAISE NOTICE 'Per rimuovere la tabella operatori, esegui manualmente:';
    RAISE NOTICE 'DROP TABLE IF EXISTS operatori CASCADE;';
  ELSE
    RAISE NOTICE 'La tabella operatori è vuota. Puoi rimuoverla con:';
    RAISE NOTICE 'DROP TABLE IF EXISTS operatori CASCADE;';
  END IF;
END $$;

-- ============================================
-- VERIFICA FINALE
-- ============================================

-- Mostra la struttura della tabella rapportini
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'rapportini'
ORDER BY ordinal_position;

-- Conta rapportini per utente
SELECT 
  u.username,
  u.nome,
  u.cognome,
  u.ruolo,
  COUNT(r.id) as totale_rapportini
FROM utenti u
LEFT JOIN rapportini r ON u.id = r.utente_id
GROUP BY u.id, u.username, u.nome, u.cognome, u.ruolo
ORDER BY totale_rapportini DESC;

-- Verifica che non ci siano più riferimenti a operatore_id
SELECT 
  COUNT(*) as rapportini_con_operatore_id
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'rapportini' 
  AND column_name = 'operatore_id';

-- Se il risultato è 0, la migrazione è completata con successo!

