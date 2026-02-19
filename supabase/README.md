# Supabase – Database

## Nuovo database

Esegui **solo** `schema.sql` nel SQL Editor di Supabase. Crea tutte le tabelle, indici e RLS.

## Migrazioni (database esistenti)

Gli altri file SQL servono solo per aggiornare database già in uso:

- `migrate_operatori_to_utenti.sql` – Migrazione da vecchio schema operatori → utenti
- `alter_utenti.sql` – Aggiunge telefono, qualifica, firma a utenti
- `ALTER_TABELLE.sql` – Migrazione operatore_id → utente_id
- `ALTER_DATABASE.sql` – Aggiornamenti vari

Per un nuovo progetto usa solo `schema.sql`.
