#!/bin/sh
# Uso: BACKUP_FILE=/backups/bitora_XXX.dump ./scripts/restore.sh
set -e
if [ -z "$BACKUP_FILE" ]; then
  echo "Imposta BACKUP_FILE=/path/to.dump"
  exit 1
fi
USER="${POSTGRES_USER:-bitora}"
DB="${POSTGRES_DB:-bitora}"
HOST="${PGHOST:-postgres}"
export PGPASSWORD
pg_restore -h "$HOST" -U "$USER" -d "$DB" --no-owner --clean --if-exists "$BACKUP_FILE"
