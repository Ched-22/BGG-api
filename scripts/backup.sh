#!/usr/bin/env bash
# Backup do Postgres (e opcionalmente uploads/). Uso: DATABASE_URL=... ./scripts/backup.sh [dir]
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL não definida}"
OUT_DIR="${1:-backups}"
KEEP="${BACKUP_KEEP:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/bgg-db-$STAMP.dump"

pg_dump --format=custom --no-owner --no-privileges --file="$FILE" "$DATABASE_URL"
[ -s "$FILE" ] || { echo "dump vazio" >&2; exit 1; }
pg_restore --list "$FILE" >/dev/null   # valida que o dump é legível

if [ -d uploads ]; then
  tar -czf "$OUT_DIR/bgg-uploads-$STAMP.tar.gz" uploads
fi

# mantém só os últimos $KEEP de cada tipo
for pattern in 'bgg-db-*.dump' 'bgg-uploads-*.tar.gz'; do
  { ls -1t "$OUT_DIR"/$pattern 2>/dev/null || true; } | tail -n +$((KEEP + 1)) | xargs -r rm -f
done

echo "Backup ok: $FILE"
