-- ============================================
-- MIGRAZIONE: Da operatori a utenti
-- ============================================
-- Questo script elimina la tabella operatori e usa direttamente utenti
-- Ogni utente può vedere solo i propri rapportini (admin vede tutto)

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
BEGIN
  -- Per ogni rapportino con operatore_id, cerca l'utente corrispondente
  FOR rapportino_record IN 
    SELECT r.id, r.operatore_id, o.nome, o.cognome, o.telefono
    FROM rapportini r
    JOIN operatori o ON r.operatore_id = o.id
    WHERE r.utente_id IS NULL
  LOOP
    -- Cerca utente con stesso nome, cognome e telefono
    SELECT id INTO utente_id_found
    FROM utenti
    WHERE nome = rapportino_record.nome
      AND cognome = rapportino_record.cognome
      AND (telefono = rapportino_record.telefono OR (telefono IS NULL AND rapportino_record.telefono IS NULL))
      AND ruolo = 'operatore'
    LIMIT 1;
    
    -- Se trovato, aggiorna il rapportino
    IF utente_id_found IS NOT NULL THEN
      UPDATE rapportini
      SET utente_id = utente_id_found
      WHERE id = rapportino_record.id;
      
      RAISE NOTICE 'Rapportino % associato all''utente %', rapportino_record.id, utente_id_found;
    ELSE
      -- Se non trovato, usa il primo utente operatore disponibile come fallback
      SELECT id INTO utente_id_found
      FROM utenti
      WHERE ruolo = 'operatore'
      LIMIT 1;
      
      IF utente_id_found IS NOT NULL THEN
        UPDATE rapportini
        SET utente_id = utente_id_found
        WHERE id = rapportino_record.id;
        
        RAISE NOTICE 'Rapportino % associato all''utente operatore di default %', rapportino_record.id, utente_id_found;
      ELSE
        RAISE WARNING 'Nessun utente operatore trovato per il rapportino %', rapportino_record.id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- STEP 3: Rendi utente_id NOT NULL dopo la migrazione
-- ============================================

DO $$
BEGIN
  -- Verifica se ci sono rapportini senza utente_id
  IF EXISTS (SELECT 1 FROM rapportini WHERE utente_id IS NULL) THEN
    RAISE WARNING 'Ci sono rapportini senza utente_id. Risolvi prima di continuare.';
  ELSE
    -- Se tutti i rapportini hanno utente_id, rendilo NOT NULL
    ALTER TABLE rapportini ALTER COLUMN utente_id SET NOT NULL;
    RAISE NOTICE 'Colonna utente_id impostata come NOT NULL';
  END IF;
END $$;

-- ============================================
-- STEP 4: Rimuovi la foreign key e la colonna operatore_id
-- ============================================

-- Rimuovi la foreign key constraint se esiste
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'rapportini'::regclass
    AND confrelid = 'operatori'::regclass
    AND contype = 'f'
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE rapportini DROP CONSTRAINT ' || constraint_name;
    RAISE NOTICE 'Foreign key constraint % rimossa', constraint_name;
  END IF;
END $$;

-- Rimuovi la colonna operatore_id
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
-- STEP 5: Aggiorna gli indici
-- ============================================

-- Rimuovi vecchio indice su operatore_id se esiste
DROP INDEX IF EXISTS idx_rapportini_operatore;

-- Crea nuovo indice su utente_id
CREATE INDEX IF NOT EXISTS idx_rapportini_utente ON rapportini(utente_id);

-- ============================================
-- STEP 6: Rimuovi trigger e policy su operatori (opzionale)
-- ============================================

-- Rimuovi trigger su operatori se esiste
DROP TRIGGER IF EXISTS update_operatori_updated_at ON operatori;

-- Rimuovi policy su operatori se esiste
DROP POLICY IF EXISTS "Enable all operations for operatori" ON operatori;

-- ============================================
-- STEP 7: (OPZIONALE) Rimuovi la tabella operatori
-- ============================================
-- Scommenta queste righe se vuoi eliminare completamente la tabella operatori
-- ATTENZIONE: Assicurati che tutti i dati siano stati migrati prima!

-- DROP TABLE IF EXISTS operatori CASCADE;

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

