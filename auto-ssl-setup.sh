#!/bin/bash

# Automatyczny skrypt konfiguracji SSL
# Wymaga: sshpass lub expect

SERVER_IP="5.22.223.49"
SERVER_USER="admin"
SERVER_PASS="MIlik112"
DOMAIN="secure-messenger.info"
EMAIL="f.sliwa@nowybankpolski.pl"

echo "🚀 AUTOMATYCZNA INSTALACJA SSL"
echo "=============================="
echo ""
echo "Serwer: $SERVER_IP"
echo "Domena: $DOMAIN"
echo ""

# Tworzenie skryptu do wykonania na serwerze
cat > /tmp/setup-ssl-remote.sh << 'EOFSCRIPT'
#!/bin/bash

echo "1. Zatrzymywanie Docker..."
cd /opt/Secure-Messenger
docker-compose -f deployment/docker/docker-compose.production.yml down

echo "2. Instalacja Certbot..."
apt update
apt install -y certbot

echo "3. Generowanie certyfikatu SSL..."
certbot certonly --standalone --non-interactive --agree-tos \
  --email EMAIL_PLACEHOLDER \
  -d DOMAIN_PLACEHOLDER \
  -d www.DOMAIN_PLACEHOLDER

if [ $? -ne 0 ]; then
    echo "❌ Błąd generowania certyfikatu"
    exit 1
fi

echo "4. Sprawdzanie certyfikatu..."
ls -la /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/

echo "5. Instalacja Nginx..."
apt install -y nginx

echo "6. Konfiguracja Nginx..."
if [ -f /opt/Secure-Messenger/deployment/nginx/nginx-ssl.conf ]; then
    cp /opt/Secure-Messenger/deployment/nginx/nginx-ssl.conf /etc/nginx/nginx.conf
    nginx -t
    if [ $? -eq 0 ]; then
        echo "✅ Konfiguracja Nginx poprawna"
    else
        echo "❌ Błąd konfiguracji Nginx"
        exit 1
    fi
fi

echo "7. Uruchamianie Nginx..."
systemctl restart nginx
systemctl enable nginx

echo "8. Test HTTPS..."
sleep 5
curl -I https://DOMAIN_PLACEHOLDER | head -3

echo ""
echo "✅ SSL SKONFIGUROWANY!"
echo "Sprawdź: https://DOMAIN_PLACEHOLDER"
EOFSCRIPT

# Zamień placeholdery
sed -i '' "s/EMAIL_PLACEHOLDER/$EMAIL/g" /tmp/setup-ssl-remote.sh
sed -i '' "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /tmp/setup-ssl-remote.sh

chmod +x /tmp/setup-ssl-remote.sh

echo "Skrypt przygotowany: /tmp/setup-ssl-remote.sh"
echo ""
echo "Próba połączenia z serwerem..."
echo ""

# Próba wykonania przez sshpass
if command -v sshpass &> /dev/null; then
    echo "Używam sshpass..."
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no /tmp/setup-ssl-remote.sh $SERVER_USER@$SERVER_IP:/tmp/
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "sudo bash /tmp/setup-ssl-remote.sh"
else
    echo "❌ sshpass nie zainstalowany"
    echo ""
    echo "WYKONAJ RĘCZNIE NA SERWERZE:"
    echo "──────────────────────────────"
    cat /tmp/setup-ssl-remote.sh
fi
