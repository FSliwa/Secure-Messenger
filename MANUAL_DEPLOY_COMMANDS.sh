#!/bin/bash
# Komendy do wykonania BEZPOŚREDNIO NA SERWERZE przez konsolę web/VNC

# 1. Pobierz projekt
cd /opt
sudo git clone https://github.com/FSliwa/Secure-Messenger.git
sudo chown -R $USER:$USER Secure-Messenger
cd Secure-Messenger

# 2. Zainstaluj Docker jeśli nie ma
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# 3. Zainstaluj Docker Compose
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 4. Skonfiguruj środowisko
cp env.production.example .env.production
nano .env.production  # <-- EDYTUJ TUTAJ SWOJE DANE SUPABASE

# 5. Uruchom deployment
sudo ./deployment/scripts/deploy.sh

# 6. Sprawdź status
docker ps
curl http://localhost/health
