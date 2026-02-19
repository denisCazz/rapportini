-- Tabella per token di reset password
-- Esegui in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
