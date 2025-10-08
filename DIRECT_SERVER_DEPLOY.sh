#!/bin/bash
# WYKONAJ TE KOMENDY BEZPOŚREDNIO NA SERWERZE W KONSOLI WEB

# 1. Pobierz projekt
cd /opt
sudo git clone https://github.com/FSliwa/Secure-Messenger.git
sudo chown -R $USER:$USER Secure-Messenger
cd Secure-Messenger

# 2. Zainstaluj wymagane komponenty
chmod +x deployment/scripts/install-server.sh
sudo ./deployment/scripts/install-server.sh

# 3. Skonfiguruj środowisko
cp env.production.example .env.production
echo ""
echo "📝 EDYTUJ PLIK .env.production:"
echo "nano .env.production"
echo ""
echo "Ustaw:"
echo "VITE_SUPABASE_URL=https://twoj-projekt.supabase.co"
echo "VITE_SUPABASE_ANON_KEY=twoj-klucz"
echo "VITE_APP_URL=http://5.22.223.49"

# 4. Po edycji uruchom deployment
sudo ./deployment/scripts/deploy.sh

# 5. Sprawdź czy działa
docker ps
curl http://localhost/health

echo "✅ Aplikacja powinna być dostępna na: http://5.22.223.49"
