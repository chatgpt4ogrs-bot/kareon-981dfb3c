#!/bin/bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
APP_DIR=/opt/kareon
REPO=https://github.com/chatgpt4ogrs-bot/kareon-981dfb3c.git
CF_TOKEN='eyJhIjoiYmEwNmE0YTU5ZTBhZjMzNjBkZjgyZDZhZjM5NWRhNjUiLCJ0IjoiODg3ZjQ4N2UtYjQyZS00MzBiLWFlMTMtYmRkYmMyZTY5NjkxIiwicyI6Ik56UTNZVGRoWW1FdE1tRmpZUzAwTXpka0xXSTVZVEl0TkRCa01HSmxNbVptTkdSbCJ9'

echo "==> Postgres Docker"
docker rm -f kareon-pg 2>/dev/null || true
docker volume create kareon_pgdata >/dev/null
if [[ -f /root/kareon-pg-pass.txt ]]; then
  PG_PASS=$(cat /root/kareon-pg-pass.txt)
else
  PG_PASS=$(openssl rand -hex 16)
  echo "$PG_PASS" > /root/kareon-pg-pass.txt
  chmod 600 /root/kareon-pg-pass.txt
fi

docker pull postgres:16
docker run -d --name kareon-pg --restart unless-stopped \
  -e POSTGRES_USER=kareon \
  -e POSTGRES_PASSWORD="$PG_PASS" \
  -e POSTGRES_DB=kareon \
  -p 127.0.0.1:5432:5432 \
  -v kareon_pgdata:/var/lib/postgresql/data \
  postgres:16

echo "Waiting for Postgres..."
for i in $(seq 1 30); do
  if docker exec kareon-pg pg_isready -U kareon -d kareon >/dev/null 2>&1; then
    echo "Postgres ready"
    break
  fi
  sleep 2
done

echo "==> App code"
mkdir -p /opt
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git fetch --all
  git reset --hard origin/main
  git pull --ff-only origin main || true
else
  rm -rf "$APP_DIR"
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

echo "==> npm install + build"
npm install
cd server && npm install && cd ..
npm run build

JWT_SECRET=$(openssl rand -hex 32)
mkdir -p "$APP_DIR/data"
cat > "$APP_DIR/data/db-config.json" <<EOF
{
  "host": "127.0.0.1",
  "port": 5432,
  "database": "kareon",
  "user": "kareon",
  "password": "$PG_PASS",
  "ssl": false,
  "jwtSecret": "$JWT_SECRET",
  "configuredAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
}
EOF
chmod 600 "$APP_DIR/data/db-config.json"
chown -R svnuvem:svnuvem "$APP_DIR"

echo "==> PM2"
npm install -g pm2
systemctl stop kareon 2>/dev/null || true
systemctl disable kareon 2>/dev/null || true
rm -f /etc/systemd/system/kareon.service
systemctl daemon-reload || true

# Run as svnuvem via sudo -u
sudo -u svnuvem bash -lc "
  cd /opt/kareon/server
  export PORT=3001
  export NODE_ENV=production
  pm2 delete kareon 2>/dev/null || true
  pm2 start src/index.js --name kareon --cwd /opt/kareon/server --env production --update-env
  pm2 save
"
env PATH=$PATH:/usr/bin pm2 startup systemd -u svnuvem --hp /home/svnuvem | tail -n 1 | bash || true
sudo -u svnuvem bash -lc 'pm2 save'

echo "==> Nginx"
cat > /etc/nginx/sites-available/kareon <<'NGX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
NGX

rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/kareon /etc/nginx/sites-enabled/kareon
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> Cloudflare tunnel"
docker pull cloudflare/cloudflared:latest
cat > /etc/systemd/system/cloudflared-kareon.service <<UNIT
[Unit]
Description=Cloudflare Tunnel for Kareon
After=network-online.target docker.service nginx.service
Wants=network-online.target docker.service

[Service]
Type=simple
Restart=always
RestartSec=5
ExecStartPre=-/usr/bin/docker rm -f cloudflared-kareon
ExecStart=/usr/bin/docker run --name cloudflared-kareon --network host cloudflare/cloudflared:latest tunnel --no-autoupdate run --token ${CF_TOKEN}
ExecStop=/usr/bin/docker stop cloudflared-kareon

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable cloudflared-kareon
systemctl restart cloudflared-kareon

sleep 5
echo "==> Health checks"
curl -sS http://127.0.0.1:3001/api/health || true
echo
curl -sS http://127.0.0.1/api/health || true
echo
sudo -u svnuvem bash -lc 'pm2 status'
systemctl is-active nginx cloudflared-kareon || true
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo "DONE"
