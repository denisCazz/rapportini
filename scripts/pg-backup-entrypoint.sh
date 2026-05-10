#!/bin/sh
# Schedules scripts/backup.sh daily at 03:00 (Alpine busybox crond).
set -e
export PGHOST="${PGHOST:-postgres}"
export POSTGRES_USER="${POSTGRES_USER:-bitora}"
export POSTGRES_DB="${POSTGRES_DB:-bitora}"
export BACKUP_DIR="${BACKUP_DIR:-/backups}"

esc_sq() {
  printf '%s' "$1" | sed "s/'/'\\\\''/g"
}

PW_ESC=$(esc_sq "${POSTGRES_PASSWORD}")
printf "0 3 * * * export PGPASSWORD='%s' PGHOST='%s' POSTGRES_USER='%s' POSTGRES_DB='%s' BACKUP_DIR='%s'; /backup.sh\n" \
  "$PW_ESC" "$PGHOST" "$POSTGRES_USER" "$POSTGRES_DB" "$BACKUP_DIR" >/etc/crontabs/root

exec crond -f -l 8
