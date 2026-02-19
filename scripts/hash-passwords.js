/**
 * Script per hashare le password degli utenti esistenti
 * 
 * Utilizzo:
 * 1. Configura le variabili d'ambiente nel file .env.local o passa come variabili d'ambiente
 * 2. Esegui: node scripts/hash-passwords.js
 * 
 * ATTENZIONE: Questo script aggiorna le password nel database!
 */

// Carica .env e .env.local (dotenv richiesto: npm install dotenv)
try {
  require('dotenv').config({ path: '.env' });
  require('dotenv').config({ path: '.env.local' }); // override con .env.local
} catch (e) {
  console.warn('dotenv non installato: npm install dotenv');
}

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const appEnv = (process.env.APP_ENV || 'PROD').toUpperCase() === 'TEST' ? 'TEST' : 'PROD';
const supabaseUrl = appEnv === 'TEST'
  ? (process.env.NEXT_PUBLIC_SUPABASE_URL_TEST || process.env.NEXT_PUBLIC_SUPABASE_URL)
  : (process.env.NEXT_PUBLIC_SUPABASE_URL_PROD || process.env.NEXT_PUBLIC_SUPABASE_URL);
// Usa SERVICE_ROLE_KEY per bypassare RLS (anon key non può leggere utenti senza JWT)
const supabaseKey = appEnv === 'TEST'
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY_TEST || process.env.SUPABASE_SERVICE_ROLE_KEY)
  : (process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl || !supabaseKey) {
  console.error(`Errore: Configura SUPABASE_SERVICE_ROLE_KEY e URL per ambiente ${appEnv} in .env o .env.local`);
  process.exit(1);
}

console.log(`Ambiente: ${appEnv} (${supabaseUrl})`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function hashPasswords() {
  try {
    console.log('Recupero utenti dal database...');
    
    // Recupera tutti gli utenti
    const { data: utenti, error: fetchError } = await supabase
      .from('utenti')
      .select('id, username, password_hash');
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!utenti || utenti.length === 0) {
      console.log('Nessun utente trovato nel database.');
      return;
    }
    
    console.log(`Trovati ${utenti.length} utente/i.`);
    
    for (const utente of utenti) {
      // Salta se la password è già hashata (inizia con $2a$, $2b$, $2x$ o $2y$)
      if (utente.password_hash && utente.password_hash.match(/^\$2[abxy]\$/)) {
        console.log(`✓ ${utente.username}: password già hashata, salto.`);
        continue;
      }
      
      // Se la password è vuota o null, salta
      if (!utente.password_hash) {
        console.log(`⚠ ${utente.username}: password mancante, salto.`);
        continue;
      }
      
      // Hasha la password
      console.log(`Hashando password per ${utente.username}...`);
      const hashedPassword = await bcrypt.hash(utente.password_hash, 10);
      
      // Aggiorna nel database
      const { error: updateError } = await supabase
        .from('utenti')
        .update({ password_hash: hashedPassword })
        .eq('id', utente.id);
      
      if (updateError) {
        console.error(`✗ Errore aggiornando ${utente.username}:`, updateError.message);
      } else {
        console.log(`✓ ${utente.username}: password hashata con successo.`);
      }
    }
    
    console.log('\nProcesso completato!');
  } catch (error) {
    console.error('Errore durante il processo:', error);
    process.exit(1);
  }
}

// Esegui lo script
hashPasswords();

