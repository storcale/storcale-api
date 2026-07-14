#!/bin/bash
set -e

APP_DIR="/storcale/storcale-api"

cd "$APP_DIR"
git pull
bun install
bun run test
pm2 restart ecosystem.config.js --update-env