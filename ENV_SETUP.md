# Configurazione Variabili d'Ambiente

Crea un file `.env.local` nella root del progetto con le seguenti variabili:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Come ottenere le credenziali Supabase:

1. Vai su [Supabase](https://supabase.com) e accedi al tuo account
2. Crea un nuovo progetto o seleziona un progetto esistente
3. Vai su **Settings** > **API**
4. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Configurazione Database:

Dopo aver configurato le variabili d'ambiente:

1. Vai su **SQL Editor** nel dashboard Supabase
2. Esegui lo script contenuto in `supabase/schema.sql`
3. Questo creerà tutte le tabelle necessarie con le relazioni corrette

## Note di Sicurezza:

- ⚠️ **NON committare** il file `.env.local` nel repository
- Il file `.env.local` è già incluso nel `.gitignore`
- Usa sempre variabili d'ambiente per le credenziali sensibili

