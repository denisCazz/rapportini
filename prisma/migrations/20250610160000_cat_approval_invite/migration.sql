-- Stato CAT, dati fiscali aggiuntivi e token invito operatori
ALTER TABLE "organizzazioni" ADD COLUMN IF NOT EXISTS "codice_fiscale" VARCHAR(16);
ALTER TABLE "organizzazioni" ADD COLUMN IF NOT EXISTS "pec" VARCHAR(255);
ALTER TABLE "organizzazioni" ADD COLUMN IF NOT EXISTS "codice_destinatario_sdi" VARCHAR(7);
ALTER TABLE "organizzazioni" ADD COLUMN IF NOT EXISTS "stato" VARCHAR(20) NOT NULL DEFAULT 'attivo';
ALTER TABLE "organizzazioni" ADD COLUMN IF NOT EXISTS "invite_token" VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_organizzazioni_invite_token"
  ON "organizzazioni" ("invite_token")
  WHERE "invite_token" IS NOT NULL;

-- CAT esistenti restano attivi; i nuovi avranno in_attesa dalla registrazione
UPDATE "organizzazioni" SET "stato" = 'attivo' WHERE "tipo" = 'cat' AND "stato" IS NULL;
