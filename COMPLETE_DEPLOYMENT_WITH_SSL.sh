#!/bin/bash

echo "🚀 KOMPLETNE WDROŻENIE SECURE MESSENGER Z SSL"
echo "============================================="
echo ""
echo "Ten skrypt wdroży aplikację z nowymi kluczami Supabase i SSL"
echo ""

# Sprawdź czy skrypt jest uruchamiany na serwerze
if [ ! -d "/opt/Secure-Messenger" ]; then
    echo "❌ Katalog /opt/Secure-Messenger nie istnieje"
    echo "Ten skrypt musi być uruchomiony NA SERWERZE"
    exit 1
fi

cd /opt/Secure-Messenger

echo "1️⃣ POBIERANIE NAJNOWSZYCH ZMIAN Z GITHUB"
echo "========================================"
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Błąd podczas pobierania zmian z GitHub"
    exit 1
fi
echo "✅ Zmiany pobrane"
echo ""

echo "2️⃣ KONFIGURACJA ZMIENNYCH ŚRODOWISKOWYCH"
echo "========================================="
cat > .env.production << 'EOF'
NODE_ENV=production
VITE_SUPABASE_URL=https://fyxmppbrealxwnstuzuk.supabase.co
VITE_SUPABASE_KEY=sb_publishable_Jau8JdiOFfVKQOM1svLxMQ_9-sBqnKc
SUPABASE_SERVICE_KEY=sb_secret_ek5NhQ2-BVZd-7yHw3RYhw_-sx2qOse
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://5.22.223.49,http://secure-messenger.info,https://secure-messenger.info
LOG_LEVEL=info
EOF
echo "✅ Plik .env.production utworzony"
echo ""

echo "3️⃣ BUDOWANIE I URUCHAMIANIE APLIKACJI"
echo "======================================"
docker-compose -f deployment/docker/docker-compose.production.yml down
echo "Budowanie aplikacji (może potrwać kilka minut)..."
docker-compose -f deployment/docker/docker-compose.production.yml build --no-cache
if [ $? -ne 0 ]; then
    echo "❌ Błąd podczas budowania aplikacji"
    exit 1
fi
echo "Uruchamianie aplikacji..."
docker-compose -f deployment/docker/docker-compose.production.yml up -d
if [ $? -ne 0 ]; then
    echo "❌ Błąd podczas uruchamiania aplikacji"
    exit 1
fi
echo "✅ Aplikacja uruchomiona"
echo ""

echo "4️⃣ SPRAWDZANIE STATUSU"
echo "======================"
sleep 5
docker ps | grep secure-messenger
echo ""

echo "5️⃣ TESTOWANIE APLIKACJI"
echo "======================="
echo "Test HTTP..."
curl -I http://localhost/ 2>/dev/null | head -3
echo ""

echo "6️⃣ KONFIGURACJA SSL"
echo "==================="
echo "Czy chcesz teraz skonfigurować SSL? (wymaga sudo)"
echo "To zajmie około 2-3 minuty"
echo ""
echo "Jeśli tak, wykonaj:"
echo "  sudo bash deployment/scripts/setup-ssl.sh"
echo ""
echo "Jeśli nie, możesz to zrobić później"
echo ""

echo "✅ APLIKACJA WDROŻONA POMYŚLNIE!"
echo "================================"
echo ""
echo "Aplikacja jest dostępna pod:"
echo "🌐 http://5.22.223.49"
echo "🌐 http://secure-messenger.info"
echo ""
echo "Po skonfigurowaniu SSL będzie również dostępna pod:"
echo "🔒 https://secure-messenger.info"
echo ""
echo "Sprawdź logi aplikacji:"
echo "  docker logs secure-messenger-app -f"
echo ""
echo "Sprawdź status:"
echo "  docker ps"
