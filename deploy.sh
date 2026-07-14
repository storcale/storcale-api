#!/bin/bash
set -e

cd "$(dirname "$0")"

git pull
bun install
bun run test
pm2 restart ecosystem.config.js --update-env