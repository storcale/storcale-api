#!/bin/bash
set -e


APP_DIR="/home/storcale/storcale-api"
SRC="$APP_DIR/access.log"
BACKUP_DIR="$APP_DIR/backups/access-log"
RETENTION_DAYS=15


mkdir -p "$BACKUP_DIR"

if [ ! -s "$SRC" ]; then
    echo "$(date -Is) skip: $SRC missing or empty"
    exit 0
fi

DATE=$(date +%F)
DEST="$BACKUP_DIR/access-$DATE.log"

cp "$SRC" "$DEST"
gzip -f "$DEST"

# prune old backups
find "$BACKUP_DIR" -name 'access-*.log.gz' -mtime +"$RETENTION_DAYS" -delete

echo "$(date -Is) backed up $SRC -> $DEST.gz"