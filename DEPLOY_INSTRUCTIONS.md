# Instrukcje wdrożenia na serwer

## Aktualizacja aplikacji na serwerze

### 1. Połącz się z serwerem przez konsolę web:
- Zaloguj się do panelu UpCloud
- Otwórz Web Console dla serwera

### 2. Wykonaj poniższe komendy:

```bash
# Przejdź do katalogu aplikacji
cd /opt/Secure-Messenger

# Pobierz najnowsze zmiany z GitHub
git pull origin main

# Zatrzymaj aplikację
docker-compose -f deployment/docker/docker-compose.production.yml down

# Przebuduj aplikację
docker-compose -f deployment/docker/docker-compose.production.yml build --no-cache

# Uruchom aplikację
docker-compose -f deployment/docker/docker-compose.production.yml up -d

# Sprawdź status
docker ps

# Sprawdź logi
docker logs secure-messenger-app --tail 50
```

### 3. Weryfikacja:

Sprawdź czy aplikacja działa:
- http://5.22.223.49
- http://5.22.223.49/health

### 4. Jeśli są problemy z kluczami Supabase:

```bash
# Edytuj plik .env.production
nano /opt/Secure-Messenger/.env.production

# Zaktualizuj klucze:
VITE_SUPABASE_URL=https://fyxmppbrealxwnstuzuk.supabase.co
VITE_SUPABASE_ANON_KEY=<NOWY_KLUCZ_Z_SUPABASE>

# Zapisz (Ctrl+O, Enter, Ctrl+X)

# Restart aplikacji
docker-compose -f deployment/docker/docker-compose.production.yml restart
```

## Alternatywna metoda - przez GitHub Actions

Jeśli masz skonfigurowane GitHub Actions, możesz:
1. Push do main branch automatycznie wdroży zmiany
2. Sprawdź zakładkę Actions w GitHub

## Status aktualny:

✅ Aplikacja działa na serwerze (http://5.22.223.49)
⏳ DNS w trakcie propagacji
⚠️ Klucze API wymagają weryfikacji w Supabase
📧 Email wymaga konfiguracji SMTP w Supabase
