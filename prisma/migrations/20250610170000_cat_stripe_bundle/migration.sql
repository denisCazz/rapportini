-- Abbonamento bundle moduli CAT (Stripe)
ALTER TABLE "organizzazioni" ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR(255);
ALTER TABLE "organizzazioni" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" VARCHAR(255);
ALTER TABLE "organizzazioni" ADD COLUMN IF NOT EXISTS "stripe_subscription_status" VARCHAR(50);
ALTER TABLE "organizzazioni" ADD COLUMN IF NOT EXISTS "licensed_operator_slots" INTEGER;
