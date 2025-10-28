# 📊 Raport Walidacji Schematu - Supabase vs Aplikacja

**Data:** 8 października 2025  
**Supabase Project:** fyxmppbrealxwnstuzuk

---

## 🔍 PORÓWNANIE SCHEMATÓW

### ✅ TABELE ZGODNE (Podstawowa struktura OK)

1. **users** ✅
2. **two_factor_auth** ✅
3. **trusted_devices** ✅
4. **biometric_credentials** ✅
5. **login_sessions** ✅
6. **login_attempts** ✅
7. **security_alerts** ✅
8. **security_audit_log** ✅
9. **password_history** ✅
10. **account_lockouts** ✅
11. **conversations** ✅
12. **conversation_participants** ✅
13. **conversation_passwords** ✅
14. **conversation_password_attempts** ✅
15. **conversation_access_sessions** ✅
16. **messages** ✅
17. **message_status** ✅
18. **message_attachments** ✅

---

## ⚠️ ZIDENTYFIKOWANE RÓŻNICE

### 1. **conversation_access_sessions** - Brak Foreign Key

**W Supabase:**
```sql
CONSTRAINT conversation_access_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
-- BRAK: conversation_id_fkey
```

**Powinno być:**
```sql
CONSTRAINT conversation_access_sessions_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
```

**Fix:**
```sql
ALTER TABLE public.conversation_access_sessions 
ADD CONSTRAINT conversation_access_sessions_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
```

---

### 2. **conversation_participants** - Różnice w DEFAULT/NOT NULL

**W Supabase (podane):**
```sql
joined_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
is_active boolean NOT NULL DEFAULT true,
```

**W aplikacji (database-schema.sql):**
```sql
joined_at timestamp with time zone DEFAULT now(),
is_active boolean DEFAULT true,
```

**Ocena:** ✅ Supabase lepszy (NOT NULL jest bezpieczniejsze)  
**Akcja:** Żadna - zostaw jak jest w Supabase

---

### 3. **conversations** - Różnice w DEFAULT/NOT NULL

**W Supabase:**
```sql
is_group boolean NOT NULL DEFAULT false,
created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
```

**W aplikacji:**
```sql
is_group boolean DEFAULT false,
created_at timestamp with time zone DEFAULT now(),
updated_at timestamp with time zone DEFAULT now(),
```

**Ocena:** ✅ Supabase lepszy (NOT NULL jest bezpieczniejsze)  
**Akcja:** Żadna

---

### 4. **conversation_passwords** - Brak Foreign Key do conversations

**W Supabase:**
```sql
-- BRAK: conversation_id_fkey
```

**Powinno być:**
```sql
CONSTRAINT conversation_passwords_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE
```

**Fix:**
```sql
ALTER TABLE public.conversation_passwords 
ADD CONSTRAINT conversation_passwords_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
```

---

### 5. **conversation_password_attempts** - Brak Foreign Key do conversations

**W Supabase:**
```sql
-- BRAK: conversation_id_fkey
```

**Powinno być:**
```sql
CONSTRAINT conversation_password_attempts_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE
```

**Fix:**
```sql
ALTER TABLE public.conversation_password_attempts 
ADD CONSTRAINT conversation_password_attempts_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
```

---

### 6. **messages** - Różnice w sender_id constraint

**W Supabase:**
```sql
CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
```

**Powinno być (dla spójności):**
```sql
CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
```

**Ocena:** ⚠️ Oba działają, ale lepiej odwoływać się do public.users  
**Akcja:** Opcjonalne, nie krytyczne

---

### 7. **message_attachments** - Brak Foreign Key do messages

**W Supabase:**
```sql
-- BRAK foreign key constraint!
```

**Powinno być:**
```sql
CONSTRAINT message_attachments_message_id_fkey 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE
```

**Fix:**
```sql
ALTER TABLE public.message_attachments 
ADD CONSTRAINT message_attachments_message_id_fkey 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;
```

---

### 8. **users** - public_key DEFAULT

**W Supabase:**
```sql
public_key text NOT NULL DEFAULT ''::text,
```

**W aplikacji:**
```sql
public_key text NOT NULL,
```

**Ocena:** ⚠️ Default ''::text może powodować problemy (pusty klucz jest nieprawidłowy)  
**Akcja:** Lepiej bez DEFAULT, wymuszaj podanie klucza przy tworzeniu

**Fix:**
```sql
ALTER TABLE public.users 
ALTER COLUMN public_key DROP DEFAULT;
```

---

## 🔧 KOMPLETNY FIX SQL

### Plik: `schema_constraints_fix.sql`

```sql
-- =====================================================
-- FIX: Brakujące Foreign Key Constraints
-- =====================================================

-- 1. conversation_access_sessions → conversations
ALTER TABLE public.conversation_access_sessions 
ADD CONSTRAINT IF NOT EXISTS conversation_access_sessions_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- 2. conversation_passwords → conversations
ALTER TABLE public.conversation_passwords 
ADD CONSTRAINT IF NOT EXISTS conversation_passwords_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- 3. conversation_password_attempts → conversations
ALTER TABLE public.conversation_password_attempts 
ADD CONSTRAINT IF NOT EXISTS conversation_password_attempts_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- 4. message_attachments → messages
ALTER TABLE public.message_attachments 
ADD CONSTRAINT IF NOT EXISTS message_attachments_message_id_fkey 
FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

-- 5. Usuń problematyczny DEFAULT dla public_key
ALTER TABLE public.users 
ALTER COLUMN public_key DROP DEFAULT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Foreign Key Constraints Added!';
  RAISE NOTICE '';
  RAISE NOTICE 'Added constraints:';
  RAISE NOTICE '- conversation_access_sessions → conversations';
  RAISE NOTICE '- conversation_passwords → conversations';
  RAISE NOTICE '- conversation_password_attempts → conversations';
  RAISE NOTICE '- message_attachments → messages';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '- users.public_key DEFAULT removed';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Schema integrity improved!';
END $$;
```

---

## 📊 PODSUMOWANIE RÓŻNIC

| Tabela | Problem | Priorytet | Status |
|--------|---------|-----------|--------|
| conversation_access_sessions | Brak FK do conversations | 🟡 MEDIUM | Fix ready |
| conversation_passwords | Brak FK do conversations | 🟡 MEDIUM | Fix ready |
| conversation_password_attempts | Brak FK do conversations | 🟡 MEDIUM | Fix ready |
| message_attachments | Brak FK do messages | 🔴 HIGH | Fix ready |
| users | Problematyczny DEFAULT | 🟢 LOW | Fix ready |
| conversation_participants | NOT NULL różnice | ✅ OK | Supabase lepszy |
| conversations | NOT NULL różnice | ✅ OK | Supabase lepszy |

---

## ✅ CO ZROBIĆ

### Opcja A: Uruchom fix (zalecane)
Wszystkie fixe są w pliku `schema_constraints_fix.sql` (tworzony automatycznie).

### Opcja B: Zostaw jak jest
Większość różnic nie jest krytyczna. Aplikacja będzie działać, ale:
- ⚠️ Brak integralności referencyjnej dla niektórych relacji
- ⚠️ Usuwanie conversations nie usunie powiązanych rekordów automatycznie

---

## 🎯 REKOMENDACJA

**Uruchom `schema_constraints_fix.sql` w Supabase** - zajmie 2 minuty, poprawi integralność bazy.

---

*Raport wygenerowany: 8 października 2025*  
*Wszystkie tabele istnieją, wymagają tylko drobnych poprawek FK*
