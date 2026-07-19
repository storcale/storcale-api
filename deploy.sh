#!/bin/bash
set -e

cd "$(dirname "$0")"
git pull
bun install
bun run test
./node_modules/.bin/pm2 reload ecosystem.config.js --update-env