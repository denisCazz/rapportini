-- Migrazione multi-tenant (idsocieta)
-- Obiettivo: isolamento dati per società con fallback compatibile su tenant 'default'

BEGIN;

-- 1) Aggiunta colonna tenant + backfill
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS idsocieta VARCHAR(100);
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS idsocieta VARCHAR(100);
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS idsocieta VARCHAR(100);
ALTER TABLE marche ADD COLUMN IF NOT EXISTS idsocieta VARCHAR(100);
ALTER TABLE modelli ADD COLUMN IF NOT EXISTS idsocieta VARCHAR(100);
ALTER TABLE materiali ADD COLUMN IF NOT EXISTS idsocieta VARCHAR(100);

UPDATE utenti SET idsocieta = 'default' WHERE idsocieta IS NULL OR btrim(idsocieta) = '';
UPDATE clienti SET idsocieta = 'default' WHERE idsocieta IS NULL OR btrim(idsocieta) = '';
UPDATE marche SET idsocieta = 'default' WHERE idsocieta IS NULL OR btrim(idsocieta) = '';

-- Backfill guidato dalle relazioni per cataloghi e rapportini
UPDATE modelli m
SET idsocieta = COALESCE(ma.idsocieta, 'default')
FROM marche ma
WHERE m.marca_id = ma.id
  AND (m.idsocieta IS NULL OR btrim(m.idsocieta) = '');

UPDATE materiali mt
SET idsocieta = COALESCE(md.idsocieta, 'default')
FROM modelli md
WHERE mt.modello_id = md.id
  AND (mt.idsocieta IS NULL OR btrim(mt.idsocieta) = '');

UPDATE rapportini r
SET idsocieta = COALESCE(u.idsocieta, 'default')
FROM utenti u
WHERE r.utente_id = u.id
  AND (r.idsocieta IS NULL OR btrim(r.idsocieta) = '');

UPDATE modelli SET idsocieta = 'default' WHERE idsocieta IS NULL OR btrim(idsocieta) = '';
UPDATE materiali SET idsocieta = 'default' WHERE idsocieta IS NULL OR btrim(idsocieta) = '';
UPDATE rapportini SET idsocieta = 'default' WHERE idsocieta IS NULL OR btrim(idsocieta) = '';

ALTER TABLE utenti ALTER COLUMN idsocieta SET DEFAULT 'default';
ALTER TABLE clienti ALTER COLUMN idsocieta SET DEFAULT 'default';
ALTER TABLE rapportini ALTER COLUMN idsocieta SET DEFAULT 'default';
ALTER TABLE marche ALTER COLUMN idsocieta SET DEFAULT 'default';
ALTER TABLE modelli ALTER COLUMN idsocieta SET DEFAULT 'default';
ALTER TABLE materiali ALTER COLUMN idsocieta SET DEFAULT 'default';

ALTER TABLE utenti ALTER COLUMN idsocieta SET NOT NULL;
ALTER TABLE clienti ALTER COLUMN idsocieta SET NOT NULL;
ALTER TABLE rapportini ALTER COLUMN idsocieta SET NOT NULL;
ALTER TABLE marche ALTER COLUMN idsocieta SET NOT NULL;
ALTER TABLE modelli ALTER COLUMN idsocieta SET NOT NULL;
ALTER TABLE materiali ALTER COLUMN idsocieta SET NOT NULL;

-- 2) Indici tenant
CREATE INDEX IF NOT EXISTS idx_utenti_idsocieta ON utenti(idsocieta);
CREATE INDEX IF NOT EXISTS idx_clienti_idsocieta ON clienti(idsocieta);
CREATE INDEX IF NOT EXISTS idx_rapportini_idsocieta ON rapportini(idsocieta);
CREATE INDEX IF NOT EXISTS idx_marche_idsocieta ON marche(idsocieta);
CREATE INDEX IF NOT EXISTS idx_modelli_idsocieta ON modelli(idsocieta);
CREATE INDEX IF NOT EXISTS idx_materiali_idsocieta ON materiali(idsocieta);

-- 3) Conversione vincoli unici globali -> tenant-aware
ALTER TABLE utenti DROP CONSTRAINT IF EXISTS utenti_username_key;
ALTER TABLE clienti DROP CONSTRAINT IF EXISTS unique_cliente;
ALTER TABLE clienti DROP CONSTRAINT IF EXISTS clienti_nome_cognome_telefono_key;
ALTER TABLE marche DROP CONSTRAINT IF EXISTS marche_nome_key;
ALTER TABLE modelli DROP CONSTRAINT IF EXISTS modelli_marca_id_nome_key;
ALTER TABLE materiali DROP CONSTRAINT IF EXISTS materiali_modello_id_nome_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_utenti_idsocieta_username
  ON utenti(idsocieta, username);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clienti_idsocieta_nome_cognome_telefono
  ON clienti(idsocieta, nome, cognome, telefono);

CREATE UNIQUE INDEX IF NOT EXISTS uq_marche_idsocieta_nome
  ON marche(idsocieta, nome);

CREATE UNIQUE INDEX IF NOT EXISTS uq_modelli_idsocieta_marca_nome
  ON modelli(idsocieta, marca_id, nome);

CREATE UNIQUE INDEX IF NOT EXISTS uq_materiali_idsocieta_modello_nome
  ON materiali(idsocieta, modello_id, nome);

COMMIT;
