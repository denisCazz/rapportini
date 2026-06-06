-- CreateTable
CREATE TABLE "utenti" (
    "id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL DEFAULT 'default',
    "username" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "ruolo" VARCHAR(20) NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "cognome" VARCHAR(255) NOT NULL,
    "telefono" VARCHAR(50),
    "email" VARCHAR(255),
    "qualifica" VARCHAR(255),
    "firma" TEXT,
    "attivo" BOOLEAN DEFAULT true,
    "ultimo_accesso" TIMESTAMPTZ(6),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utenti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clienti" (
    "id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL DEFAULT 'default',
    "nome" VARCHAR(255) NOT NULL,
    "cognome" VARCHAR(255) NOT NULL,
    "ragione_sociale" VARCHAR(255),
    "indirizzo" VARCHAR(500) NOT NULL,
    "citta" VARCHAR(255) NOT NULL,
    "cap" VARCHAR(10) NOT NULL,
    "telefono" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "partita_iva" VARCHAR(50),
    "codice_fiscale" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clienti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapportini" (
    "id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL DEFAULT 'default',
    "utente_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "data_intervento" DATE NOT NULL,
    "ora_intervento" TIME(6) NOT NULL,
    "tipo_stufa" VARCHAR(20) NOT NULL,
    "marca" VARCHAR(255) NOT NULL,
    "modello" VARCHAR(255) NOT NULL,
    "numero_serie" VARCHAR(255),
    "tipo_intervento" VARCHAR(255) NOT NULL,
    "descrizione" TEXT NOT NULL,
    "materiali_utilizzati" TEXT,
    "note" TEXT,
    "firma_operatore" TEXT,
    "firma_cliente" TEXT,
    "data_creazione" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rapportini_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizzazioni" (
    "org_id" VARCHAR(100) NOT NULL,
    "nome_azienda" VARCHAR(255),
    "logo" TEXT,
    "indirizzo" VARCHAR(500),
    "partita_iva" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizzazioni_pkey" PRIMARY KEY ("org_id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marche" (
    "id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL DEFAULT 'default',
    "nome" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelli" (
    "id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL DEFAULT 'default',
    "marca_id" UUID NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modelli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiali" (
    "id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL DEFAULT 'default',
    "modello_id" UUID NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "descrizione" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiali_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL DEFAULT 'default',
    "user_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "resource" VARCHAR(128),
    "details" JSONB,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_utenti_org_id_username" ON "utenti"("org_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "unique_cliente" ON "clienti"("org_id", "nome", "cognome", "telefono");

-- CreateIndex
CREATE INDEX "idx_rapportini_cliente" ON "rapportini"("cliente_id");

-- CreateIndex
CREATE INDEX "idx_rapportini_utente" ON "rapportini"("utente_id");

-- CreateIndex
CREATE INDEX "idx_rapportini_data" ON "rapportini"("data_intervento");

-- CreateIndex
CREATE INDEX "idx_rapportini_tipo_stufa" ON "rapportini"("tipo_stufa");

-- CreateIndex
CREATE INDEX "idx_rapportini_org_id" ON "rapportini"("org_id");

-- CreateIndex
CREATE INDEX "idx_rapportini_org_utente" ON "rapportini"("org_id", "utente_id");

-- CreateIndex
CREATE INDEX "idx_rapportini_org_data" ON "rapportini"("org_id", "data_intervento");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_expires" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_marche_nome" ON "marche"("nome");

-- CreateIndex
CREATE INDEX "idx_marche_org_id" ON "marche"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "marche_org_id_nome_key" ON "marche"("org_id", "nome");

-- CreateIndex
CREATE INDEX "idx_modelli_marca" ON "modelli"("marca_id");

-- CreateIndex
CREATE INDEX "idx_modelli_org_id" ON "modelli"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "modelli_org_id_marca_id_nome_key" ON "modelli"("org_id", "marca_id", "nome");

-- CreateIndex
CREATE INDEX "idx_materiali_modello" ON "materiali"("modello_id");

-- CreateIndex
CREATE INDEX "idx_materiali_org_id" ON "materiali"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "materiali_org_id_modello_id_nome_key" ON "materiali"("org_id", "modello_id", "nome");

-- CreateIndex
CREATE INDEX "audit_log_org_id_created_at_idx" ON "audit_log"("org_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- AddForeignKey
ALTER TABLE "rapportini" ADD CONSTRAINT "rapportini_utente_id_fkey" FOREIGN KEY ("utente_id") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapportini" ADD CONSTRAINT "rapportini_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clienti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "utenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelli" ADD CONSTRAINT "modelli_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marche"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiali" ADD CONSTRAINT "materiali_modello_id_fkey" FOREIGN KEY ("modello_id") REFERENCES "modelli"("id") ON DELETE CASCADE ON UPDATE CASCADE;
