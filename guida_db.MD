# Guida Database

## Architettura

- **Database:** PostgreSQL (proprietario / VPS / Docker)
- **ORM:** Prisma (`lib/db.ts`, `prisma/schema.prisma`)
- **API:** Next.js App Router (`app/api/**`) — nessun client Supabase JS
- **Auth:** JWT custom (`access_token`, claim `userId`, `ruolo`, `org_id`)
- **Multi-tenant:** campo `org_id` su tabelle business

## Connessione

L'app compone `DATABASE_URL` da `POSTGRES_*` in `.env` (`lib/database-url.ts`).

Script Prisma: `npm run db:push`, `db:migrate`, `db:seed`, `db:bootstrap`.

## Schema

| Fonte | Uso |
|-------|-----|
| `prisma/schema.prisma` | Source of truth per Prisma |
| `prisma/migrations/` | Migrazioni versionate |
| `supabase/schema.sql` | DDL completo + RLS (esecuzione manuale) |
| `supabase/migrations/*.sql` | Alter incrementali idempotenti |

## Tabelle principali

- `utenti` — operatori/admin, `password_hash`, `ruolo`, `org_id`
- `clienti` — anagrafica per tenant
- `rapportini` — interventi, FK su utente e cliente
- `organizzazioni` — impostazioni azienda (logo, P.IVA)
- `marche`, `modelli`, `materiali` — catalogo tecnico
- `audit_log` — log azioni sensibili

## Controllo accessi

RLS opzionale su Postgres (`supabase/schema.sql`). Controllo principale lato API + middleware JWT.

## Setup nuovo DB

1. Crea database `rapportini_eva` sul server Postgres
2. Compila `.env` con `POSTGRES_*`
3. `npm run db:bootstrap` oppure `db:push` + `db:seed`
4. (Opzionale) Esegui SQL RLS da `supabase/migrations/` in ordine cronologico

## Health

`GET /api/health` — verifica connessione DB e configurazione JWT.
