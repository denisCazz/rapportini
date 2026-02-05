# Configurazione Variabili d'Ambiente

Crea un file `.env.local` nella root del progetto con le seguenti variabili:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Configuration (cambia in produzione!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# Email Configuration (opzionale - scegli uno dei due)
# Opzione 1: Resend (consigliato)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Opzione 2: SMTP generico
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@bitora.it
```

## Come ottenere le credenziali Supabase:

1. Vai su [Supabase](https://supabase.com) e accedi al tuo account
2. Crea un nuovo progetto o seleziona un progetto esistente
3. Vai su **Settings** > **API**
4. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Configurazione JWT

La variabile `JWT_SECRET` è usata per firmare i token JWT. In produzione:
- Usa una stringa casuale di almeno 32 caratteri
- Puoi generarla con: `openssl rand -base64 32`
- Non condividere mai questa chiave

## Configurazione Email (opzionale)

### Opzione 1: Resend (consigliato)
1. Registrati su [Resend](https://resend.com)
2. Crea una API key
3. Configura il dominio per l'invio email

### Opzione 2: SMTP generico
Puoi usare qualsiasi provider SMTP (Gmail, SendGrid, Mailgun, etc.)

## Configurazione Database:

Dopo aver configurato le variabili d'ambiente:

1. Vai su **SQL Editor** nel dashboard Supabase
2. Esegui lo script contenuto in `supabase/schema.sql`
3. Esegui lo script `supabase/rls_policies.sql` per le policy di sicurezza
4. Questo creerà tutte le tabelle necessarie con le relazioni corrette

## Note di Sicurezza:

- ⚠️ **NON committare** il file `.env.local` nel repository
- Il file `.env.local` è già incluso nel `.gitignore`
- Usa sempre variabili d'ambiente per le credenziali sensibili
- Cambia sempre le password e le chiavi di default in produzione
