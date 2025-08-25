set -e
echo "[DEPLOY]"
git pull
bun install

echo "[RELOAD] Restarting API"
fuser -k 9902/tcp || true
nohup node app.js >/dev/null 2>&1 &

NEW_PID=$!
echo "[RELOAD] API started with PID $NEW_PID"