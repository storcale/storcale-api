echo "[Deploy]"
git pull
bun install
echo "[RELOAD] Restarting API"
screen -S api -X quit
screen -S api 
cd storcale-api
node --env-file=envs/.env app.js   
echo "[RELOAD] Done"