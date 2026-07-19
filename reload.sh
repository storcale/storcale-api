set -e

cd "$(dirname "$0")"
git pull
bun install
./node_modules/.bin/pm2 restart ./ecosystem.config.js --update-env