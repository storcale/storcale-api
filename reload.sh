echo "[Deploy]"
git pull
bun install
echo "[RELOAD] Restarting API"
screen -S api -X quit || true
screen -dmS api bash -c "
  cd storcale-api
  exec node app.js
"  
echo "[RELOAD] Done"