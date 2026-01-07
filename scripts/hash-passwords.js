/**
 * Script per hashare le password degli utenti esistenti
 * 
 * Utilizzo:
 * 1. Configura le variabili d'ambiente nel file .env.local o passa come variabili d'ambiente
 * 2. Esegui: node scripts/hash-passwords.js
 * 
 * ATTENZIONE: Questo script aggiorna le password nel database!
 */

// Prova a caricare dotenv se disponibile, altrimenti usa le variabili d'ambiente
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv non disponibile, usa le variabili d'ambiente direttamente
}

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Errore: Configura NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nel file .env.local');
  process.exit(1);
}

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

