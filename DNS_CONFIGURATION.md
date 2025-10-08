# Konfiguracja DNS dla secure-messenger.info

## IP Serwera: 5.22.223.49

---

## ZMIANY DO WYKONANIA W DNS:

### 1. USUŃ/ZMIEŃ ISTNIEJĄCY REKORD A

**Obecny rekord:**
```
Type: A
Name: @
Data: WebsiteBuilder Site
```

**ZMIEŃ NA:**
```
Type: A
Name: @
Data: 5.22.223.49
TTL: 1 Hour (3600 seconds)
```

**Jak:**
- Kliknij "Edit" przy rekordzie A @
- W polu "Data" wpisz: `5.22.223.49`
- Kliknij "Save"

---

### 2. DODAJ REKORD A DLA WWW (opcjonalnie)

**Jeśli chcesz aby www.secure-messenger.info też działało:**

```
Type: A
Name: www
Data: 5.22.223.49
TTL: 1 Hour
```

**Jak:**
- Kliknij "Add Record" lub "Add"
- Type: A
- Name: www
- Data: 5.22.223.49
- TTL: 1 Hour
- Save

**ALBO zostaw obecny CNAME www → secure-messenger.info** (też zadziała)

---

### 3. OPCJONALNIE: DODAJ SUBDOMENY

Jeśli planujesz 3-serwerową architekturę:

```
Type: A
Name: api
Data: [IP Serwera Backend API]
TTL: 1 Hour

Type: A  
Name: cdn
Data: [IP Serwera CDN/Media]
TTL: 1 Hour
```

---

## FINALNA KONFIGURACJA DNS:

```
Type    Name    Data                          TTL      Akcja
-------------------------------------------------------------
A       @       5.22.223.49                   1 Hour   ZMIEŃ
NS      @       ns57.domaincontrol.com.       1 Hour   ZOSTAW
NS      @       ns58.domaincontrol.com.       1 Hour   ZOSTAW
CNAME   www     secure-messenger.info.        1 Hour   ZOSTAW
CNAME   _dc     _domainconnect.gd...          1 Hour   ZOSTAW
TXT     _dmarc  v=DMARC1; p=quarantine...     1 Hour   ZOSTAW
```

---

## PROPAGACJA DNS:

Po zmianie rekordów:
- **Lokalnie:** 1-5 minut
- **Globalnie:** 24-48 godzin (zazwyczaj 1-2 godziny)

---

## WERYFIKACJA:

### 1. Sprawdź DNS (po 5 minutach):
```bash
nslookup secure-messenger.info
# Powinno pokazać: 5.22.223.49

dig secure-messenger.info
# Answer section: secure-messenger.info. 3600 IN A 5.22.223.49
```

### 2. Sprawdź w przeglądarce:
```
http://secure-messenger.info
https://secure-messenger.info (jeśli masz SSL)
```

---

## WAŻNE: SSL/HTTPS

Obecnie aplikacja działa tylko na HTTP.

Dla domeny secure-messenger.info **MUSISZ** dodać SSL:

### Opcja 1: Let's Encrypt (DARMOWE)
```bash
# Na serwerze:
sudo apt install certbot
sudo certbot certonly --standalone -d secure-messenger.info -d www.secure-messenger.info
```

### Opcja 2: Cloudflare (DARMOWE + CDN)
- Dodaj domenę do Cloudflare
- Włącz "Flexible SSL"
- Zmień nameservery na Cloudflare

---

## NGINX CONFIGURATION Z SSL:

Po uzyskaniu certyfikatu, zaktualizuj Nginx:

```nginx
server {
    listen 80;
    server_name secure-messenger.info www.secure-messenger.info;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name secure-messenger.info www.secure-messenger.info;
    
    ssl_certificate /etc/letsencrypt/live/secure-messenger.info/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/secure-messenger.info/privkey.pem;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location ~* \.(png|svg|ico|jpg|jpeg|gif|webp)$ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## PODSUMOWANIE:

1. Zmień rekord A @ na 5.22.223.49
2. Poczekaj 5-60 minut na propagację
3. Sprawdź: http://secure-messenger.info
4. Dodaj SSL (Let's Encrypt lub Cloudflare)
5. Ciesz się domeną! 🎉
