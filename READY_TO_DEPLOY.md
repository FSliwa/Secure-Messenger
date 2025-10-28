# 🎉 GOTOWE DO WDROŻENIA!

## ✅ CO ZOSTAŁO ZROBIONE:

1. **Zaktualizowano aplikację** do nowych kluczy Supabase
   - Plik `src/lib/supabase.ts` używa teraz `sb_publishable_` i `sb_secret_`
   - Zachowana kompatybilność wsteczna ze starymi zmiennymi

2. **Przygotowano skrypt wdrożeniowy**
   - Plik `DEPLOY_WITH_NEW_KEYS.sh` zawiera wszystkie komendy

3. **Zaktualizowano GitHub**
   - Wszystkie zmiany wysłane do repozytorium

## 🚀 JAK WDROŻYĆ NA SERWER:

### Metoda 1: Kopiuj-wklej (NAJŁATWIEJSZA)

1. **Połącz się z serwerem** przez Web Console UpCloud

2. **Skopiuj i wklej te komendy POJEDYNCZO:**

```bash
cd /opt/Secure-Messenger
```

```bash
git pull origin main
```

```bash
cat > .env.production << 'EOF'
NODE_ENV=production
VITE_SUPABASE_URL=https://fyxmppbrealxwnstuzuk.supabase.co
VITE_SUPABASE_KEY=sb_publishable_Jau8JdiOFfVKQOM1svLxMQ_9-sBqnKc
SUPABASE_SERVICE_KEY=sb_secret_ek5NhQ2-BVZd-7yHw3RYhw_-sx2qOse
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://5.22.223.49,http://secure-messenger.info,https://secure-messenger.info
LOG_LEVEL=info
EOF
```

```bash
docker-compose -f deployment/docker/docker-compose.production.yml down
```

```bash
docker-compose -f deployment/docker/docker-compose.production.yml build --no-cache
```

```bash
docker-compose -f deployment/docker/docker-compose.production.yml up -d
```

```bash
docker ps
```

```bash
docker logs secure-messenger-app --tail 50
```

### Metoda 2: Użyj skryptu

```bash
cd /opt/Secure-Messenger
bash DEPLOY_WITH_NEW_KEYS.sh
```

## ✅ WERYFIKACJA:

Po wdrożeniu sprawdź:

1. **Status Dockera:**
   ```bash
   docker ps
   ```
   Powinien pokazać działający kontener `secure-messenger-app`

2. **Logi aplikacji:**
   ```bash
   docker logs secure-messenger-app
   ```
   Nie powinno być błędów

3. **Test HTTP:**
   ```bash
   curl http://localhost/
   ```
   Powinien zwrócić HTML aplikacji

4. **Otwórz w przeglądarce:**
   - http://5.22.223.49
   - http://secure-messenger.info (gdy DNS się rozpropaguje)

## 🎯 OCZEKIWANY REZULTAT:

- ✅ Aplikacja działa
- ✅ Rejestracja działa
- ✅ Logowanie działa
- ✅ Wysyłanie wiadomości działa
- ✅ Wszystkie funkcje działają z nowymi kluczami!

## 🆘 JEŚLI COŚ NIE DZIAŁA:

Sprawdź logi:
```bash
docker logs secure-messenger-app -f
```

Jeśli widzisz błąd z kluczami API, sprawdź plik `.env.production`:
```bash
cat .env.production
```

## 📝 PODSUMOWANIE KLUCZY:

Twój projekt Supabase używa NOWYCH kluczy:
- ✅ Publishable: `sb_publishable_Jau8JdiOFfVKQOM1svLxMQ_9-sBqnKc`
- ✅ Secret: `sb_secret_ek5NhQ2-BVZd-7yHw3RYhw_-sx2qOse`

Aplikacja została zaktualizowana aby z nich korzystać!
