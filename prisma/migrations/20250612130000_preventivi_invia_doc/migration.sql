-- Preventivi: rendi opzionali tutti i campi (nessun campo obbligatorio)
ALTER TABLE IF EXISTS preventivi ALTER COLUMN cliente_id DROP NOT NULL;
ALTER TABLE IF EXISTS preventivi ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(255);
ALTER TABLE IF EXISTS preventivi ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(255);
ALTER TABLE IF EXISTS preventivi ADD COLUMN IF NOT EXISTS titolo VARCHAR(255);

ALTER TABLE IF EXISTS preventivo_righe ALTER COLUMN descrizione DROP NOT NULL;
ALTER TABLE IF EXISTS preventivo_righe ALTER COLUMN prezzo_unitario SET DEFAULT 0;

-- Invia documentazione: supporto invio anche dei preventivi
ALTER TABLE IF EXISTS report_cliente_invii ALTER COLUMN rapportino_id DROP NOT NULL;
ALTER TABLE IF EXISTS report_cliente_invii ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(20) NOT NULL DEFAULT 'rapportino';
ALTER TABLE IF EXISTS report_cliente_invii ADD COLUMN IF NOT EXISTS preventivo_id UUID REFERENCES preventivi(id) ON DELETE CASCADE;

-- Rinomina modulo report_cliente -> Invia documentazione
UPDATE moduli
SET nome = 'Invia documentazione',
    descrizione = 'Invia rapportini e preventivi PDF via email al cliente'
WHERE code = 'report_cliente';
