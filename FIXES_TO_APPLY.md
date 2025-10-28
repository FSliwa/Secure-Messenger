# Naprawy do zastosowania

## 1. Problem z kluczami Supabase

### Diagnoza:
Błąd "Invalid API key" sugeruje problem z konfiguracją Supabase.

### Rozwiązanie:
1. Zaloguj się do https://app.supabase.com/project/fyxmppbrealxwnstuzuk
2. Przejdź do Settings > API
3. Skopiuj nowe klucze (anon i service_role)
4. Zaktualizuj pliki:
   - `.env.production` na serwerze
   - Restart aplikacji

## 2. Konfiguracja Email

### Kroki w Supabase Dashboard:
1. Authentication > Settings > Email Settings
2. Włącz "Enable Email"
3. Skonfiguruj SMTP:
   - Użyj własnego SMTP lub
   - Włącz Supabase Email (dla testów)

### Szablony email:
1. Authentication > Email Templates
2. Dostosuj szablony dla:
   - Confirm signup
   - Reset password
   - Magic Link

## 3. Poprawki w aplikacji

### A. Zaktualizuj klucze API w plikach:

**src/lib/supabase.ts:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fyxmppbrealxwnstuzuk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_NEW_ANON_KEY';
```

### B. Dodaj fallback dla brakujących zmiennych środowiskowych:

**vite.config.ts - dodaj:**
```typescript
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://fyxmppbrealxwnstuzuk.supabase.co'),
  'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || '')
}
```

## 4. DNS i HTTPS

### Opcja A - Czekaj na propagację:
- DNS może propagować się do 24-48h
- Monitoruj: `nslookup secure-messenger.info`

### Opcja B - Wyłącz przekierowanie:
1. GoDaddy > Domain Settings
2. Znajdź "Forwarding" lub "Website Forwarding"
3. Wyłącz wszystkie przekierowania

### Opcja C - Dodaj SSL:
```bash
# Na serwerze:
sudo apt update
sudo apt install certbot
sudo certbot --nginx -d secure-messenger.info -d www.secure-messenger.info
```

## 5. Restart aplikacji na serwerze

```bash
# SSH do serwera (gdy będzie dostępny)
cd /opt/Secure-Messenger
docker-compose -f deployment/docker/docker-compose.production.yml down
docker-compose -f deployment/docker/docker-compose.production.yml up -d
```

## 6. Monitorowanie

### Sprawdź logi:
```bash
docker logs secure-messenger-app
docker logs secure-messenger-nginx
```

### Test endpoints:
- http://5.22.223.49 - strona główna ✓
- http://5.22.223.49/health - health check
- http://secure-messenger.info - po propagacji DNS
