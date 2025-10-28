# 🔒 NAPRAWA HTTPS - Port 443 zamknięty

## 🔍 DIAGNOZA:
- ✅ DNS działa (5.22.223.49)
- ✅ Port 80 (HTTP) działa
- ❌ Port 443 (HTTPS) ZAMKNIĘTY

## Przyczyna:
Certbot nie został uruchomiony lub Nginx nie nasłuchuje na porcie 443.

## 🚀 ROZWIĄZANIE (wykonaj NA SERWERZE):

### OPCJA 1: Szybka naprawa (5 minut)

Połącz się przez Web Console i wykonaj:

```bash
# Sprawdź czy certyfikat istnieje
sudo ls -la /etc/letsencrypt/live/secure-messenger.info/
```

**Jeśli pokazuje "No such file":**

```bash
# 1. Zatrzymaj wszystko co używa portu 80
docker-compose -f /opt/Secure-Messenger/deployment/docker/docker-compose.production.yml down
sudo systemctl stop nginx

# 2. Wygeneruj certyfikat (ZMIEŃ EMAIL!)
sudo certbot certonly --standalone --non-interactive --agree-tos --email TWOJ-EMAIL@gmail.com -d secure-messenger.info -d www.secure-messenger.info

# 3. Sprawdź czy się udało
sudo certbot certificates

# 4. Zainstaluj Nginx
sudo apt install -y nginx

# 5. Skopiuj konfigurację SSL
sudo cp /opt/Secure-Messenger/deployment/nginx/nginx-ssl.conf /etc/nginx/nginx.conf

# 6. Test konfiguracji
sudo nginx -t

# 7. Uruchom Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 8. Sprawdź status
sudo systemctl status nginx

# 9. Test HTTPS
curl -I https://secure-messenger.info
```

### OPCJA 2: Jeśli certyfikat już istnieje

```bash
# Sprawdź czy Nginx działa
sudo systemctl status nginx

# Jeśli nie działa, uruchom
sudo systemctl start nginx

# Sprawdź konfigurację
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### OPCJA 3: Pełna reinstalacja SSL

```bash
cd /opt/Secure-Messenger
sudo bash deployment/scripts/setup-ssl.sh
```

## ✅ WERYFIKACJA:

Po wykonaniu komend:

```bash
# Sprawdź czy port 443 jest otwarty
sudo netstat -tlnp | grep 443

# Test HTTPS
curl -I https://secure-messenger.info
```

Powinno zwrócić: `HTTP/2 200` lub `HTTP/1.1 200`

## 🆘 JEŚLI NADAL NIE DZIAŁA:

```bash
# Sprawdź logi Nginx
sudo tail -f /var/log/nginx/error.log

# Sprawdź czy firewall nie blokuje
sudo ufw status
sudo ufw allow 443/tcp
sudo ufw reload
```
