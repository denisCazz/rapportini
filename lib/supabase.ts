import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/env';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = supabaseConfig;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Set NEXT_PUBLIC_SUPABASE_URL_* and NEXT_PUBLIC_SUPABASE_ANON_KEY_* per ambiente (TEST/PROD).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

