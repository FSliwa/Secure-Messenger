# Analiza Schematu Bazy Danych - Secure Messenger

## 🔍 ANALIZA KOMPLETNOŚCI FUNKCJONALNOŚCI

### ✅ FUNKCJONALNOŚCI OBECNE W SCHEMACIE:

#### 1. **Podstawowe Funkcje Czatu**
- ✅ `users` - profile użytkowników z kluczami publicznymi
- ✅ `messages` - wiadomości z szyfrowaniem
- ✅ `conversations` - konwersacje (1-na-1 i grupowe)
- ✅ `conversation_participants` - uczestnicy konwersacji
- ✅ `message_status` - statusy wiadomości (sent/delivered/read)
- ✅ `message_attachments` - załączniki (zdjęcia, wideo, audio, dokumenty, **głos**)

#### 2. **Bezpieczeństwo i Uwierzytelnianie**
- ✅ `two_factor_auth` - uwierzytelnianie dwuskładnikowe
- ✅ `biometric_credentials` - logowanie biometryczne (odcisk, twarz)
- ✅ `trusted_devices` - zaufane urządzenia
- ✅ `account_lockouts` - blokady kont
- ✅ `login_attempts` - próby logowania
- ✅ `login_sessions` - sesje logowania
- ✅ `password_history` - historia haseł

#### 3. **Bezpieczeństwo Konwersacji**
- ✅ `conversation_passwords` - hasła do konwersacji
- ✅ `conversation_password_attempts` - próby dostępu
- ✅ `conversation_access_sessions` - sesje dostępu

#### 4. **Audyt i Monitoring**
- ✅ `security_alerts` - alerty bezpieczeństwa
- ✅ `security_audit_log` - log audytowy

### ❌ BRAKUJĄCE FUNKCJONALNOŚCI:

#### 1. **Klucze Szyfrowania**
```sql
-- BRAK tabeli dla kluczy prywatnych użytkowników
-- Aplikacja oczekuje:
CREATE TABLE public.encryption_keys (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  public_key text NOT NULL,
  encrypted_private_key text NOT NULL,
  key_type text DEFAULT 'RSA-2048' NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
```

#### 2. **Ustawienia Użytkownika**
```sql
-- Kolumny brakujące w tabeli users:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"last_seen": true, "read_receipts": true, "typing_indicators": true}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"messages": true, "mentions": true}'::jsonb;
```

#### 3. **Funkcje Pomocnicze (SECURITY DEFINER)**
```sql
-- Brak funkcji do RLS policies
CREATE OR REPLACE FUNCTION is_participant(conv_id uuid, check_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE...

CREATE OR REPLACE FUNCTION user_conversations(check_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE...
```

---

## 🔴 PROBLEM Z REJESTRACJĄ I EMAILAMI

### 1. **Błąd przy ładowaniu rejestracji**
Możliwe przyczyny:
- ❌ Brak tabeli `encryption_keys` - aplikacja próbuje zapisać klucze przy rejestracji
- ❌ Brak kolumny `email` w tabeli `users`
- ❌ RLS policies blokują tworzenie użytkownika

### 2. **Brak emaili z potwierdzeniem**

#### **DIAGNOZA:**
1. **Sprawdź konfigurację Supabase:**
   - Przejdź do: **Supabase Dashboard > Authentication > Email Templates**
   - Sprawdź czy włączone: **Enable email confirmations**

2. **Sprawdź SMTP:**
   - Supabase domyślnie używa własnego serwera email (limit 3/h dla darmowego planu)
   - Dla produkcji: **Settings > Project Settings > Auth > SMTP Settings**

3. **Typowe problemy:**
   - 🚫 Email trafia do SPAM
   - 🚫 Przekroczony limit 3 emaili/godzinę (darmowy plan)
   - 🚫 Niepoprawny URL przekierowania

---

## 🛠️ ROZWIĄZANIE KROK PO KROKU:

### **KROK 1: Dodaj brakujące tabele i kolumny**
```sql
-- 1. Tabela encryption_keys
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  public_key text NOT NULL,
  encrypted_private_key text NOT NULL,
  key_type text DEFAULT 'RSA-2048' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Brakujące kolumny w users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"last_seen": true, "read_receipts": true, "typing_indicators": true}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"messages": true, "mentions": true}'::jsonb;

-- 3. Indeksy
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_user ON public.encryption_keys(user_id);

-- 4. RLS dla encryption_keys
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own keys" ON public.encryption_keys
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT ALL ON public.encryption_keys TO authenticated;
```

### **KROK 2: Napraw email w Supabase**

1. **W Supabase Dashboard:**
   ```
   Authentication > Email Templates > Confirm signup
   - Enable email confirmations: ✅ ON
   - Subject: "Confirm your SecureChat account"
   ```

2. **Dla custom SMTP (zalecane):**
   ```
   Settings > Project Settings > Auth > SMTP Settings
   - Host: smtp.gmail.com (lub inny)
   - Port: 587
   - User: twoj-email@gmail.com
   - Pass: hasło-aplikacji
   - Sender email: noreply@twoja-domena.com
   ```

3. **Test email:**
   ```sql
   -- Sprawdź konfigurację
   SELECT * FROM auth.users WHERE email = 'twoj-test@email.com';
   ```

### **KROK 3: Napraw rejestrację w aplikacji**

Sprawdź czy aplikacja ma poprawny redirect URL:
```typescript
// W src/lib/supabase.ts lub podobnym
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: window.location.origin + '/auth/callback',
    data: {
      username,
      display_name
    }
  }
})
```

---

## 📋 PODSUMOWANIE:

### **Brakuje w bazie:**
1. ❌ Tabela `encryption_keys`
2. ❌ Kolumny w `users`: email, bio, privacy_settings, notification_preferences
3. ❌ Funkcje SECURITY DEFINER dla RLS

### **Problem z emailami:**
1. 🔧 Sprawdź Supabase Email Templates
2. 🔧 Skonfiguruj własny SMTP
3. 🔧 Sprawdź folder SPAM
4. 🔧 Zweryfikuj limit emaili (3/h darmowy plan)

**Uruchom SQL z KROK 1 aby naprawić błędy rejestracji!**
