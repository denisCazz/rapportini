# Migrazione dati PostgreSQL

## Nuovo database proprietario

```bash
# .env
POSTGRES_HOST=212.227.193.249
POSTGRES_PORT=60001
POSTGRES_USER=postgres
POSTGRES_PASSWORD=***
POSTGRES_DB=rapportini_eva

npm run db:bootstrap
```

## Export da database esistente

```bash
pg_dump "postgresql://user:pass@host:port/dbname" --no-owner --no-acl -Fc -f backup.dump
```

## Import su nuovo server

```bash
pg_restore -d "postgresql://postgres:PASS@212.227.193.249:60001/rapportini_eva" \
  --no-owner --no-acl --clean --if-exists backup.dump
```

## Verifica conteggi

```bash
psql "$DATABASE_URL" -c "SELECT 'utenti' AS t, COUNT(*) FROM utenti UNION ALL SELECT 'clienti', COUNT(*) FROM clienti UNION ALL SELECT 'rapportini', COUNT(*) FROM rapportini;"
```

## Prisma dopo import

```bash
npm run db:generate
npm run db:migrate
```

## Cutover app

1. Aggiorna `POSTGRES_*` in `.env` produzione
2. Riavvia app / redeploy
3. Verifica `GET /api/health`
4. Test login admin
