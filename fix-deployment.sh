#!/bin/bash
# Fix Deployment Script - Secure Messenger
# Hasło sudo: MIlik112

echo "🔧 Naprawiam deployment Secure Messenger..."

# Zatrzymaj i usuń problematyczne kontenery
echo "1️⃣ Czyszczenie starych kontenerów..."
sudo docker stop secure-messenger-app secure-messenger-nginx secure-messenger-simple secure-messenger 2>/dev/null
sudo docker rm secure-messenger-app secure-messenger-nginx secure-messenger-simple secure-messenger 2>/dev/null

# Upewnij się, że nginx systemowy jest zatrzymany
echo "2️⃣ Zatrzymuję systemowy nginx..."
sudo systemctl stop nginx 2>/dev/null

# Utwórz prostą konfigurację nginx
echo "3️⃣ Tworzę prostą konfigurację nginx..."
sudo cat > /opt/Secure-Messenger/nginx-simple.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # React Router - wszystkie ścieżki przekieruj do index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Utwórz Dockerfile dla prostszego obrazu
echo "4️⃣ Tworzę prosty Dockerfile..."
sudo cat > /opt/Secure-Messenger/Dockerfile.simple << 'EOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx-simple.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Sprawdź czy dist istnieje, jeśli nie - zbuduj
echo "5️⃣ Sprawdzam pliki aplikacji..."
if [ ! -d "/opt/Secure-Messenger/dist" ]; then
    echo "Brak folderu dist - buduję aplikację..."
    cd /opt/Secure-Messenger
    npm install
    npm run build
fi

# Zbuduj prosty obraz
echo "6️⃣ Buduję obraz Docker..."
cd /opt/Secure-Messenger
sudo docker build -f Dockerfile.simple -t secure-messenger-fixed .

# Uruchom aplikację
echo "7️⃣ Uruchamiam aplikację..."
sudo docker run -d \
  --name secure-messenger \
  --restart always \
  -p 80:80 \
  secure-messenger-fixed

# Sprawdź status
echo "8️⃣ Sprawdzam status..."
sleep 3
sudo docker ps | grep secure-messenger

# Test aplikacji
echo "9️⃣ Testuję aplikację..."
curl -s http://localhost/health && echo "✅ Aplikacja działa!" || echo "❌ Problem z aplikacją"

# Napraw SSH
echo "🔐 Naprawiam SSH..."
sudo ufw allow 22/tcp 2>/dev/null
sudo ufw allow 80/tcp 2>/dev/null
sudo ufw allow 443/tcp 2>/dev/null
sudo systemctl restart ssh

# Pokaż logi
echo ""
echo "📋 Logi aplikacji:"
sudo docker logs secure-messenger --tail 20

echo ""
echo "✅ Deployment naprawiony!"
echo "🌐 Aplikacja dostępna pod: http://5.22.223.49"
echo ""
echo "🔍 Dodatkowe informacje:"
echo "- IP serwera: $(hostname -I | awk '{print $1}')"
echo "- Status SSH: $(sudo systemctl is-active ssh)"
echo "- Otwarte porty: $(sudo ss -tlnp | grep LISTEN | grep -E ':80|:22|:443' | awk '{print $4}')"
