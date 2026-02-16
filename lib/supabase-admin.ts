import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let warnedMissingEnv = false;

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (!warnedMissingEnv) {
      console.warn(
        'Supabase service client non configurato. Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY per operazioni server su tabelle protette da RLS.'
      );
      warnedMissingEnv = true;
    }

    throw new Error('Configurazione server mancante: imposta SUPABASE_SERVICE_ROLE_KEY nel file .env.local');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
