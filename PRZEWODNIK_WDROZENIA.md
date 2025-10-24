# 🚀 Przewodnik Wdrożenia - Poprawki Konwersacji i Statusu

## 📋 Przegląd Zmian

Naprawiono dwa krytyczne problemy:
1. ✅ **Rozpoczynanie konwersacji** - eliminacja błędu RPC, sprawdzanie duplikatów
2. ✅ **Wyświetlanie aktywności użytkownika** - poprawne pobieranie `status` i `last_seen`, real-time updates

---

## 🔧 Przygotowanie

### 1. Sprawdź Środowisko

```bash
cd /Users/filipsliwa/Secure-Messenger

# Sprawdź wersję Node.js
node --version  # Powinno być >= 18

# Sprawdź czy dependencies są zainstalowane
ls node_modules | wc -l  # Powinno być > 0
```

### 2. Sprawdź Zmienione Pliki

```bash
git status

# Powinno pokazać:
# modified:   src/lib/supabase.ts
# modified:   src/components/ChatInterface.tsx
# new file:    POPRAWKI_KONWERSACJI_I_STATUSU.md
# new file:    WERYFIKACJA_SCHEMATU_BAZY.md
```

---

## 🏗️ Build Aplikacji

### Krok 1: Czyszczenie (opcjonalnie)

```bash
# Usuń stare build files
rm -rf dist/

# Wyczyść cache (opcjonalnie)
rm -rf node_modules/.vite
```

### Krok 2: Build Produkcyjny

```bash
npm run build
```

**Oczekiwany output:**
```
vite v5.x.x building for production...
✓ 1234 modules transformed.
dist/index.html                   x.xx kB │ gzip: x.xx kB
dist/assets/index-abc123.js       xxx.xx kB │ gzip: xxx.xx kB
✓ built in 12.34s
```

### Krok 3: Weryfikacja Buildu

```bash
# Sprawdź czy dist/ został utworzony
ls -lh dist/

# Powinno zawierać:
# index.html
# assets/
# vite.svg (lub inne statyczne pliki)
```

---

## 🚀 Wdrożenie na Serwer

### Opcja A: Automatyczne (z update-server.sh)

```bash
# Uruchom skrypt wdrożeniowy
./update-server.sh
```

**Skrypt wykonuje:**
1. Build aplikacji (`npm run build`)
2. Kopiuje `dist/` na serwer (scp)
3. Restartuje serwis (pm2 restart)

### Opcja B: Manualne

```bash
# 1. Skopiuj pliki na serwer
scp -r dist/* admin@5.22.223.49:/var/www/secure-messenger/

# 2. Zaloguj się na serwer
ssh admin@5.22.223.49

# 3. Sprawdź uprawnienia
cd /var/www/secure-messenger
ls -la

# 4. Restart serwisu (jeśli używasz pm2)
pm2 restart secure-messenger

# 5. Sprawdź logi
pm2 logs secure-messenger --lines 50

# 6. Sprawdź status
pm2 status
```

### Opcja C: Nginx Static (bez pm2)

```bash
# Jeśli używasz tylko Nginx do hostowania statycznych plików:

# 1. Skopiuj pliki
scp -r dist/* admin@5.22.223.49:/var/www/secure-messenger/

# 2. Sprawdź konfigurację Nginx
ssh admin@5.22.223.49
cat /etc/nginx/sites-available/secure-messenger

# 3. Reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Sprawdź status
sudo systemctl status nginx
```

---

## 🧪 Testowanie po Wdrożeniu

### Test 1: Podstawowa Funkcjonalność

```bash
# 1. Otwórz aplikację w przeglądarce
open http://5.22.223.49
# lub
open https://twojadomena.pl

# 2. Zaloguj się jako User A
# 3. Kliknij ikonę lupy (Search Users)
# 4. Wyszukaj User B
# 5. Kliknij "Chat" przy User B
```

**Oczekiwane wyniki:**
- ✅ Konwersacja zostaje utworzona
- ✅ Obie strony widzą konwersację w sidebar
- ✅ Nie pojawia się błąd "RPC create_direct_message not found"
- ✅ Ponowne kliknięcie "Chat" otwiera tę samą konwersację (brak duplikatów)

### Test 2: Wyświetlanie Statusu

```bash
# 1. User A otwiera konwersację z User B
# 2. User B zmienia zakładkę/okno (status → away)
# 3. Po 30 sekundach sprawdź sidebar User A
```

**Oczekiwane wyniki:**
- ✅ Wskaźnik statusu zmienia kolor (zielony → żółty)
- ✅ Pojawia się tekst "Zaraz wracam"
- ✅ Zmiana następuje automatycznie (bez odświeżania)

### Test 3: Last Seen

```bash
# 1. User B wylogowuje się
# 2. User A sprawdza konwersację z User B
```

**Oczekiwane wyniki:**
- ✅ Widoczne "Ostatnio aktywny [data i godzina]"
- ✅ Format: "paź 25, 14:30"
- ✅ Ikona zegara jest widoczna
- ✅ Wskaźnik statusu jest szary (offline)

### Test 4: Real-time Updates

```bash
# 1. User A otwiera aplikację (nie odświeża)
# 2. User B loguje się w innej przeglądarce
# 3. User B ustawia status na "online"
# 4. Sprawdź sidebar User A (BEZ odświeżania F5)
```

**Oczekiwane wyniki:**
- ✅ Wskaźnik statusu User B zmienia się na zielony (w czasie rzeczywistym)
- ✅ Tekst zmienia się na "Active now"
- ✅ Zmiana następuje w ciągu 1-2 sekund

---

## 🐛 Debugowanie

### Problem: Build się nie udaje

```bash
# Sprawdź błędy TypeScript
npm run build 2>&1 | grep "error TS"

# Jeśli są błędy, sprawdź:
cat src/lib/supabase.ts | grep -A 5 "createDirectMessage"
cat src/components/ChatInterface.tsx | grep -A 5 "reloadConversations"

# Przywróć poprzednią wersję jeśli potrzeba
git diff src/lib/supabase.ts
git checkout src/lib/supabase.ts  # UWAGA: traci zmiany!
```

### Problem: Status nie aktualizuje się

```bash
# Sprawdź logi przeglądarki (F12 → Console):
# Szukaj:
# "📊 Real-time user update: ..."
# "✅ User status updated successfully"

# Sprawdź czy useUserStatus działa:
# W konsoli powinno być:
# "🔄 Starting user status management for user: ..."
```

### Problem: Last seen nie wyświetla się

```bash
# Sprawdź dane w bazie Supabase:
# 1. Otwórz Supabase Dashboard
# 2. Table Editor → users
# 3. Znajdź User B
# 4. Sprawdź kolumnę last_seen (nie może być NULL)

# Jeśli last_seen jest NULL:
# Uruchom w SQL Editor:
UPDATE users 
SET last_seen = NOW() 
WHERE id = 'uuid-user-b';
```

### Problem: Duplikaty konwersacji

```bash
# Sprawdź logi serwera:
ssh admin@5.22.223.49
pm2 logs secure-messenger | grep "createDirectMessage"

# Powinno być:
# "✅ Found existing conversation: ..." - OK
# "📝 Creating new conversation..." - OK przy pierwszym
# NIE powinno być duplikatów dla tej samej pary użytkowników
```

### Problem: Subskrypcja real-time nie działa

```bash
# Sprawdź w konsoli przeglądarki:
# Powinno być:
# "✅ Supabase connection verified"
# "REALTIME SUBSCRIBE" w zakładce Network (WebSocket)

# Sprawdź RLS policies w Supabase:
# Table: users
# Policy: Users can view all profiles (SELECT) - musi być enabled
```

---

## 📊 Monitoring

### Sprawdzanie Logów Aplikacji

```bash
# Jeśli używasz pm2:
ssh admin@5.22.223.49
pm2 logs secure-messenger --lines 100

# Szukaj:
# ✅ "Loaded X conversations with full data"
# ✅ "Real-time user update: ..."
# ❌ "Failed to load conversations" - błąd!
```

### Sprawdzanie Logów Nginx

```bash
ssh admin@5.22.223.49

# Access log
sudo tail -f /var/log/nginx/access.log

# Error log
sudo tail -f /var/log/nginx/error.log

# Szukaj błędów 500/502/503
```

### Sprawdzanie Użycia Zasobów

```bash
ssh admin@5.22.223.49

# CPU i RAM
htop

# Procesy Node.js
ps aux | grep node

# Przestrzeń dyskowa
df -h
```

---

## 🔄 Rollback (w razie problemów)

### Szybki Rollback

```bash
# Na lokalnym komputerze:
git log --oneline -5  # Znajdź poprzedni commit

# Cofnij zmiany:
git revert HEAD  # Tworzy nowy commit z cofnięciem

# Build i deploy:
npm run build
./update-server.sh
```

### Pełny Rollback

```bash
# Przywróć poprzedni stan:
git reset --hard HEAD~1  # UWAGA: traci ostatni commit!

# Lub przywróć konkretny commit:
git reset --hard abc1234  # Hash poprzedniego commita

# Force push (jeśli już był push):
git push origin main --force  # UWAGA: nadpisuje remote!

# Build i deploy:
npm run build
./update-server.sh
```

---

## ✅ Checklist Wdrożenia

- [ ] Zmiany w `src/lib/supabase.ts` są commitowane
- [ ] Zmiany w `src/components/ChatInterface.tsx` są commitowane
- [ ] Dokumentacja (`POPRAWKI_KONWERSACJI_I_STATUSU.md`) jest utworzona
- [ ] `npm run build` kończy się bez błędów
- [ ] `dist/` folder został utworzony
- [ ] Pliki skopiowane na serwer (via scp lub script)
- [ ] Serwis/Nginx został zrestartowany
- [ ] Aplikacja otwiera się w przeglądarce
- [ ] Test 1: Tworzenie konwersacji działa
- [ ] Test 2: Status użytkownika wyświetla się poprawnie
- [ ] Test 3: Last seen wyświetla się dla offline users
- [ ] Test 4: Real-time updates działają
- [ ] Brak błędów w konsoli przeglądarki
- [ ] Brak błędów w logach serwera

---

## 📞 Wsparcie

Jeśli napotkasz problemy:

1. **Sprawdź logi** - większość problemów jest tam widoczna
2. **Sprawdź dokumentację** - przeczytaj `POPRAWKI_KONWERSACJI_I_STATUSU.md`
3. **Sprawdź schemat** - przeczytaj `WERYFIKACJA_SCHEMATU_BAZY.md`
4. **Sprawdź RLS policies** w Supabase Dashboard
5. **Sprawdź network tab** (F12) - czy API calls się udają

---

**Data utworzenia:** 25 października 2025  
**Wersja:** 1.0  
**Status:** ✅ Gotowe do wdrożenia
