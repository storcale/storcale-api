#!/bin/bash
set -e

git pull
bun install
bun run test
pm2 restart ecosystem.config.js --update-env