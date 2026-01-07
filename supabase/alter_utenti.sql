-- Query ALTER per aggiornare la tabella utenti esistente
-- Esegui questo script nella SQL Editor di Supabase se hai già creato le tabelle

-- Aggiungi colonna telefono se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'utenti' AND column_name = 'telefono'
  ) THEN
    ALTER TABLE utenti ADD COLUMN telefono VARCHAR(50);
  END IF;
END $$;

-- Aggiungi colonna qualifica se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'utenti' AND column_name = 'qualifica'
  ) THEN
    ALTER TABLE utenti ADD COLUMN qualifica VARCHAR(255);
  END IF;
END $$;

-- Aggiorna gli utenti esistenti con valori di default se necessario
UPDATE utenti 
SET telefono = '+39 333 1234567' 
WHERE telefono IS NULL AND username = 'operatore';

UPDATE utenti 
SET qualifica = 'Tecnico specializzato' 
WHERE qualifica IS NULL AND username = 'operatore';

-- Verifica che le colonne siano state aggiunte correttamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'utenti'
ORDER BY ordinal_position;

