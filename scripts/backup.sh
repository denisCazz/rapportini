#!/bin/sh
# Esegui dal container postgres o da host con pg_dump installato.
# Variabili: PGPASSWORD, POSTGRES_USER, POSTGRES_DB (default bitora)
set -e
USER="${POSTGRES_USER:-bitora}"
DB="${POSTGRES_DB:-bitora}"
HOST="${PGHOST:-postgres}"
DIR="${BACKUP_DIR:-/backups}"
STAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$DIR"
export PGPASSWORD
pg_dump -h "$HOST" -U "$USER" -d "$DB" -Fc -f "$DIR/bitora_${STAMP}.dump"
# retention 14 giorni
find "$DIR" -name 'bitora_*.dump' -mtime +14 -delete
echo "Backup OK: $DIR/bitora_${STAMP}.dump"

# Upload opzionale su Cloudflare R2 (se R2_* configurato e tsx disponibile)
if [ -n "${R2_BUCKET_NAME:-}" ] && [ -n "${R2_ACCOUNT_ID:-}" ]; then
  if command -v npx >/dev/null 2>&1; then
    echo "Upload backup su Cloudflare R2..."
    BACKUP_FILE="$DIR/bitora_${STAMP}.dump" npx tsx scripts/backup-cloudflare.ts || echo "WARN: upload R2 fallito (backup locale conservato)"
  else
    echo "WARN: npx non disponibile, skip upload R2"
  fi
fi
