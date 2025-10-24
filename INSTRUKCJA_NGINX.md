# 🚀 Instrukcja Konfiguracji Nginx dla Secure Messenger

## 📋 Wymagania
- Serwer Ubuntu 24.04
- Dostęp SSH jako użytkownik `admin`
- Uprawnienia sudo

## 🔧 Krok po kroku

### 1️⃣ Zaloguj się na serwer
```bash
ssh admin@5.22.223.49
```

### 2️⃣ Zainstaluj Nginx
```bash
sudo apt update
sudo apt install -y nginx
```

### 3️⃣ Skopiuj pliki aplikacji
```bash
sudo rm -rf /var/www/secure-messenger
sudo cp -r ~/Secure-Messenger/dist /var/www/secure-messenger
sudo chown -R www-data:www-data /var/www/secure-messenger
```

### 4️⃣ Utwórz konfigurację Nginx
```bash
sudo nano /etc/nginx/sites-available/secure-messenger
```

**Wklej poniższą konfigurację:**
```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name 5.22.223.49;
    
    root /var/www/secure-messenger;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Main location
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

**Zapisz plik:** `Ctrl+X`, następnie `Y`, następnie `Enter`

### 5️⃣ Aktywuj konfigurację
```bash
# Usuń domyślną konfigurację
sudo rm -f /etc/nginx/sites-enabled/default

# Utwórz symlink do nowej konfiguracji
sudo ln -sf /etc/nginx/sites-available/secure-messenger /etc/nginx/sites-enabled/
```

### 6️⃣ Testuj konfigurację
```bash
sudo nginx -t
```
Powinno wyświetlić: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

### 7️⃣ Uruchom Nginx
```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### 8️⃣ Sprawdź firewall (jeśli aktywny)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw status
```

## ✅ Sprawdzenie

Otwórz przeglądarkę i przejdź do:
```
http://5.22.223.49
```

Powinieneś zobaczyć działającą aplikację Secure Messenger!

## 🔄 Aktualizacja aplikacji w przyszłości

Gdy wprowadzisz zmiany w kodzie:

```bash
# 1. Na swoim komputerze (lokalnie)
cd ~/Secure-Messenger
git add .
git commit -m "opis zmian"
git push origin main

# 2. Na serwerze
ssh admin@5.22.223.49
cd ~/Secure-Messenger
git pull origin main
rm -rf node_modules package-lock.json
npm install
npm run build
sudo cp -r dist/* /var/www/secure-messenger/
sudo systemctl reload nginx
```

## 📝 Przydatne komendy

```bash
# Restart Nginx
sudo systemctl restart nginx

# Status Nginx
sudo systemctl status nginx

# Logi błędów
sudo tail -f /var/log/nginx/error.log

# Logi dostępu
sudo tail -f /var/log/nginx/access.log

# Test konfiguracji
sudo nginx -t

# Reload konfiguracji (bez przestoju)
sudo systemctl reload nginx
```

## 🐛 Rozwiązywanie problemów

### Problem: Strona nie ładuje się
```bash
# Sprawdź status Nginx
sudo systemctl status nginx

# Sprawdź logi
sudo tail -50 /var/log/nginx/error.log
```

### Problem: 404 Not Found
```bash
# Sprawdź czy pliki istnieją
ls -la /var/www/secure-messenger/

# Sprawdź uprawnienia
sudo chown -R www-data:www-data /var/www/secure-messenger/
```

### Problem: 502 Bad Gateway
```bash
# Sprawdź czy aplikacja działa
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx
```

## 🔐 Opcjonalnie: Konfiguracja HTTPS z Let's Encrypt

Jeśli masz domenę (np. messenger.twojadomena.pl):

```bash
# Zainstaluj Certbot
sudo apt install -y certbot python3-certbot-nginx

# Uzyskaj certyfikat SSL
sudo certbot --nginx -d messenger.twojadomena.pl

# Auto-renewal jest skonfigurowany automatycznie
sudo certbot renew --dry-run
```

## 📊 Monitoring

```bash
# Sprawdź zużycie zasobów
htop

# Sprawdź miejsce na dysku
df -h

# Sprawdź procesy Nginx
ps aux | grep nginx
```

---

**Autor:** GitHub Copilot  
**Data:** 24 października 2025  
**Wersja:** 1.0
