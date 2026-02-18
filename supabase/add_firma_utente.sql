-- Aggiunge la firma personale nella tabella utenti
ALTER TABLE utenti
ADD COLUMN IF NOT EXISTS firma TEXT;
