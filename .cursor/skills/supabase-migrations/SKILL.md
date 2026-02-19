---
name: supabase-migrations
description: Writes idempotent Supabase/PostgreSQL migrations using ALTER statements. Use when updating existing databases, adding columns, indexes, RLS policies, or creating migration files for schema changes.
---

# Supabase Database Migrations

## Quick Start

When writing migrations for an existing database:

1. Use `ALTER TABLE IF EXISTS` for table modifications
2. Use `ADD COLUMN IF NOT EXISTS` (Postgres 9.6+)
3. Use `CREATE INDEX IF NOT EXISTS` for indexes
4. Use `DROP ... IF EXISTS` before `CREATE` for triggers/policies
5. Use `CREATE OR REPLACE` for functions

## Idempotent Patterns

### Add column
```sql
ALTER TABLE IF EXISTS public.utenti
  ADD COLUMN IF NOT EXISTS qualifica VARCHAR(255);
```

### Add index
```sql
CREATE INDEX IF NOT EXISTS idx_rapportini_org_data
  ON rapportini(org_id, data_intervento DESC);
```

### Trigger (drop first)
```sql
DROP TRIGGER IF EXISTS update_utenti_updated_at ON utenti;
CREATE TRIGGER update_utenti_updated_at
  BEFORE UPDATE ON utenti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### RLS policy (drop first)
```sql
DROP POLICY IF EXISTS "utenti_org_select" ON utenti;
CREATE POLICY "utenti_org_select" ON utenti
  FOR SELECT USING (org_id = (SELECT public.current_org_id()));
```

## File Structure

Migrations go in `supabase/migrations/` with timestamp prefix:
```
supabase/migrations/
  20250219120000_add_missing_columns.sql
  20250219120001_add_indexes.sql
```

## Best Practices

- **One concern per migration**: Split schema changes into logical units
- **Test locally**: Run `supabase db reset` before deploying
- **Lock timeout**: Add `SET lock_timeout = '5s';` if lock errors occur
- **Column order**: Append new columns at end to avoid messy diffs
