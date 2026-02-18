-- Aggiunge la firma operatore ai rapportini (retrofit ambienti esistenti)
ALTER TABLE rapportini
ADD COLUMN IF NOT EXISTS firma_operatore TEXT;
