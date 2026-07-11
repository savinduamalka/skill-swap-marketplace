#!/bin/bash
# Sync Prisma schema from skill-swap (source of truth) to socket-server
# Run this after making any schema changes in skill-swap/prisma/schema.prisma

SOURCE="skill-swap/prisma/schema.prisma"
DEST="socket-server/prisma/schema.prisma"

if [ ! -f "$SOURCE" ]; then
  echo "❌ Source schema not found: $SOURCE"
  exit 1
fi

cp "$SOURCE" "$DEST"
echo "✅ Schema synced: $SOURCE → $DEST"

# Regenerate Prisma client for socket-server
cd socket-server && npx prisma generate
echo "✅ Socket server Prisma client regenerated"
