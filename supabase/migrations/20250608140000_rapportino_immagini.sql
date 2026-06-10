-- Immagini opzionali dei rapportini (storage bucket + archiviazione)
CREATE TABLE IF NOT EXISTS public.rapportino_immagini (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(100) NOT NULL DEFAULT 'default',
  rapportino_id UUID NOT NULL REFERENCES rapportini(id) ON DELETE CASCADE,
  storage_key VARCHAR(512) NOT NULL,
  bucket VARCHAR(100) NOT NULL DEFAULT 'rapportini-active',
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT,
  caption TEXT,
  uploaded_by UUID REFERENCES utenti(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rapportino_immagini_rapportino
  ON rapportino_immagini(rapportino_id);

CREATE INDEX IF NOT EXISTS idx_rapportino_immagini_org
  ON rapportino_immagini(org_id);

CREATE INDEX IF NOT EXISTS idx_rapportino_immagini_archive
  ON rapportino_immagini(archived_at, created_at);
