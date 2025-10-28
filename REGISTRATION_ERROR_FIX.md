# Rozwiązanie błędu "An unexpected error occurred" podczas rejestracji

## 🔍 PRZYCZYNA BŁĘDU

Błąd występuje, ponieważ w bazie danych Supabase **BRAKUJE**:

1. **Tabeli `encryption_keys`** - aplikacja próbuje zapisać klucze szyfrowania
2. **Kolumn w tabeli `users`**: `email`, `bio`, `privacy_settings`, `notification_preferences`
3. **Triggera `handle_new_user`** który automatycznie tworzy profil użytkownika

## 🛠️ ROZWIĄZANIE - 3 KROKI

### KROK 1: Uruchom SQL naprawczy w Supabase

1. Otwórz plik: **`FIX_REGISTRATION_AND_EMAIL.sql`** (utworzony wcześniej)
2. **Skopiuj CAŁY kod** z tego pliku
3. Idź do **Supabase Dashboard > SQL Editor**
4. **Wklej** kod
5. Kliknij **RUN**

Ten SQL:
- ✅ Utworzy tabelę `encryption_keys`
- ✅ Doda brakujące kolumny do `users`
- ✅ Utworzy trigger automatycznego tworzenia profilu
- ✅ Naprawi RLS policies

### KROK 2: Sprawdź konfigurację emaili

1. Idź do: **Supabase Dashboard > Authentication > Email Templates**
2. Upewnij się że jest włączone: **✅ Enable email confirmations**
3. Jeśli nie dostajesz emaili:
   - Sprawdź folder **SPAM**
   - Lub skonfiguruj własny SMTP (Settings > Auth > SMTP)

### KROK 3: Wyczyść cache przeglądarki

1. Naciśnij **Ctrl+F5** (Windows) lub **Cmd+Shift+R** (Mac)
2. Lub otwórz w trybie incognito

## 📝 DEBUGOWANIE

Jeśli błąd nadal występuje, sprawdź logi w konsoli przeglądarki:

1. Otwórz **DevTools** (F12)
2. Idź do zakładki **Console**
3. Spróbuj się zarejestrować
4. Zobacz dokładny błąd

## 🔧 ALTERNATYWNE ROZWIĄZANIE

Jeśli SQL nie działa, możesz ręcznie utworzyć tabelę:

```sql
-- Tylko tabela encryption_keys (minimum do działania)
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  public_key text NOT NULL,
  encrypted_private_key text NOT NULL,
  key_type text DEFAULT 'RSA-2048' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own keys" ON public.encryption_keys
  FOR ALL USING (user_id = auth.uid());

GRANT ALL ON public.encryption_keys TO authenticated;
```

## ⚠️ WAŻNE

- **Limit emaili**: 3/godzinę na darmowym planie Supabase
- **Weryfikacja**: Po rejestracji sprawdź email (także SPAM)
- **Trigger**: Automatycznie utworzy profil użytkownika po weryfikacji emaila
