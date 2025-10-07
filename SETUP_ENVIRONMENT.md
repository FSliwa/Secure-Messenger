# 🔧 Konfiguracja Środowiska dla Testów Email

## 📋 Kroki do wykonania:

### 1. Utwórz plik `.env.local`
```bash
cp .env.example .env.local
```

### 2. Uzupełnij dane Supabase
Otwórz `.env.local` i dodaj swoje dane z Supabase Dashboard:

```env
# Znajdziesz w: Settings → API
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here
```

### 3. Gdzie znaleźć te dane:
1. Zaloguj się do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz swój projekt
3. Przejdź do **Settings → API**
4. Skopiuj:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

## 🧪 Uruchomienie testów:

### Test 1: Sprawdzenie konfiguracji
```bash
npm run check:config
```

Powinieneś zobaczyć:
```
✅ Successfully connected to Supabase
```

### Test 2: Test w przeglądarce (zalecane)
```bash
npm run test:email-flows
```

1. Otworzy się strona HTML
2. Wprowadź swoje dane Supabase
3. Przetestuj rejestrację i reset hasła
4. Sprawdź logi na stronie

### Test 3: Test w terminalu
```bash
# Test rejestracji
npm run test:registration

# Test resetowania hasła  
npm run test:password-reset
```

## ⚠️ Ważne ustawienia w Supabase:

### Authentication → Email Templates
Sprawdź czy masz skonfigurowane szablony:
- ✅ Confirm signup
- ✅ Reset password
- ✅ Magic Link
- ✅ Change Email Address

### Settings → Auth
Upewnij się że:
- ✅ Enable email signup = ON
- ✅ Enable email confirmation = ON

### Authentication → URL Configuration
Dodaj te adresy do Redirect URLs:
```
http://localhost:5173/**
http://localhost:5173/auth/callback
http://localhost:5173/reset-password
http://localhost:5173/dashboard
```

## 🔍 Rozwiązywanie problemów:

### "Missing Supabase environment variables"
→ Upewnij się że plik `.env.local` istnieje i ma prawidłowe dane

### "Connection failed"
→ Sprawdź czy URL i klucz są poprawne

### Email nie przychodzi
→ Sprawdź folder SPAM
→ Sprawdź limity (3 emaile/godzinę)
→ Sprawdź logi w Supabase Dashboard

## 📊 Przykładowy plik .env.local:

```env
# Supabase
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNDU4NDI3OSwiZXhwIjoxOTUwMTYwMjc5fQ.1234567890abcdefghijklmnopqrstuvwxyz

# App
VITE_APP_URL=http://localhost:5173
VITE_REDIRECT_URL=http://localhost:5173
VITE_ENVIRONMENT=development
VITE_DEBUG_MODE=true
```

## ✅ Gotowe do testowania!

Po skonfigurowaniu środowiska możesz przetestować:
1. Rejestrację nowego użytkownika
2. Wysyłkę emaila weryfikacyjnego
3. Reset hasła
4. Logowanie po weryfikacji

Pamiętaj o sprawdzeniu folderu SPAM!
