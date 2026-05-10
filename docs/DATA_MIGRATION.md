# Migrazione dati Supabase → Postgres VPS

## 1. Export da Supabase (schema + dati)

Dal progetto Supabase: **Settings → Database → Connection string** (URI mode, postgres).

```bash
export OLD_PG="postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
pg_dump "$OLD_PG" --no-owner --no-acl -Fc -f bitora.dump
```

Oppure solo dati (se schema già applicato con `supabase/schema.sql` + migrazioni):

```bash
pg_dump "$OLD_PG" --data-only --no-owner --no-acl -Fc -f bitora-data.dump
```

## 2. Import sul VPS

```bash
export NEW_PG="postgresql://bitora:PASSWORD@localhost:5432/bitora"
pg_restore -d "$NEW_PG" --no-owner --no-acl --clean --if-exists bitora.dump
```

## 3. Verifica conteggi

```bash
psql "$NEW_PG" -c "SELECT 'utenti' AS t, COUNT(*) FROM utenti UNION ALL SELECT 'clienti', COUNT(*) FROM clienti UNION ALL SELECT 'rapportini', COUNT(*) FROM rapportini;"
```

Confronta con gli stessi `COUNT` sul DB Supabase prima del cutover.

## 4. Prisma sul nuovo DB

Con **URL esplicito**:

```bash
DATABASE_URL="$NEW_PG" npx prisma migrate deploy
DATABASE_URL="$NEW_PG" npx prisma generate
```

Oppure nel repo, con **`POSTGRES_*` nel `.env`** (vedi `.env.example`) senza `DATABASE_URL`:

```bash
npm run db:migrate    # prisma migrate deploy
npm run db:generate # prisma generate
# solo dev/staging se accetti push schema:
# npm run db:push
```

## 5. Variabili app

Imposta **`POSTGRES_HOST`**, **`POSTGRES_PORT`**, **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`**, **`POSTGRES_DB`**, **`POSTGRES_SCHEMA`** nel `.env` (l’app compone l’URL), oppure un override **`DATABASE_URL`** / **`DATABASE_URL_PROD`**. In ogni caso **`JWT_SECRET`** (≥32 caratteri).
