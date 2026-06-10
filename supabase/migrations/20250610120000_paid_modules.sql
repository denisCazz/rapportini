-- Catalogo moduli a pagamento
CREATE TABLE IF NOT EXISTS public.moduli (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  descrizione TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attivazione moduli per utente (per tecnico)
CREATE TABLE IF NOT EXISTS public.utente_moduli (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(100) NOT NULL DEFAULT 'default',
  utente_id UUID NOT NULL REFERENCES public.utenti(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES public.moduli(id) ON DELETE CASCADE,
  attivo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_utente_moduli_utente_modulo UNIQUE (utente_id, modulo_id)
);

CREATE INDEX IF NOT EXISTS idx_utente_moduli_org_id ON public.utente_moduli(org_id);
CREATE INDEX IF NOT EXISTS idx_utente_moduli_utente_id ON public.utente_moduli(utente_id);

-- Seed moduli (idempotente)
INSERT INTO public.moduli (code, nome, descrizione)
VALUES
  (
    'pianificazione_interventi',
    'Pianificazione interventi',
    'Calendario e pianificazione degli interventi tecnici'
  ),
  (
    'assegnazione_lavori',
    'Assegnazione lavori ai tecnici',
    'Assegna e gestisci i lavori per ogni tecnico'
  ),
  (
    'notifiche_scadenze',
    'Notifiche scadenze manutenzioni',
    'Avvisi automatici per le scadenze di manutenzione'
  )
ON CONFLICT (code) DO NOTHING;
