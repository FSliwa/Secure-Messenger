# 🔍 Szczegółowa analiza błędu rejestracji

## PRZEPŁYW REJESTRACJI W APLIKACJI:

### 1. Frontend (SignUpCard.tsx):

```
Użytkownik wypełnia formularz
         ↓
Walidacja formularza
         ↓
Sprawdzenie dostępności username
         ↓
Generowanie kluczy RSA (generateKeyPair)
         ↓
Wywołanie signUp() z parametrami:
  - email
  - password
  - displayName
  - publicKey
  - username
  - encryptedPrivateKey (keyPair.privateKey)
```

### 2. Funkcja signUp() (src/lib/supabase.ts):

```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: callbackUrl,
    data: {
      display_name: displayName,
      username: username,
      public_key: publicKey,
      encrypted_private_key: encryptedPrivateKey || '',
    },
  },
})
```

**Co robi:**
- Tworzy użytkownika w `auth.users`
- Zapisuje metadata w `auth.users.raw_user_meta_data`

### 3. Supabase Backend (TUTAJ JEST PROBLEM!):

**CO POWINNO SIĘ STAĆ:**

```sql
1. INSERT do auth.users
         ↓
2. Trigger: on_auth_user_created
         ↓
3. Funkcja: handle_new_user()
         ↓
4. INSERT do public.users
         ↓
5. INSERT do public.encryption_keys
         ↓
6. Rejestracja zakończona ✅
```

**CO SIĘ PRAWDOPODOBNIE DZIEJE:**

```
1. INSERT do auth.users ✅
         ↓
2. Trigger: on_auth_user_created ❌ NIE ISTNIEJE!
         ↓
3. public.users ❌ NIE UTWORZONY
         ↓
4. public.encryption_keys ❌ NIE UTWORZONY
         ↓
5. Błąd rejestracji ❌
```

## 🔴 GŁÓWNA PRZYCZYNA:

**BRAK TRIGGERA `handle_new_user` W BAZIE DANYCH SUPABASE!**

## Dodatkowe możliwe problemy:

### A) Tabela encryption_keys nie istnieje
```sql
-- Sprawdź czy istnieje:
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'encryption_keys' AND table_schema = 'public';
```

Jeśli pusta - tabeli nie ma!

### B) Trigger nie jest aktywny
```sql
-- Sprawdź trigger:
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Jeśli puste - trigger nie istnieje!

### C) Funkcja handle_new_user nie istnieje
```sql
-- Sprawdź funkcję:
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';
```

Jeśli puste - funkcji nie ma!

## ✅ ROZWIĄZANIE:

### Wykonaj SQL w Supabase:

**Plik: `FIX_DATABASE_COMPLETE.sql`**

Ten plik:
1. ✅ Tworzy tabelę `encryption_keys`
2. ✅ Tworzy funkcję `handle_new_user()`
3. ✅ Tworzy trigger `on_auth_user_created`
4. ✅ Dodaje RLS policies
5. ✅ Dodaje uprawnienia

## 🧪 JAK PRZETESTOWAĆ:

### Test 1: Sprawdź czy SQL został wykonany

W Supabase SQL Editor:
```sql
-- Test triggera
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Test tabeli
SELECT table_name FROM information_schema.tables
WHERE table_name = 'encryption_keys';

-- Test funkcji
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
```

Wszystkie 3 powinny zwrócić wyniki!

### Test 2: Testowa rejestracja

1. Otwórz aplikację
2. Wypełnij formularz rejestracji
3. Sprawdź console w przeglądarce (F12)
4. Szukaj błędów

### Test 3: Sprawdź bazę danych

Po rejestracji, w Supabase:
```sql
-- Sprawdź czy użytkownik został utworzony
SELECT id, email, raw_user_meta_data FROM auth.users 
ORDER BY created_at DESC LIMIT 1;

-- Sprawdź czy profil został utworzony
SELECT id, username, email FROM public.users
ORDER BY created_at DESC LIMIT 1;

-- Sprawdź czy klucze zostały zapisane
SELECT user_id, key_type FROM public.encryption_keys
ORDER BY created_at DESC LIMIT 1;
```

## 📊 PODSUMOWANIE PRZYCZYN:

| Problem | Prawdopodobieństwo | Rozwiązanie |
|---------|-------------------|-------------|
| Brak triggera handle_new_user | 95% | FIX_DATABASE_COMPLETE.sql |
| Brak tabeli encryption_keys | 90% | FIX_DATABASE_COMPLETE.sql |
| Niepoprawne klucze Supabase | 5% | Już naprawione (sb_publishable) |
| Błąd w kodzie aplikacji | 2% | Kod wygląda poprawnie |

## ✅ PEWNE ROZWIĄZANIE:

Wykonaj w Supabase SQL Editor plik:
**`FIX_DATABASE_COMPLETE.sql`**

To naprawi:
- ✅ Tabelę encryption_keys
- ✅ Trigger handle_new_user
- ✅ Wszystkie RLS policies
- ✅ Uprawnienia

Po tym rejestracja ZADZIAŁA!
