#!/bin/bash
set -euo pipefail

APP_DIR=/opt/kareon
cd "$APP_DIR"

echo "==> Git pull"
git fetch --all
git reset --hard origin/main
git pull --ff-only origin main || true
git log -1 --oneline

echo "==> npm install + build"
npm install
cd server && npm install && cd ..
npm run build
chown -R svnuvem:svnuvem "$APP_DIR"

echo "==> PM2 restart"
sudo -u svnuvem bash -lc 'pm2 restart kareon --update-env && pm2 save && pm2 status'
sleep 2
curl -sS http://127.0.0.1:3001/api/health || true
echo
curl -sS http://127.0.0.1/api/health || true
echo
echo "DONE"
