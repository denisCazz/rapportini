import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/env';

const { url: supabaseUrl, serviceRoleKey: supabaseServiceRoleKey } = supabaseConfig;
let warnedMissingEnv = false;

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (!warnedMissingEnv) {
      console.warn(
        'Supabase service client non configurato. Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY per operazioni server su tabelle protette da RLS.'
      );
      warnedMissingEnv = true;
    }

    throw new Error('Configurazione server mancante: imposta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SERVICE_ROLE_KEY_TEST/PROD nel file .env.local');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
