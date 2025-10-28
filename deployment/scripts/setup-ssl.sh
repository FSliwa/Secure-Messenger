#!/bin/bash

echo "🔒 KONFIGURACJA SSL DLA SECURE-MESSENGER.INFO"
echo "=============================================="
echo ""

# Sprawdź czy skrypt jest uruchamiany jako root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Ten skrypt musi być uruchomiony jako root (sudo)"
    exit 1
fi

# Zmienne
DOMAIN="secure-messenger.info"
EMAIL="admin@secure-messenger.info"  # Zmień na swój email

echo "📧 Email dla powiadomień Let's Encrypt: $EMAIL"
echo "🌐 Domena: $DOMAIN"
echo ""

# 1. Instalacja Certbot
echo "1️⃣ Instalacja Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# 2. Zatrzymaj Nginx aby zwolnić port 80
echo ""
echo "2️⃣ Zatrzymywanie Nginx..."
systemctl stop nginx
docker-compose -f /opt/Secure-Messenger/deployment/docker/docker-compose.production.yml down 2>/dev/null || true

# 3. Uzyskaj certyfikat SSL
echo ""
echo "3️⃣ Pobieranie certyfikatu SSL..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

if [ $? -ne 0 ]; then
    echo "❌ Nie udało się uzyskać certyfikatu SSL"
    echo "Sprawdź czy:"
    echo "1. DNS wskazuje na ten serwer (5.22.223.49)"
    echo "2. Port 80 jest otwarty"
    echo "3. Domena jest dostępna z internetu"
    exit 1
fi

# 4. Skopiuj konfigurację Nginx z SSL
echo ""
echo "4️⃣ Aktualizacja konfiguracji Nginx..."
if [ -f /opt/Secure-Messenger/deployment/nginx/nginx-ssl.conf ]; then
    cp /opt/Secure-Messenger/deployment/nginx/nginx-ssl.conf /etc/nginx/nginx.conf
    echo "✅ Konfiguracja Nginx zaktualizowana"
else
    echo "⚠️  Plik nginx-ssl.conf nie znaleziony, używam domyślnej konfiguracji"
fi

# 5. Test konfiguracji Nginx
echo ""
echo "5️⃣ Testowanie konfiguracji Nginx..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Błąd w konfiguracji Nginx"
    exit 1
fi

# 6. Restart Nginx
echo ""
echo "6️⃣ Uruchamianie Nginx..."
systemctl start nginx
systemctl enable nginx

# 7. Konfiguracja automatycznego odnawiania
echo ""
echo "7️⃣ Konfiguracja automatycznego odnawiania..."
systemctl enable certbot.timer
systemctl start certbot.timer

# 8. Test odnawiania (dry run)
echo ""
echo "8️⃣ Test automatycznego odnawiania..."
certbot renew --dry-run

echo ""
echo "✅ SSL ZOSTAŁO SKONFIGUROWANE!"
echo "=============================="
echo ""
echo "Certyfikaty znajdują się w:"
echo "/etc/letsencrypt/live/$DOMAIN/"
echo ""
echo "Automatyczne odnawianie:"
echo "Certbot będzie automatycznie odnawiał certyfikaty przed wygaśnięciem"
echo ""
echo "Sprawdź status:"
echo "systemctl status certbot.timer"
echo ""
echo "Twoja aplikacja jest teraz dostępna pod:"
echo "🌐 https://$DOMAIN"
echo "🌐 https://www.$DOMAIN"
echo ""
echo "HTTP (port 80) automatycznie przekierowuje na HTTPS (port 443)"
