-- CreateTable
CREATE TABLE "rapportino_immagini" (
    "id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL DEFAULT 'default',
    "rapportino_id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "bucket" VARCHAR(100) NOT NULL DEFAULT 'rapportini-active',
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT,
    "caption" TEXT,
    "uploaded_by" UUID,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rapportino_immagini_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_rapportino_immagini_rapportino" ON "rapportino_immagini"("rapportino_id");

-- CreateIndex
CREATE INDEX "idx_rapportino_immagini_org" ON "rapportino_immagini"("org_id");

-- CreateIndex
CREATE INDEX "idx_rapportino_immagini_archive" ON "rapportino_immagini"("archived_at", "created_at");

-- AddForeignKey
ALTER TABLE "rapportino_immagini" ADD CONSTRAINT "rapportino_immagini_rapportino_id_fkey" FOREIGN KEY ("rapportino_id") REFERENCES "rapportini"("id") ON DELETE CASCADE ON UPDATE CASCADE;
