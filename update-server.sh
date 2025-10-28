#!/bin/bash

# 🔄 Skrypt szybkiej aktualizacji Secure Messenger na serwerze

echo "🔄 Aktualizacja Secure Messenger..."

cd ~/Secure-Messenger

echo "📥 Pobieram zmiany z GitHub..."
git pull origin main

echo "🧹 Czyszczę stare zależności..."
rm -rf node_modules package-lock.json

echo "📦 Instaluję zależności..."
npm install

echo "🏗️  Buduję aplikację..."
npm run build

echo "📂 Kopiuję pliki do Nginx..."
sudo cp -r dist/* /var/www/secure-messenger/

echo "🔄 Przeładowuję Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Aktualizacja zakończona!"
echo "🌐 Aplikacja dostępna pod: http://5.22.223.49"
