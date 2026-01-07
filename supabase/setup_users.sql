-- Script per hashare le password degli utenti con bcrypt
-- Esegui questo script DOPO aver inserito gli utenti iniziali
-- Le password verranno hashate con bcrypt per maggiore sicurezza

-- NOTA: Questo script deve essere eseguito da un'applicazione Node.js
-- perché Supabase non ha bcrypt nativamente
-- 
-- Puoi eseguire questo script Node.js per hashare le password:
--
-- const bcrypt = require('bcryptjs');
-- const password = 'admin123';
-- bcrypt.hash(password, 10).then(hash => console.log(hash));
--
-- Poi aggiorna manualmente le password_hash nella tabella utenti

-- Oppure usa questa query per aggiornare manualmente (SOLO PER TEST):
-- UPDATE utenti SET password_hash = '$2b$10$...' WHERE username = 'admin';
-- (sostituisci $2b$10$... con l'hash generato da bcrypt)

-- Per ora, le password sono in plaintext per facilitare il setup iniziale
-- Cambiale SUBITO dopo il primo accesso in produzione!

