# 🔍 DLACZEGO NIE WIDZISZ ZMIAN - DIAGNOZA

## ❗ NAJCZĘSTSZA PRZYCZYNA

**90% prawdopodobieństwa:**
❌ **NIE WYKONANO SQL W SUPABASE**

SQL `FIX_CONVERSATIONS_RLS.sql` jest **WYMAGANY** - bez niego:
- ❌ RLS policies dla conversations nie zostały utworzone → błąd przy tworzeniu konwersacji
- ❌ RLS policies dla users nie zostały zaktualizowane → status nie działa
- ❌ Trigger `update_user_status_on_activity` nie istnieje → brak auto-status
- ❌ Function `set_user_status()` nie istnieje → hook nie może zaktualizować statusu

**Kod TypeScript na serwerze JUŻ JEST** - ale **potrzebuje SQL w bazie!**

---

## ✅ KROK PO KROKU - NAPRAW TO W 5 MINUT

### KROK 1: Sprawdź czy SQL został wykonany

Otwórz Supabase SQL Editor i uruchom:

```sql
-- Sprawdź ile policies jest dla conversations
SELECT COUNT(*) as conversations_policies 
FROM pg_policies 
WHERE tablename = 'conversations';

-- Sprawdź ile policies jest dla users  
SELECT COUNT(*) as users_policies 
FROM pg_policies 
WHERE tablename = 'users';

-- Sprawdź czy funkcje istnieją
SELECT COUNT(*) as status_functions
FROM pg_proc 
WHERE proname IN ('update_user_status_on_activity', 'set_user_status');
```

**JEŚLI WYNIK TO:**
```
conversations_policies: 0 lub < 4  ❌ SQL NIE BYŁ WYKONANY
users_policies: 0 lub < 4          ❌ SQL NIE BYŁ WYKONANY  
status_functions: 0                ❌ SQL NIE BYŁ WYKONANY
```

**TO ZNACZY: MUSISZ EXECUTE SQL!**

---

### KROK 2: Execute SQL w Supabase (WYMAGANE!)

1. Otwórz: https://supabase.com/dashboard
2. Wybierz projekt
3. **SQL Editor** (lewa kolumna)
4. Skopiuj **CAŁY** SQL poniżej:

```sql
-- ============================================================================
--  FIX: Conversations RLS Policy + User Status
-- ============================================================================

-- 1. FIX CONVERSATIONS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS conversations_insert ON conversations;
DROP POLICY IF EXISTS conversations_select ON conversations;
DROP POLICY IF EXISTS conversations_update ON conversations;
DROP POLICY IF EXISTS conversations_delete ON conversations;

CREATE POLICY conversations_insert
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY conversations_select
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY conversations_update
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY conversations_delete
  ON conversations
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- 2. FIX USER STATUS UPDATES
-- ============================================================================

DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_update_own_status ON users;
DROP POLICY IF EXISTS users_delete ON users;
DROP POLICY IF EXISTS view_users ON users;

CREATE POLICY users_select
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY users_insert
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY users_update
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY users_delete
  ON users
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- 3. CREATE STATUS UPDATE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_status_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET 
    status = 'online',
    last_seen = NOW(),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_status_on_login ON login_sessions;
CREATE TRIGGER trigger_update_status_on_login
  AFTER INSERT ON login_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_status_on_activity();

CREATE OR REPLACE FUNCTION public.set_user_status(
  p_user_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('online', 'offline', 'away') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be online, offline, or away', p_status;
  END IF;
  
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot update status for other users';
  END IF;
  
  UPDATE users
  SET 
    status = p_status,
    last_seen = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- VERIFICATION
SELECT '✅ FIX COMPLETE' as status;
```

5. **Kliknij RUN**
6. Poczekaj 2-3 sekundy

**Powinien pokazać:**
```
✅ FIX COMPLETE
```

---

### KROK 3: Wyczyść cache przeglądarki

**WAŻNE!** Nawet jeśli serwer ma nowy kod, przeglądarka może używać starego:

**Opcja A - Hard Refresh (najszybsze):**
```
Ctrl + Shift + R     (Windows/Linux)
Cmd + Shift + R      (macOS)
```

**Opcja B - Tryb incognito (100% pewne):**
```
Ctrl + Shift + N     (Chrome/Edge)
Cmd + Shift + N      (Safari)
```

**Opcja C - Wyczyść cache ręcznie:**
1. F12 → Network tab
2. Prawy przycisk na dowolny request
3. "Clear browser cache"
4. Odśwież stronę (F5)

---

### KROK 4: Sprawdź czy nowa wersja się załadowała

1. Otwórz: https://secure-messenger.info
2. **F12** → Console
3. Wpisz:
   ```javascript
   localStorage.clear()
   location.reload()
   ```
4. Po odświeżeniu sprawdź Console:
   - ✅ Powinno być: `"✅ Supabase connection verified"`
   - ✅ Powinno być: `"👤 User status: online"` (po zalogowaniu)

---

## 🔍 WERYFIKACJA - CO DOKŁADNIE NIE DZIAŁA?

Proszę sprawdź i odpowiedz:

### Pytanie 1: Czy wykonałeś SQL w Supabase?
- [ ] TAK - wykonałem FIX_CONVERSATIONS_RLS.sql
- [ ] NIE - jeszcze nie wykonałem
- [ ] NIE WIEM

### Pytanie 2: Jaki błąd widzisz przy tworzeniu konwersacji?
- [ ] "new row violates row-level security policy for table conversations"
- [ ] "Failed to load messages"  
- [ ] Inny błąd (jaki?)
- [ ] Brak błędu, ale nic się nie dzieje

### Pytanie 3: Co widzisz w Console (F12)?
- [ ] Brak błędów
- [ ] Błędy TypeScript
- [ ] Błędy RLS/permission
- [ ] Brak logów "👤 User status"

### Pytanie 4: Czy odświeżyłeś stronę przez Ctrl+Shift+R?
- [ ] TAK - hard refresh
- [ ] NIE - normalny F5
- [ ] TAK - tryb incognito

---

## 🎯 NAJPRAWDOPODOBNIEJSZE ROZWIĄZANIE

**Jeśli NIE wykonałeś SQL:**
→ Execute `FIX_CONVERSATIONS_RLS.sql` w Supabase SQL Editor

**Jeśli wykonałeś SQL, ale nadal błędy:**
→ Wyczyść cache (Ctrl+Shift+R) i sprawdź Console

**Jeśli po hard refresh nadal problem:**
→ Prześlij screenshot z Console (F12) i Network tab

---

## 🚨 DEBUG CHECKLIST

Zrób to i powiedz mi wyniki:

```
[ ] 1. Execute SQL w Supabase (FIX_CONVERSATIONS_RLS.sql)
[ ] 2. Sprawdź w Supabase SQL Editor:
        SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversations';
        (Powinno być: 4)
        
[ ] 3. Wyczyść cache przeglądarki (Ctrl+Shift+R)
[ ] 4. Otwórz https://secure-messenger.info w trybie incognito
[ ] 5. Zaloguj się
[ ] 6. F12 → Console → skopiuj WSZYSTKIE logi
[ ] 7. F12 → Network → znajdź request do conversations
[ ] 8. Spróbuj utworzyć konwersację
[ ] 9. Skopiuj błąd (jeśli jest)
[ ] 10. Screenshot Console + Network tab
```

---

## 📸 CO MI PRZESŁAĆ

Żeby dokładnie zdiagnozować, potrzebuję:

1. **Screenshot z Console (F12):**
   - Wszystkie logi, zwłaszcza błędy w kolorze czerwonym
   - Logi zaczynające się od `📨`, `👤`, `✅`, `❌`

2. **Screenshot z Network tab:**
   - Request do: `conversations` lub `messages`
   - Status code (200? 403? 500?)
   - Response body

3. **Odpowiedź na pytania:**
   - Czy wykonałeś SQL w Supabase? (TAK/NIE)
   - Jaki dokładnie błąd widzisz?
   - Czy używasz hard refresh (Ctrl+Shift+R)?

---

**NAJPRAWDOPODOBNIEJ:** Nie wykonałeś SQL - to 2 minuty, spróbuj teraz! 🎯

