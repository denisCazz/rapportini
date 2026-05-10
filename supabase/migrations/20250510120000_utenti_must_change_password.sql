-- Idempotent: colonna obbligo cambio password (seed admin/operatore)
ALTER TABLE IF EXISTS utenti
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Utenti seed noti: forza cambio password se ancora presenti con hash di default documentato
UPDATE utenti
SET must_change_password = true
WHERE org_id = 'default'
  AND username IN ('admin', 'operatore')
  AND (password_hash = 'admin123' OR password_hash = 'operatore123');
