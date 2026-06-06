# AGENTS.md

Guidance for AI agents working in this repository.

## Cursor Cloud specific instructions

### Product overview

**Bitora** (`rapportini-stufe`) is a Next.js 16 full-stack app for managing field-service intervention reports on pellet/wood stoves. Runtime data access is **Prisma → PostgreSQL** (the `supabase/` folder is legacy SQL only).

### Services

| Service | Required? | Notes |
|---------|-----------|-------|
| PostgreSQL 14+ | **Yes** | Primary datastore |
| `npm run dev` (port 3000) | **Yes** | Next.js app + REST API |
| Email (Resend/SMTP) | No | Password reset emails fail gracefully without it |
| Docker Compose | No | Optional; Docker may not be available in Cloud Agent VMs |

### First-time / fresh VM setup

1. **PostgreSQL** — If not running, install and start locally (Docker is often unavailable in Cloud VMs):

   ```bash
   sudo apt-get install -y postgresql postgresql-contrib
   sudo pg_ctlcluster 16 main start
   ```

   Create a dev database/user (once per VM), e.g. user `bitora` / password `devpassword` / database `bitora`.

2. **Environment** — Copy `.env.example` → `.env` and set at minimum:
   - `POSTGRES_HOST=localhost`, `POSTGRES_PORT=5432`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
   - `POSTGRES_SSLMODE=disable` for local Postgres
   - `JWT_SECRET` (≥32 characters)
   - `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` for bootstrap

3. **Database bootstrap** (first run or after schema changes):

   ```bash
   npm run db:bootstrap
   ```

   This verifies DB connectivity, runs `prisma db push`, and seeds the admin user when `SEED_ADMIN_PASSWORD` is set.

4. **Start dev server** (use tmux for long-running processes):

   ```bash
   npm run dev
   ```

   App: `http://localhost:3000` — Health: `GET /api/health`

### Standard commands

See `package.json` scripts and `README.md`. Quick reference:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build (validates TypeScript) |
| `npm run lint` | ESLint via Next.js — **currently broken** (no `eslint.config.*`; `next lint` errors) |
| `npm test -- --run` | Vitest unit tests (no DB required; some pre-existing failures in drafts/validation tests) |
| `npm run db:bootstrap` | DB connect + push schema + seed admin |

### Auth and roles (important for E2E demos)

- Login API: `POST /api/auth/login` with `{ username, password, org_id: "default" }`
- Seeded admin defaults: `admin` / value of `SEED_ADMIN_PASSWORD` in `.env`
- **Only `operatore` role users can create rapportini** via the UI; `admin` is for dashboard/user management. For rapportino creation demos, register or seed an `operatore` user.

### Gotchas

- `.env` is gitignored — agents must create it from `.env.example` on fresh VMs.
- PostgreSQL does not auto-start on all Cloud VMs; run `sudo pg_ctlcluster 16 main start` if `pg_isready` fails.
- `npm run test:e2e` references Playwright but `@playwright/test` is not in `devDependencies`.
