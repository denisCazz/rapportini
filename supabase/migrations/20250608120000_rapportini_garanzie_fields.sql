-- Idempotent migration: campi rapportini garanzie e dati cliente estesi

ALTER TABLE IF EXISTS public.clienti
  ADD COLUMN IF NOT EXISTS via VARCHAR(255);

ALTER TABLE IF EXISTS public.clienti
  ADD COLUMN IF NOT EXISTS numero_civico VARCHAR(20);

ALTER TABLE IF EXISTS public.clienti
  ADD COLUMN IF NOT EXISTS provincia VARCHAR(10);

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS data_richiesta DATE;

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS tipologia_intervento VARCHAR(50);

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS data_acquisto DATE;

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS rivenditore VARCHAR(255);

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS motivo_chiamata TEXT;

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS verifiche TEXT;

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS installazione_eseguita_da VARCHAR(255);

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS spiegata_manutenzione VARCHAR(5);

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS impianto_elettrico VARCHAR(5);

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS condotto_fumi VARCHAR(5);

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS installazione_uni10683 VARCHAR(5);

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS controllo_parametri VARCHAR(5);

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS tipologia_installazione VARCHAR(50);

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS note_installazione TEXT;

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS prossimo_intervento DATE;

ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS firma_cliente_privacy TEXT;
