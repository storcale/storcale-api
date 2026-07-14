#!/bin/bash
set -e

cd "$(dirname "$0")"
bun install pm2 -g
export PATH="/home/storcale/.bun/bin:$PATH"
git pull
bun install
bun run test
pm2 restart ecosystem.config.js --update-env