# 🔒 Konfiguracja SSL dla Secure Messenger

## Wymagania:
✅ Domena secure-messenger.info wskazuje na serwer (5.22.223.49)  
✅ Aplikacja działa na serwerze  
✅ Porty 80 i 443 są otwarte  

## Metoda 1: Automatyczny skrypt (ZALECANE)

### Na serwerze wykonaj:

```bash
# 1. Przejdź do katalogu aplikacji
cd /opt/Secure-Messenger

# 2. Pobierz najnowsze zmiany
git pull origin main

# 3. Nadaj uprawnienia skryptowi
chmod +x deployment/scripts/setup-ssl.sh

# 4. Uruchom skrypt jako root
sudo bash deployment/scripts/setup-ssl.sh
```

To zajmie około 2-3 minuty. Skrypt automatycznie:
- Zainstaluje Certbot
- Pobierze certyfikat SSL od Let's Encrypt
- Zaktualizuje konfigurację Nginx
- Skonfiguruje automatyczne odnawianie

## Metoda 2: Manualna konfiguracja

### Krok 1: Instalacja Certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Krok 2: Zatrzymanie aplikacji

```bash
cd /opt/Secure-Messenger
docker-compose -f deployment/docker/docker-compose.production.yml down
sudo systemctl stop nginx
```

### Krok 3: Uzyskanie certyfikatu

```bash
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email twoj-email@example.com \
    -d secure-messenger.info \
    -d www.secure-messenger.info
```

### Krok 4: Aktualizacja Nginx

```bash
# Skopiuj konfigurację z SSL
sudo cp deployment/nginx/nginx-ssl.conf /etc/nginx/nginx.conf

# Test konfiguracji
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Krok 5: Uruchomienie aplikacji

```bash
docker-compose -f deployment/docker/docker-compose.production.yml up -d
```

### Krok 6: Automatyczne odnawianie

```bash
# Włącz timer dla automatycznego odnawiania
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test odnawiania (bez faktycznego odnawiania)
sudo certbot renew --dry-run
```

## Weryfikacja SSL

### 1. Sprawdź certyfikat:
```bash
sudo certbot certificates
```

### 2. Test HTTPS:
```bash
curl -I https://secure-messenger.info
```

### 3. Otwórz w przeglądarce:
- https://secure-messenger.info
- https://www.secure-messenger.info

Powinieneś zobaczyć zieloną kłódkę w pasku adresu!

## Automatyczne odnawianie

Certyfikaty Let's Encrypt są ważne przez 90 dni. Certbot automatycznie odnowi je gdy zostanie 30 dni do wygaśnięcia.

### Sprawdź status:
```bash
sudo systemctl status certbot.timer
```

### Manualne odnawianie (jeśli potrzebne):
```bash
sudo certbot renew
```

## Rozwiązywanie problemów

### Problem: "Failed to connect to host"
**Przyczyna:** DNS nie wskazuje na serwer  
**Rozwiązanie:**
```bash
# Sprawdź DNS
nslookup secure-messenger.info

# Powinno zwrócić: 5.22.223.49
```

### Problem: "Port 80 already in use"
**Przyczyna:** Nginx lub Docker blokuje port  
**Rozwiązanie:**
```bash
sudo systemctl stop nginx
docker-compose down
```

### Problem: "Too many certificates"
**Przyczyna:** Limit Let's Encrypt (5 certyfikatów/tydzień)  
**Rozwiązanie:** Poczekaj tydzień lub użyj staging:
```bash
sudo certbot certonly --standalone --staging \
    -d secure-messenger.info -d www.secure-messenger.info
```

## Bezpieczeństwo

Po skonfigurowaniu SSL:
- ✅ Cały ruch jest szyfrowany (HTTPS)
- ✅ HTTP automatycznie przekierowuje na HTTPS
- ✅ Włączone HSTS (wymusza HTTPS)
- ✅ Certyfikat odnawia się automatycznie

## Sprawdzenie jakości SSL

Przetestuj swoją konfigurację SSL:
https://www.ssllabs.com/ssltest/analyze.html?d=secure-messenger.info

Powinieneś uzyskać ocenę A lub A+!
