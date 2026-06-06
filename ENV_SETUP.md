# Configurazione variabili d'ambiente

Copia `.env.example` in `.env` o `.env.local` (entrambi gitignored).

## Ambiente

```env
APP_ENV=PROD
NEXT_PUBLIC_APP_ENV=PROD
```

`APP_ENV=TEST` usa `POSTGRES_TEST_*` o `DATABASE_URL_TEST` se impostati.

## Database PostgreSQL

**Opzione A — variabili separate (consigliata):**

```env
POSTGRES_HOST=212.227.193.249
POSTGRES_PORT=60001
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
POSTGRES_DB=rapportini_eva
POSTGRES_SCHEMA=public
POSTGRES_SSLMODE=prefer
```

Se la connessione fallisce, prova `POSTGRES_SSLMODE=disable` o `require`.

**Opzione B — URL esplicito:**

```env
DATABASE_URL=postgresql://postgres:PASSWORD@host:port/rapportini_eva?schema=public
```

## Auth

```env
JWT_SECRET=   # minimo 32 caratteri — openssl rand -base64 32
DEFAULT_ORG_ID=default
NEXT_PUBLIC_DEFAULT_ORG_ID=default
```

## App

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
FORCE_SECURE_COOKIES=true   # solo produzione HTTPS
```

## Seed admin (primo setup)

```env
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=
SEED_ORG_NAME=Bitora
```

Poi: `npm run db:seed`

## Email (opzionale)

`RESEND_API_KEY` oppure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

## Sicurezza

- Non committare `.env` con segreti reali
- Ruota `JWT_SECRET` in produzione
- Usa password forti per Postgres e admin
