-- CreateTable
CREATE TABLE "moduli" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descrizione" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moduli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utente_moduli" (
    "id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL DEFAULT 'default',
    "utente_id" UUID NOT NULL,
    "modulo_id" UUID NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utente_moduli_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moduli_code_key" ON "moduli"("code");

-- CreateIndex
CREATE INDEX "idx_utente_moduli_org_id" ON "utente_moduli"("org_id");

-- CreateIndex
CREATE INDEX "idx_utente_moduli_utente_id" ON "utente_moduli"("utente_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_utente_moduli_utente_modulo" ON "utente_moduli"("utente_id", "modulo_id");

-- AddForeignKey
ALTER TABLE "utente_moduli" ADD CONSTRAINT "utente_moduli_utente_id_fkey" FOREIGN KEY ("utente_id") REFERENCES "utenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utente_moduli" ADD CONSTRAINT "utente_moduli_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "moduli"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed moduli
INSERT INTO "moduli" ("id", "code", "nome", "descrizione")
VALUES
  (gen_random_uuid(), 'pianificazione_interventi', 'Pianificazione interventi', 'Calendario e pianificazione degli interventi tecnici'),
  (gen_random_uuid(), 'assegnazione_lavori', 'Assegnazione lavori ai tecnici', 'Assegna e gestisci i lavori per ogni tecnico'),
  (gen_random_uuid(), 'notifiche_scadenze', 'Notifiche scadenze manutenzioni', 'Avvisi automatici per le scadenze di manutenzione')
ON CONFLICT ("code") DO NOTHING;
