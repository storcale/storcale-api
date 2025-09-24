set -e
echo "[DEPLOY]"
git stash
git pull
bun install

echo "[RELOAD] Restarting API"
fuser -k 9902/tcp || true
nohup node app.js >/dev/null 2>&1 &

echo "[RELOAD] API started"
# chmod +x reload.sh