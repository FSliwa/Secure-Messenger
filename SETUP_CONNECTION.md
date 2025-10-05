# Jak Naprawić Połączenie z Supabase - SecureChat

## Problem
Aplikacja obecnie używa fałszywych danych demo. Aby w pełni funkcjonować, potrzebujesz połączenia z prawdziwą bazą danych Supabase.

## Rozwiązanie - Krok po Kroku

### 1. Utwórz Projekt Supabase

1. Idź na [supabase.com](https://supabase.com)
2. Załóż konto lub zaloguj się
3. Kliknij "New Project"
4. Wypełnij dane:
   - **Nazwa**: `securechat` (lub dowolną)
   - **Hasło do bazy**: Wybierz silne hasło (ZAPISZ JE!)
   - **Region**: Wybierz najbliższy twojej lokalizacji

### 2. Skopiuj Dane Logowania

Po utworzeniu projektu:

1. Idź do **Settings** → **API**
2. Skopiuj te wartości:
   - **Project URL** (zaczyna się od `https://`)
   - **Project API Key** (klucz anon/public)

### 3. Utwórz Plik .env

W głównym katalogu projektu utwórz plik `.env` z twoimi danymi:

```bash
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=twoj-klucz-api-tutaj
```

**WAŻNE**: Zamień `https://twoj-projekt.supabase.co` i `twoj-klucz-api-tutaj` na swoje prawdziwe dane!

### 4. Utwórz Tabele w Bazie Danych

1. W Supabase idź do **SQL Editor**
2. Skopiuj i wklej CAŁĄ treść z pliku `database-schema.sql` (w głównym katalogu)
3. Kliknij **Run** aby wykonać

Alternatywnie, użyj tego skryptu z `SUPABASE_SETUP.md`.

### 5. Włącz Realtime (Opcjonalne)

Dla komunikacji w czasie rzeczywistym:

1. Idź do **Database** → **Replication**
2. Kliknij **Create a new publication**
3. Dodaj tabelę `messages`
4. Zapisz

### 6. Restart Aplikacji

Po ustawieniu wszystkiego:

1. Zatrzymaj serwer (Ctrl+C)
2. Uruchom ponownie: `npm run dev`
3. Aplikacja automatycznie sprawdzi połączenie

## Sprawdzanie Statusu

Aplikacja pokazuje baner z statusem połączenia:
- 🔴 **Czerwony**: Problem z połączeniem
- 🟡 **Żółty**: Demo mode (fałszywe dane)
- 🟢 **Zielony**: Wszystko działa!

## Rozwiązywanie Problemów

### "Database tables not found"
- Upewnij się, że wykonałeś cały skrypt SQL z kroku 4

### "Invalid API key"
- Sprawdź plik `.env`
- Zrestartuj serwer deweloperski

### "Using demo credentials"
- Plik `.env` nie istnieje lub ma błędne dane
- Sprawdź czy nazwy zmiennych są poprawne: `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`

## Bezpieczeństwo

⚠️ **NIGDY nie commituj pliku `.env` do gita!** Jest już dodany do `.gitignore`.

## Struktura Bazy Danych

Twoja baza będzie miała te tabele:
- `users` - Profile użytkowników
- `conversations` - Rozmowy
- `messages` - Wiadomości
- `message_status` - Status wiadomości (wysłane/dostarczone/przeczytane)
- `login_sessions` - Sesje logowania
- `security_alerts` - Alerty bezpieczeństwa
- `two_factor_auth` - Dwuskładnikowe uwierzytelnianie
- I inne bezpieczeństwa...

## Pomoc

Jeśli nadal masz problemy:
1. Sprawdź konsolę deweloperską (F12)
2. Sprawdź logi Supabase w dashboardzie
3. Upewnij się, że wszystkie tabele zostały utworzone poprawnie