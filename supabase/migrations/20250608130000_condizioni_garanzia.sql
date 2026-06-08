ALTER TABLE IF EXISTS public.rapportini
  ADD COLUMN IF NOT EXISTS presa_visione_condizioni_garanzia BOOLEAN DEFAULT false;
