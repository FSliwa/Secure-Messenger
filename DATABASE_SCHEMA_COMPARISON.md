# 🔍 Porównanie Schematu Bazy Danych - Supabase vs Lokalne Pliki

## ⚠️ GŁÓWNE RÓŻNICE I BRAKUJĄCE ELEMENTY

### ✅ Tabele które ISTNIEJĄ w obu miejscach:

1. **users** - ✅ Zgodna
2. **two_factor_auth** - ✅ Zgodna  
3. **trusted_devices** - ✅ Zgodna
4. **biometric_credentials** - ✅ Zgodna (dodano: `counter`, `transports`)
5. **login_sessions** - ✅ Zgodna
6. **security_alerts** - ✅ Zgodna
7. **conversations** - ✅ Zgodna
8. **conversation_participants** - ✅ Zgodna
9. **messages** - ✅ Zgodna (dodano: `auto_delete_at`, `forwarding_disabled`)
10. **message_status** - ✅ Zgodna

---

### ❌ Tabele które są w Supabase ALE BRAK w lokalnych plikach:

#### 1. **account_lockouts** ⚠️ BRAK
```sql
CREATE TABLE public.account_lockouts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  locked_until timestamp with time zone NOT NULL,
  locked_by text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT account_lockouts_pkey PRIMARY KEY (id),
  CONSTRAINT account_lockouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```
**Status:** ❌ Tabela nie istnieje w database-schema.sql
**Potrzebna:** TAK - zabezpieczenie przed brute-force
**Pliki aplikacji:** Istnieje `src/lib/account-lockout.ts` który używa tej tabeli!

---

#### 2. **login_attempts** ⚠️ BRAK
```sql
CREATE TABLE public.login_attempts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  user_id uuid,
  attempt_time timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  failure_reason text,
  device_fingerprint text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT login_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```
**Status:** ❌ Tabela nie istnieje
**Potrzebna:** TAK - tracking prób logowania
**Pliki aplikacji:** `src/lib/account-lockout.ts` używa tej tabeli!

---

#### 3. **password_history** ⚠️ BRAK
```sql
CREATE TABLE public.password_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '1 year'::interval),
  CONSTRAINT password_history_pkey PRIMARY KEY (id),
  CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```
**Status:** ❌ Tabela nie istnieje
**Potrzebna:** TAK - zapobiega ponownemu użyciu starych haseł
**Pliki aplikacji:** `src/lib/password-history.ts` używa tej tabeli!

---

#### 4. **conversation_passwords** ⚠️ BRAK
```sql
CREATE TABLE public.conversation_passwords (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL UNIQUE,
  password_hash text NOT NULL,
  salt text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  password_hint text,
  max_attempts integer DEFAULT 3,
  lockout_duration integer DEFAULT 300,
  CONSTRAINT conversation_passwords_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_passwords_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT conversation_passwords_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
```
**Status:** ❌ Tabela nie istnieje
**Potrzebna:** TAK - zabezpieczenie konwersacji hasłem
**Pliki aplikacji:** `src/lib/conversation-security.ts` używa tej tabeli!

---

#### 5. **conversation_password_attempts** ⚠️ BRAK
```sql
CREATE TABLE public.conversation_password_attempts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  attempt_time timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT conversation_password_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_password_attempts_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT conversation_password_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```
**Status:** ❌ Tabela nie istnieje
**Potrzebna:** TAK - tracking prób dostępu do konwersacji

---

#### 6. **conversation_access_sessions** ⚠️ BRAK
```sql
CREATE TABLE public.conversation_access_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  unlocked_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone DEFAULT (now() + '02:00:00'::interval),
  device_fingerprint text,
  session_token text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT conversation_access_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_access_sessions_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT conversation_access_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```
**Status:** ❌ Tabela nie istnieje
**Potrzebna:** TAK - sesje dostępu do zabezpieczonych konwersacji

---

#### 7. **security_audit_log** ⚠️ BRAK
```sql
CREATE TABLE public.security_audit_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['login_success'::text, 'login_failure'::text, 'account_locked'::text, 'account_unlocked'::text, 'password_changed'::text, '2fa_enabled'::text, '2fa_disabled'::text, 'device_trusted'::text, 'device_untrusted'::text, 'biometric_enrolled'::text, 'biometric_removed'::text, 'conversation_password_set'::text, 'conversation_unlocked'::text, 'suspicious_activity'::text])),
  event_data jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  device_fingerprint text,
  severity text DEFAULT 'info'::text CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT security_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT security_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```
**Status:** ❌ Tabela nie istnieje
**Potrzebna:** TAK - audit wszystkich akcji bezpieczeństwa
**Pliki aplikacji:** `src/lib/security-audit.ts` używa tej tabeli!

---

### 📊 PODSUMOWANIE:

#### ✅ Tabele zgodne: 10
#### ❌ Brakujące tabele: 7

**KRYTYCZNE BRAKI:**
1. `account_lockouts` - Aplikacja NIE MOŻE logować użytkowników poprawnie
2. `login_attempts` - Brak trackingu prób logowania
3. `password_history` - Brak historii haseł
4. `conversation_passwords` - Konwersacje nie mogą być zabezpieczone hasłem
5. `conversation_password_attempts` - Brak trackingu prób dostępu
6. `conversation_access_sessions` - Brak sesji dostępu
7. `security_audit_log` - Brak auditowania zdarzeń bezpieczeństwa

---

### 🔥 DODATKOWE RÓŻNICE:

#### users - Dodane kolumny w Supabase:
- ✅ `email` - w Supabase, brak w database-schema.sql
- ✅ `bio` - w Supabase, brak w database-schema.sql  
- ✅ `privacy_settings` - w Supabase, brak w database-schema.sql
- ✅ `notification_preferences` - w Supabase, brak w database-schema.sql

#### biometric_credentials - Dodane kolumny w Supabase:
- ✅ `counter` INTEGER - w Supabase, brak w database-schema.sql
- ✅ `transports` ARRAY - w Supabase, brak w database-schema.sql

#### messages - Dodane kolumny w Supabase:
- ✅ `auto_delete_at` - w Supabase, brak w database-schema.sql
- ✅ `forwarding_disabled` - w Supabase (domyślnie true), brak w database-schema.sql

---

## 🚨 WYMAGANE AKCJE:

### 1. Dodaj brakujące tabele do database-schema.sql
### 2. Zaktualizuj Supabase o brakujące tabele
### 3. Dodaj RLS (Row Level Security) policies dla nowych tabel
### 4. Dodaj indeksy dla wydajności
### 5. Dodaj triggery (np. auto-update updated_at)

---

## ✅ ROZWIĄZANIE:

Utworzę kompletny plik migracji `complete-security-schema.sql` który:
1. Dodaje wszystkie brakujące tabele
2. Tworzy RLS policies  
3. Dodaje indeksy
4. Tworzy funkcje pomocnicze

