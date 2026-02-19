/**
 * Configurazione ambienti TEST e PROD.
 * Imposta APP_ENV=TEST o APP_ENV=PROD per commutare tra i due database.
 */

export type AppEnv = 'TEST' | 'PROD';

const rawEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || 'PROD';
export const APP_ENV: AppEnv = rawEnv === 'TEST' ? 'TEST' : 'PROD';

function getSupabaseConfig() {
  if (APP_ENV === 'TEST') {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_TEST || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_TEST || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY_TEST || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    };
  }
  // PROD
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_PROD || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

export const supabaseConfig = getSupabaseConfig();

export function isTestEnv(): boolean {
  return APP_ENV === 'TEST';
}

export function isProdEnv(): boolean {
  return APP_ENV === 'PROD';
}
