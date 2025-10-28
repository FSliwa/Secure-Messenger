# Problem z kluczami Supabase - Różne formaty

## ❌ Podane klucze (NOWY FORMAT):
```
Publishable: sb_publishable_Jau8JdiOFfVKQOM1svLxMQ_9-sBqnKc
Secret: sb_secret_ek5NhQ2-BVZd-7yHw3RYhw_-sx2qOse
```

## ✅ Aplikacja wymaga kluczy JWT (STANDARDOWY FORMAT):
```
anon (public): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Gdzie znaleźć właściwe klucze:

### 1. Zaloguj się do Supabase Dashboard:
https://app.supabase.com/project/fyxmppbrealxwnstuzuk

### 2. Przejdź do Settings > API

### 3. Znajdź sekcję "Project API keys":

![Supabase API Keys](https://i.imgur.com/example.png)

Powinieneś zobaczyć:
- **anon (public)** - długi string zaczynający się od `eyJ...`
- **service_role (secret)** - długi string zaczynający się od `eyJ...`

### 4. Przykład prawidłowych kluczy JWT:
```
anon: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eG1wcGJyZWFseHduc3R1enVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDcyNjYsImV4cCI6MjA3NTE4MzI2Nn0.P_u5yDgASYwx-ImH-QhTTqAO8xM96DvUkgJ1tCm-8Pw

service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eG1wcGJyZWFseHduc3R1enVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwNzI2NiwiZXhwIjoyMDc1MTgzMjY2fQ._exYkOlAqEYUMTyqt8AByk2IE7rqIUghG3rtbpsedBI
```

## Możliwe przyczyny problemu:

1. **Projekt był PAUSED** - czy udało się go przywrócić?
2. **Nowe klucze vs stare** - aplikacja używa starego SDK który wymaga JWT
3. **Różne projekty** - czy na pewno patrzysz na właściwy projekt?

## Co zrobić:

1. **Sprawdź status projektu** - czy jest aktywny?
2. **Znajdź klucze JWT** w Settings > API
3. **Jeśli nie ma kluczy JWT** - może to być nowy projekt który używa innego systemu autoryzacji

## Alternatywa:

Jeśli Supabase zmienił system kluczy, możemy:
1. Zaktualizować SDK do najnowszej wersji
2. Zmienić sposób autoryzacji w aplikacji
3. Utworzyć nowy projekt ze starym systemem kluczy
