-- CAT (Centro Assistenza Tecnica): tipo organizzazione e partita IVA univoca
ALTER TABLE "organizzazioni" ADD COLUMN IF NOT EXISTS "tipo" VARCHAR(20) NOT NULL DEFAULT 'default';

CREATE UNIQUE INDEX IF NOT EXISTS "uq_organizzazioni_partita_iva"
  ON "organizzazioni" ("partita_iva")
  WHERE "partita_iva" IS NOT NULL AND "partita_iva" <> '';
