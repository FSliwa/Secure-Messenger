# INSTRUKCJA NAPRAWY REJESTRACJI

## PROBLEM:
"An unexpected error occurred. Please try again."

## PRZYCZYNA:
Brak triggera w bazie danych który automatycznie tworzy profil użytkownika.

---

## ROZWIĄZANIE - WYKONAJ TO TERAZ:

### KROK 1: Otwórz Supabase SQL Editor

Kliknij ten link:
```
https://supabase.com/dashboard/project/fyxmppbrealxwnstuzuk/sql/new
```

### KROK 2: Skopiuj cały poniższy kod SQL

```sql
-- OSTATECZNA NAPRAWA REJESTRACJI
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    username, 
    email, 
    display_name, 
    public_key,
    status,
    last_seen,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'public_key', ''),
    'online',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());
  
  IF new.raw_user_meta_data->>'public_key' IS NOT NULL THEN
    INSERT INTO public.encryption_keys (
      user_id, 
      public_key, 
      encrypted_private_key,
      key_type
    )
    VALUES (
      new.id,
      new.raw_user_meta_data->>'public_key',
      COALESCE(new.raw_user_meta_data->>'encrypted_private_key', ''),
      'RSA-2048'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      public_key = EXCLUDED.public_key,
      encrypted_private_key = EXCLUDED.encrypted_private_key;
  END IF;
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### KROK 3: Wklej w SQL Editor

Wklej skopiowany kod do okna SQL Editor w Supabase.

### KROK 4: Kliknij RUN

Kliknij zielony przycisk "RUN" w prawym dolnym rogu.

### KROK 5: Sprawdź wynik

Powinien pokazać:
```
Success. No rows returned
```

Oraz tabelkę z informacją o utworzonym triggerze.

### KROK 6: Spróbuj się zarejestrować ponownie

Wejdź na http://5.22.223.49 i spróbuj utworzyć konto.

---

## CO ROBI TEN SQL:

1. Usuwa stare triggery (jeśli istnieją)
2. Tworzy funkcję `handle_new_user()` która:
   - Automatycznie tworzy wpis w tabeli `users`
   - Automatycznie zapisuje klucze w `encryption_keys`
   - Działa za każdym razem gdy nowy użytkownik się rejestruje
3. Tworzy trigger który wywołuje tę funkcję

---

## JEŚLI NADAL NIE DZIAŁA:

Otwórz konsolę przeglądarki (F12) i przepisz błąd który zobaczysz.

---

## GITHUB I SERWER:

- GitHub: Zaktualizowany
- Serwer: Zaktualizowany i działa
- Aplikacja: http://5.22.223.49

Brakuje tylko triggera w bazie Supabase!
