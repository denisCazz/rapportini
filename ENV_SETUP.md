# Configurazione Variabili d'Ambiente

Crea un file `.env.local` nella root del progetto. Vedi `.env.example` per il template completo.

## Ambienti TEST e PROD

L'app supporta due ambienti con database distinti. Imposta `APP_ENV` e `NEXT_PUBLIC_APP_ENV`:

- **`APP_ENV=PROD`** (default) → usa le variabili `*_PROD` o le variabili senza suffisso
- **`APP_ENV=TEST`** → usa le variabili `*_TEST`

```env
# Seleziona ambiente (TEST o PROD)
APP_ENV=PROD
NEXT_PUBLIC_APP_ENV=PROD

# Supabase PROD
NEXT_PUBLIC_SUPABASE_URL_PROD=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD=eyJ...
SUPABASE_SERVICE_ROLE_KEY_PROD=eyJ...

# Supabase TEST (solo se usi APP_ENV=TEST)
NEXT_PUBLIC_SUPABASE_URL_TEST=https://yyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_TEST=eyJ...
SUPABASE_SERVICE_ROLE_KEY_TEST=eyJ...

# JWT Configuration (cambia in produzione!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# Email Configuration (opzionale)
RESEND_API_KEY=re_xxxxxxxxxxxx
# oppure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
```

**Compatibilità**: Se non usi i suffissi `_PROD`/`_TEST`, puoi continuare con le variabili senza suffisso (`NEXT_PUBLIC_SUPABASE_URL`, ecc.) — verranno usate per PROD.

## Come ottenere le credenziali Supabase:

1. Vai su [Supabase](https://supabase.com) e accedi al tuo account
2. Crea un nuovo progetto o seleziona un progetto esistente
3. Vai su **Settings** > **API**
4. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (solo server-side)

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
3. Lo script `supabase/schema.sql` include già le policy RLS
4. Questo creerà tutte le tabelle necessarie con le relazioni corrette

## Note di Sicurezza:

- ⚠️ **NON committare** il file `.env.local` nel repository
- Il file `.env.local` è già incluso nel `.gitignore`
- Usa sempre variabili d'ambiente per le credenziali sensibili
- Cambia sempre le password e le chiavi di default in produzione
