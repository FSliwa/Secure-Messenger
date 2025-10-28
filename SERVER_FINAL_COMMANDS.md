# 🖥️ Komendy do wykonania NA SERWERZE

## Połącz się z serwerem przez Web Console

Wykonuj komendy POJEDYNCZO w podanej kolejności:

## KROK 1: Aktualizacja kodu

```bash
cd /opt/Secure-Messenger
```

```bash
git pull origin main
```

## KROK 2: Sprawdzenie statusu DNS

```bash
nslookup secure-messenger.info
```

Powinno zwrócić: `5.22.223.49`

## KROK 3: Instalacja SSL (Let's Encrypt)

```bash
sudo bash deployment/scripts/setup-ssl.sh
```

Zostaniesz zapytany o email - wpisz swój prawdziwy email.

**Oczekiwany output:**
```
✅ SSL ZOSTAŁO SKONFIGUROWANE!
Twoja aplikacja jest teraz dostępna pod:
🌐 https://secure-messenger.info
```

## KROK 4: Aktualizacja zmiennych środowiskowych

```bash
cat > .env.production << 'EOF'
NODE_ENV=production
VITE_SUPABASE_URL=https://fyxmppbrealxwnstuzuk.supabase.co
VITE_SUPABASE_KEY=sb_publishable_Jau8JdiOFfVKQOM1svLxMQ_9-sBqnKc
SUPABASE_SERVICE_KEY=sb_secret_ek5NhQ2-BVZd-7yHw3RYhw_-sx2qOse
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=https://secure-messenger.info,https://www.secure-messenger.info,http://5.22.223.49
LOG_LEVEL=info
EOF
```

## KROK 5: Restart aplikacji

```bash
docker-compose -f deployment/docker/docker-compose.production.yml down
```

```bash
docker-compose -f deployment/docker/docker-compose.production.yml build --no-cache
```

```bash
docker-compose -f deployment/docker/docker-compose.production.yml up -d
```

## KROK 6: Weryfikacja

```bash
docker ps
```

```bash
docker logs secure-messenger-app --tail 50
```

```bash
curl -I https://secure-messenger.info
```

## KROK 7: Test w przeglądarce

Otwórz: https://secure-messenger.info

Powinieneś zobaczyć:
- ✅ Zieloną kłódkę (SSL działa)
- ✅ Działającą aplikację
- ✅ Możliwość rejestracji

## 🆘 Jeśli coś nie działa:

### Problem: "Failed to obtain certificate"

Możliwe przyczyny:
- DNS nie wskazuje jeszcze na serwer (czekaj na propagację)
- Port 80 jest zajęty

Rozwiązanie:
```bash
# Zatrzymaj wszystko co może zajmować port 80
sudo systemctl stop nginx
docker-compose -f deployment/docker/docker-compose.production.yml down

# Spróbuj ponownie
sudo bash deployment/scripts/setup-ssl.sh
```

### Problem: "Docker build failed"

```bash
# Sprawdź logi
docker-compose -f deployment/docker/docker-compose.production.yml logs

# Wyczyść cache
docker system prune -a
```

### Problem: Aplikacja nie odpowiada

```bash
# Sprawdź logi szczegółowo
docker logs secure-messenger-app -f

# Sprawdź czy Nginx działa
sudo systemctl status nginx

# Sprawdź porty
sudo netstat -tlnp | grep -E '(80|443)'
```

## ✅ KONIEC

Po wykonaniu wszystkich kroków aplikacja będzie w pełni funkcjonalna pod https://secure-messenger.info
