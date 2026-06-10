-- Stripe subscription fields for paid modules

ALTER TABLE IF EXISTS utenti
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

ALTER TABLE IF EXISTS utente_moduli
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

ALTER TABLE IF EXISTS utente_moduli
  ADD COLUMN IF NOT EXISTS stripe_subscription_status VARCHAR(50);

ALTER TABLE IF EXISTS utente_moduli
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_utente_moduli_stripe_subscription
  ON utente_moduli(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
