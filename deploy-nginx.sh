#!/bin/bash

echo "🚀 Konfiguracja Nginx dla Secure Messenger"
echo "=========================================="

# 1. Instalacja Nginx (jeśli nie zainstalowany)
echo "📦 Instaluję Nginx..."
sudo apt update
sudo apt install -y nginx

# 2. Zatrzymaj Nginx na czas konfiguracji
echo "⏸️  Zatrzymuję Nginx..."
sudo systemctl stop nginx

# 3. Skopiuj zbudowaną aplikację do katalogu nginx
echo "📁 Kopiuję pliki aplikacji..."
sudo rm -rf /var/www/secure-messenger
sudo cp -r ~/Secure-Messenger/dist /var/www/secure-messenger
sudo chown -R www-data:www-data /var/www/secure-messenger

# 4. Utwórz konfigurację Nginx
echo "⚙️  Tworzę konfigurację Nginx..."
sudo tee /etc/nginx/sites-available/secure-messenger > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    
    server_name 5.22.223.49;
    
    root /var/www/secure-messenger;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Main location
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy (jeśli potrzebny)
    # location /api {
    #     proxy_pass http://localhost:3000;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection 'upgrade';
    #     proxy_set_header Host $host;
    #     proxy_cache_bypass $http_upgrade;
    # }
}
EOF

# 5. Włącz konfigurację
echo "🔗 Aktywuję konfigurację..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/secure-messenger /etc/nginx/sites-enabled/

# 6. Testuj konfigurację Nginx
echo "🧪 Testuję konfigurację Nginx..."
sudo nginx -t

# 7. Uruchom Nginx
echo "▶️  Uruchamiam Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# 8. Sprawdź status
echo ""
echo "✅ Status Nginx:"
sudo systemctl status nginx --no-pager

echo ""
echo "=========================================="
echo "🎉 Konfiguracja zakończona!"
echo "🌐 Aplikacja dostępna pod: http://5.22.223.49"
echo ""
echo "📝 Przydatne komendy:"
echo "  - Restart Nginx: sudo systemctl restart nginx"
echo "  - Status Nginx:  sudo systemctl status nginx"
echo "  - Logi Nginx:    sudo tail -f /var/log/nginx/error.log"
echo "  - Aktualizacja:  cd ~/Secure-Messenger && git pull && npm run build && sudo cp -r dist/* /var/www/secure-messenger/"
echo "=========================================="
