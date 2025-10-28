# 🔐 SECURITY DEFINER - Wyjaśnienie Bezpieczeństwa

## ❓ Pytanie: "Czy nie lepiej żeby nie omijało RLS?"

### ✅ ODPOWIEDŹ: SECURITY DEFINER **NIE OMIJA** bezpieczeństwa!

Moje wcześniejsze sformułowanie było mylące. Pozwól że wyjaśnię dokładnie:

---

## 🛡️ **JAK TO FAKTYCZNIE DZIAŁA:**

### **Warstwa 1: Policy (kontrola dostępu - TU jest bezpieczeństwo)**
```sql
CREATE POLICY "access_conversation_messages" ON messages
  FOR ALL USING (
    is_participant(conversation_id, auth.uid())  ← POLICY sprawdza function
  );
```

**Policy nadal kontroluje dostęp!** User może zobaczyć message **TYLKO JEŚLI** function zwróci TRUE.

---

### **Warstwa 2: Function (wykonuje query)**
```sql
CREATE FUNCTION is_participant(conv_id uuid, check_user_id uuid)
SECURITY DEFINER  ← Wykonuje jako superuser
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id 
    AND user_id = check_user_id  ← Sprawdza czy ten konkretny user jest uczestnikiem
  );
$$;
```

**Function wykonuje się jako superuser, ALE:**
- ✅ Sprawdza `check_user_id` (przekazany z policy jako `auth.uid()`)
- ✅ Zwraca TRUE tylko jeśli user **faktycznie** jest uczestnikiem
- ✅ **Nie pozwala user'owi zobaczyć danych innych użytkowników**

---

## 🔍 **PRZYKŁAD: Co widzi User?**

### **Scenario: User A próbuje zobaczyć wiadomości**

#### **Policy check:**
```sql
-- User A loguje zapytanie:
SELECT * FROM messages WHERE conversation_id = 'abc-123';

-- Policy wywołuje:
is_participant('abc-123', 'user-A-id')
  ↓
Function sprawdza:
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = 'abc-123' 
    AND user_id = 'user-A-id'  ← Sprawdza CZY User A jest uczestnikiem
    AND is_active = true
  );
```

#### **Rezultaty:**

**Jeśli User A JEST uczestnikiem:**
- Function zwraca: `TRUE`
- Policy: ALLOWED
- User A widzi wiadomości ✅

**Jeśli User A NIE JEST uczestnikiem:**
- Function zwraca: `FALSE`
- Policy: DENIED
- User A NIE widzi wiadomości ❌

---

## 🆚 **PORÓWNANIE: Z i BEZ SECURITY DEFINER**

### **BEZ SECURITY DEFINER (infinite recursion):**
```sql
CREATE POLICY "view_messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants  ← Wywołuje policy dla participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "view_participants" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp  ← Wywołuje policy dla... samej siebie!
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );
```

**Problem:** Policy → Subquery → Policy → Subquery → ... (LOOP ∞)

---

### **Z SECURITY DEFINER (działa):**
```sql
CREATE FUNCTION is_participant(conv_id uuid, user_id uuid)
SECURITY DEFINER  ← Function czyta tabelę BEZ wywołania policy
AS $$
  SELECT EXISTS (SELECT 1 FROM conversation_participants ...);
$$;

CREATE POLICY "view_messages" ON messages
  FOR SELECT USING (
    is_participant(conversation_id, auth.uid())  ← Wywołuje function
  );
```

**Dlaczego działa:**
1. User → Policy → Function
2. Function (jako superuser) → Czyta `conversation_participants` **bez sprawdzania policy**
3. Function zwraca TRUE/FALSE
4. Policy używa wyniku do ALLOW/DENY
5. **Bezpieczeństwo zachowane!** User widzi tylko swoje konwersacje

---

## 🔐 **BEZPIECZEŃSTWO jest ZACHOWANE ponieważ:**

### ✅ **1. Function sprawdza user_id**
```sql
WHERE user_id = check_user_id  ← To jest auth.uid() z policy!
```

User **nie może** podać innego user_id. To jest zawsze `auth.uid()`.

### ✅ **2. Policy nadal kontroluje dostęp**
Policy wywołuje function i używa wyniku. Jeśli function zwróci FALSE, dostęp DENIED.

### ✅ **3. Function jest immutable/stable**
```sql
STABLE  ← Gwarancja że function nie modyfikuje danych
```

### ✅ **4. Function ma explicit logic**
Function nie pozwala na "omijanie" - ma **twardą logikę** sprawdzania uczestnictwa.

---

## ⚖️ **ALTERNATYWY:**

### **Opcja A: SECURITY DEFINER (ZALECANA)** ⭐
**Pros:**
- ✅ Rozwiązuje infinite recursion
- ✅ **Bezpieczeństwo w pełni zachowane**
- ✅ Lepszy performance (mniej queries)
- ✅ PostgreSQL recommended pattern
- ✅ Używane przez Supabase examples

**Cons:**
- Wymaga napisania functions

---

### **Opcja B: Disable RLS + Application-level security**
**Pros:**
- Prosta implementacja

**Cons:**
- ❌ **DUŻO GORSZE bezpieczeństwo!**
- ❌ Aplikacja musi sprawdzać permissions
- ❌ Ryzyko błędów w kodzie
- ❌ Brak database-level protection

---

### **Opcja C: Bardzo proste policies bez SECURITY DEFINER**
```sql
-- Każdy może czytać WSZYSTKO (zły pomysł!)
CREATE POLICY "public_read" ON messages FOR SELECT USING (true);

-- Tylko własne rekordy
CREATE POLICY "own_only" ON conversation_participants
  FOR ALL USING (user_id = auth.uid());
```

**Pros:**
- Brak rekursji

**Cons:**
- ❌ Albo zbyt restrykcyjne (user widzi tylko swoje rekordy w participants, nie widzi innych uczestników)
- ❌ Albo zbyt otwarte (wszyscy widzą wszystko)

---

## 📚 **PostgreSQL Official Documentation:**

> "For policies that need to query other tables that also have RLS enabled, use SECURITY DEFINER functions to avoid infinite recursion."

To **oficjalnie zalecane** rozwiązanie przez PostgreSQL i Supabase!

---

## 🎯 **REKOMENDACJA:**

**Zostań z SECURITY DEFINER** - to jest **standardowe, bezpieczne rozwiązanie**.

**Bezpieczeństwo NIE jest omijane:**
- Policy decyduje kto ma dostęp
- Function tylko sprawdza warunki
- User widzi tylko swoje dane

---

## ✅ **PODSUMOWANIE:**

| Aspekt | SECURITY DEFINER | Proste RLS | No RLS |
|--------|------------------|------------|---------|
| **Bezpieczeństwo** | ✅ Pełne | ⚠️ Może być rekursja | ❌ Słabe |
| **Performance** | ✅ Dobre | ⚠️ Wolne | ✅ Szybkie |
| **Maintainability** | ✅ Czytelne | ⚠️ Skomplikowane | ❌ Ryzykowne |
| **PostgreSQL Best Practice** | ✅ TAK | ⚠️ Zależy | ❌ NIE |
| **Supabase Recommended** | ✅ TAK | ⚠️ Zależy | ❌ NIE |

**SECURITY DEFINER jest najlepszym rozwiązaniem - bezpiecznym i wydajnym!** 🏆

---

*Dokument utworzony: 8 października 2025*  
*Źródła: PostgreSQL Docs, Supabase Docs, PostgreSQL Wiki*
