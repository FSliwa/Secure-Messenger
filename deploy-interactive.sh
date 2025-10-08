#!/bin/bash

# Interactive Deployment Script
echo "🚀 Secure-Messenger Interactive Deployment"
echo "=========================================="
echo ""
echo "Ten skrypt pomoże Ci krok po kroku wykonać deployment."
echo ""

# Krok 1
echo "📋 KROK 1: Przesyłanie pakietu"
echo "------------------------------"
echo "Wykonaj w terminalu:"
echo ""
echo "scp secure-messenger-deploy.tar.gz admin@5.22.223.49:/tmp/"
echo ""
echo "Hasło: MIlik112"
echo ""
read -p "Naciśnij Enter gdy skończysz przesyłanie..."

# Krok 2
echo ""
echo "📋 KROK 2: Połączenie z serwerem"
echo "--------------------------------"
echo "Otwórz NOWY terminal i wykonaj:"
echo ""
echo "ssh admin@5.22.223.49"
echo ""
echo "Hasło: MIlik112"
echo ""
echo "Po zalogowaniu skopiuj i wklej te komendy:"
echo ""
cat << 'EOF'
# Rozpakuj deployment
cd /tmp && \
tar -xzf secure-messenger-deploy.tar.gz server-deploy.sh && \
chmod +x server-deploy.sh && \
sudo ./server-deploy.sh && \
cd /opt/secure-messenger && \
echo "✅ Deployment rozpakowany!"

# Teraz skonfiguruj aplikację
echo ""
echo "📝 Edytuj plik .env.production:"
nano .env.production
EOF

echo ""
echo "W pliku .env.production ustaw:"
echo "- VITE_SUPABASE_URL=https://twoj-projekt.supabase.co"
echo "- VITE_SUPABASE_ANON_KEY=twoj-klucz"
echo "- VITE_APP_URL=https://5.22.223.49"
echo ""
read -p "Naciśnij Enter gdy skończysz konfigurację..."

# Krok 3
echo ""
echo "📋 KROK 3: Uruchomienie deployment"
echo "----------------------------------"
echo "Na serwerze wykonaj:"
echo ""
echo "sudo ./deployment/scripts/deploy.sh"
echo ""
echo "To może potrwać kilka minut..."
echo ""
read -p "Naciśnij Enter gdy deployment się zakończy..."

# Krok 4
echo ""
echo "📋 KROK 4: Weryfikacja"
echo "---------------------"
echo "Sprawdź czy wszystko działa:"
echo ""
echo "./deployment/scripts/health-check.sh"
echo "docker ps"
echo ""
echo "Aplikacja powinna być dostępna pod:"
echo "http://5.22.223.49"
echo ""
echo "🎉 Gratulacje! Deployment zakończony!"
