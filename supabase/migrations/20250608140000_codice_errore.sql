ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS codice_errore VARCHAR(20);
