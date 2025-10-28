# 🚀 OSTATNIE KROKI - Prawie gotowe!

## Co masz:
✅ Legacy JWT secret znaleziony  
✅ Projekt Supabase działa  
✅ Baza danych kompletna  
❌ Brakuje faktycznych kluczy JWT  

## Co potrzebujesz znaleźć w Supabase Dashboard:

### 1. Wróć do miejsca gdzie znalazłeś Legacy JWT secret

W **Settings > API** powinny być wyświetlone:

```
anon (public) key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Te klucze są OBOK Legacy JWT secret. Może trzeba kliknąć "Reveal" lub "Show".

### 2. Gdy znajdziesz te 2 klucze JWT:

Skopiuj je i wykonaj na serwerze (przez Web Console):

```bash
# Połącz się z serwerem
cd /opt/Secure-Messenger

# Pobierz najnowsze pliki
git pull origin main

# Utwórz plik .env.production
cat > .env.production << 'EOF'
NODE_ENV=production
VITE_SUPABASE_URL=https://fyxmppbrealxwnstuzuk.supabase.co
VITE_SUPABASE_ANON_KEY=TU_WKLEJ_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_WKLEJ_SERVICE_ROLE_KEY
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://5.22.223.49,http://secure-messenger.info,https://secure-messenger.info
LOG_LEVEL=info
EOF

# Restart aplikacji
docker-compose -f deployment/docker/docker-compose.production.yml down
docker-compose -f deployment/docker/docker-compose.production.yml build --no-cache
docker-compose -f deployment/docker/docker-compose.production.yml up -d

# Sprawdź czy działa
docker ps
curl http://localhost/health
```

## 📍 Gdzie dokładnie szukać kluczy JWT:

1. **Supabase Dashboard**: https://app.supabase.com/project/fyxmppbrealxwnstuzuk
2. **Settings > API**
3. Sekcja **"Project API keys"**
4. Powinny być 2 pola:
   - `anon (public)` - klucz publiczny
   - `service_role` - klucz prywatny

## ⚠️ WAŻNE:
- Legacy JWT secret to NIE jest klucz do aplikacji
- Potrzebujesz faktycznych kluczy JWT (zaczynają się od `eyJ...`)
- Te klucze są generowane automatycznie na podstawie Legacy JWT secret

## Jeśli nie możesz znaleźć kluczy JWT:
Napisz jaki dokładnie widok widzisz w Settings > API, zrób screenshot.
