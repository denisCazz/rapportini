# Bitora - Gestione Rapportini Stufe

Sistema professionale per la gestione degli interventi su stufe a pellet e legno, con PostgreSQL (Prisma) e pannello admin per statistiche.

## Funzionalità

- Gestione completa rapportini di intervento
- PostgreSQL via Prisma ORM
- Pannello admin con statistiche raggruppate per cliente
- UI/UX moderna, dark mode, PWA
- Esportazione PDF
- Ricerca e filtri avanzati
- Bozze automatiche nel form rapportino

## Prerequisiti

- Node.js 18+
- PostgreSQL 14+ (locale, VPS o cloud)

## Installazione

1. **Clona e installa:**

```bash
npm install
```

2. **Configura ambiente** — copia `.env.example` in `.env` e compila:

```env
POSTGRES_HOST=212.227.193.249
POSTGRES_PORT=60001
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=rapportini_eva
JWT_SECRET=your-secret-min-32-chars
```

3. **Bootstrap database:**

```bash
npm run db:generate
npm run db:bootstrap    # push schema + seed admin (se SEED_ADMIN_PASSWORD impostata)
# oppure manualmente:
npm run db:push
npm run db:seed
```

4. **Avvia:**

```bash
npm run dev
```

App su [http://localhost:3000](http://localhost:3000)

Health check: `GET /api/health`

## Struttura

```
rapportini/
├── app/api/          # API REST (Prisma)
├── app/admin/        # Dashboard admin
├── components/       # UI React + shadcn
├── lib/db.ts         # Prisma client
├── prisma/           # schema + migrations
└── supabase/         # SQL DDL/RLS (nome storico)
```

## Database

Schema Prisma in `prisma/schema.prisma`. Migrazioni in `prisma/migrations/`.

Tabelle principali: `utenti`, `clienti`, `rapportini`, `organizzazioni`, `marche`, `modelli`, `materiali`.

Script SQL aggiuntivi (RLS, trigger): `supabase/schema.sql` e `supabase/migrations/`.

## Autenticazione

JWT custom con cookie `access_token` / `refresh_token`.

Ruoli: **admin** (statistiche, utenti) e **operatore** (rapportini).

Primo admin: configurare `SEED_ADMIN_USERNAME` e `SEED_ADMIN_PASSWORD` in `.env`, poi `npm run db:seed`.

## Docker

**DB esterno** (es. 212.227.193.249): imposta `POSTGRES_*` in `.env` e avvia solo app:

```bash
docker compose up app caddy
```

**Postgres locale** (sviluppo):

```bash
docker compose --profile local-db up
```

## Script utili

| Script | Descrizione |
|--------|-------------|
| `npm run db:push` | Sincronizza schema Prisma |
| `npm run db:migrate` | Applica migrazioni |
| `npm run db:seed` | Seed admin/org |
| `npm run db:bootstrap` | Test connessione + push + seed |
| `npm run test` | Test unitari (Vitest) |

## Tecnologie

- Next.js 16, React 19, TypeScript
- Prisma 5, PostgreSQL
- Tailwind CSS, shadcn/ui
- jose (JWT), bcryptjs, jsPDF

## Licenza

**Prodotto:** Bitora Software Gestionale Stufe — © Bitora.it
