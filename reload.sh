echo "[Deploy]"
git pull
bun install
echo "[RELOAD] Restarting API"
exec node app.js
echo "[RELOAD] Done"