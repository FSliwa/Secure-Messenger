# 🔍 Jak znaleźć klucze JWT w Supabase

## Twoja sytuacja:
- ✅ Projekt Supabase DZIAŁA (sprawdzone!)
- ✅ Masz działające klucze w nowym formacie (sb_publishable_, sb_secret_)
- ❌ Aplikacja potrzebuje kluczy JWT (eyJ...)

## Gdzie szukać kluczy JWT:

### 1. Zaloguj się do Supabase Dashboard
https://app.supabase.com/project/fyxmppbrealxwnstuzuk

### 2. Przejdź do Settings > API

### 3. Szukaj tych sekcji:

#### A) **"Project API keys"** - powinny być 2 klucze:
- **anon (public)** - długi string zaczynający się od `eyJ...`
- **service_role (secret)** - długi string zaczynający się od `eyJ...`

#### B) **"JWT Settings"** - może być w osobnej zakładce

#### C) **"Configuration"** - czasem klucze są tam

### 4. Jak wyglądają klucze JWT:

```
anon key (public):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eG1wcGJyZWFseHduc3R1enVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDcyNjYsImV4cCI6MjA3NTE4MzI2Nn0.P_u5yDgASYwx-ImH-QhTTqAO8xM96DvUkgJ1tCm-8Pw

service_role key (secret):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eG1wcGJyZWFseHduc3R1enVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNzI2NiwiZXhwIjoyMDc1MTgzMjY2fQ._exYkOlAqEYUMTyqt8AByk2IE7rqIUghG3rtbpsedBI
```

### 5. Możliwe lokalizacje w Dashboard:

1. **Settings > API > Project API keys**
2. **Settings > API > JWT Settings**
3. **Project Settings > API**
4. **Authentication > Providers > Email (czasem pokazuje klucze)**

## Jeśli nie możesz znaleźć kluczy JWT:

### Opcja 1: Sprawdź email
Supabase wysyła email z kluczami przy tworzeniu projektu. Szukaj: "Your Supabase project is ready"

### Opcja 2: Regeneruj klucze
W Settings > API może być opcja "Reveal" lub "Regenerate JWT Secret"

### Opcja 3: Kontakt z supportem
Jeśli projekt został utworzony dawno temu, możliwe że używa nowego systemu. Napisz do support@supabase.com

## WAŻNE:
Klucze które masz (sb_publishable_, sb_secret_) to NOWY system. Aplikacja używa STAREGO systemu (JWT). Musimy znaleźć stare klucze lub zaktualizować aplikację.
