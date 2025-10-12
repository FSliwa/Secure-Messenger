# 🔍 ANALIZA 3 PROBLEMÓW

Data: 2025-10-12
Status: Analiza zakończona

---

## 📋 ZGŁOSZONE PROBLEMY

1. ❌ Stan szyfrowania wiadomości nie pokazuje się
2. ❌ Konwersacje nie wczytują się przy każdym załadowaniu (nie pokazują z boku)
3. ❌ Aktywność użytkownika (status online/offline/away) nie działa poprawnie

---

## 🔍 PROBLEM 1: Stan szyfrowania wiadomości nie pokazuje się

### **Obecna implementacja (ChatInterface.tsx):**

**Dialog szyfrowania (line 1663-1693):**
```typescript
<Dialog open={showEncryptionDialog} onOpenChange={setShowEncryptionDialog}>
  <DialogContent>
    <DialogTitle>Encrypting Message</DialogTitle>
    {encryptionProgress && (
      <>
        <Progress value={encryptionProgress.progress} />
        <p>{encryptionProgress.message}</p>
      </>
    )}
  </DialogContent>
</Dialog>
```

**Ustawienia state (line 790-791):**
```typescript
setIsEncrypting(true)
setShowEncryptionDialog(true)
```

### **ANALIZA - CO MOŻE BYĆ NIE TAK:**

#### **A) Dialog się NIE OTWIERA:**

**Możliwe przyczyny:**
1. `showEncryptionDialog` nie zmienia się na `true`
2. Dialog component nie renderuje się (błąd w Dialog UI)
3. CSS z-index jest za niski (dialog pod innymi elementami)
4. Dialog jest ukryty przez inne modale

**Test:**
```javascript
// W Console podczas wysyłania:
console.log('showEncryptionDialog:', showEncryptionDialog)
console.log('isEncrypting:', isEncrypting)
console.log('encryptionProgress:', encryptionProgress)
```

#### **B) Progress NIE AKTUALIZUJE SIĘ:**

**Kod szyfrowania (line 802-809):**
```typescript
const encryptedContent = await encryptMessage(
  messageToSend,
  recipientPublicKey,
  keyPair,
  (progress) => {
    setEncryptionProgress(progress)  // ← Callback
  }
)
```

**Problem:**
- `encryptMessage()` w crypto.ts zajmuje ~20 sekund (6s + 8s + 4s + 2s)
- Callback `onProgress` jest wywoływany wielokrotnie
- Jeśli `setEncryptionProgress` nie działa → progress nie widać

**Test w crypto.ts:**
```typescript
// Line 382-394: Czy onProgress jest wywoływane?
onProgress?.({
  phase: 'key-derivation',
  progress: 5,
  message: 'Deriving ephemeral encryption keys...'
});
```

#### **C) Dialog zamyka się zbyt szybko:**

**Kod (line 827):**
```typescript
setShowEncryptionDialog(false)  // ← Zamyka natychmiast po encryption
```

**Problem:**
- Po zakończeniu szyfrowania dialog natychmiast się zamyka
- Użytkownik nie widzi "100% Complete"
- Powinien zostać otwarty na 1-2 sekundy po zakończeniu

### **NAPRAWA:**

```typescript
// 1. Dodaj opóźnienie przed zamknięciem dialogu
setShowEncryptionDialog(false) // PRZED

// PO:
setTimeout(() => {
  setShowEncryptionDialog(false)
}, 1500) // Pokazuje "100%" przez 1.5s

// 2. Dodaj więcej logów
console.log('🔐 Encryption started')
console.log('🔐 Encryption progress:', progress)
console.log('🔐 Encryption complete')

// 3. Dodaj fallback display jeśli progress null
{encryptionProgress ? (
  <Progress value={encryptionProgress.progress} />
) : (
  <div className="animate-pulse">Encrypting...</div>
)}
```

---

## 🔍 PROBLEM 2: Konwersacje nie wczytują się przy każdym załadowaniu

### **Obecna implementacja:**

**useEffect dla loadConversations (line 216-271):**
```typescript
useEffect(() => {
  const loadConversations = async () => {
    const userConversations = await getUserConversations(currentUser.id)
    // ... transform and set
    setConversations(loadedConversations)
  }
  
  loadConversations()
}, [currentUser.id, setConversations])  // ← Dependency array
```

### **PROBLEMY:**

#### **A) setConversations w dependency array (BŁĄD!):**

**Problem:**
- `setConversations` pochodzi z `useKV` hook
- Może się zmieniać między renderami
- Powoduje nieskończoną pętlę lub brak re-renderingu

**Fix:**
```typescript
// PRZED:
}, [currentUser.id, setConversations])

// PO:
}, [currentUser.id])  // Usuń setConversations
```

#### **B) Brak reloadowania po akcjach:**

**Problem:**
- Konwersacje ładują się tylko raz (przy mount)
- Nie reloadują po:
  - Utworzeniu nowej konwersacji
  - Dołączeniu do konwersacji
  - Powrocie z innej zakładki
  - Odebraniu nowej wiadomości w nowej konwersacji

**Fix 1: Reload po utworzeniu konwersacji**
```typescript
// W performCreateConversation (line ~511):
const conversation = await createConversation(...)

// DODAJ:
// Reload all conversations to get fresh data
const refreshed = await getUserConversations(currentUser.id)
setConversations(refreshed)  // Zamiast manualnego dodawania
```

**Fix 2: Dodaj manual refresh button**
```typescript
<button onClick={() => loadConversations()}>
  <ArrowClockwise /> Refresh
</button>
```

**Fix 3: Auto-reload co X sekund (polling)**
```typescript
useEffect(() => {
  const intervalId = setInterval(() => {
    loadConversations()
  }, 60000) // Co 60 sekund
  
  return () => clearInterval(intervalId)
}, [currentUser.id])
```

#### **C) getUserConversations() zwraca puste:**

**Możliwe przyczyny:**
1. **RLS blokuje SELECT** - brak policy `conversations_select`
2. **Brak danych** - user nie ma żadnych konwersacji
3. **Query error** - nested JOIN failuje
4. **Network error** - timeout lub 500

**Test:**
```javascript
// W Console:
const convs = await getUserConversations('<twoje-user-id>')
console.log('Conversations:', convs)
console.log('Count:', convs?.length)

// Jeśli [] (pusta tablica) → sprawdź w Supabase:
SELECT * FROM conversation_participants WHERE user_id = '<twoje-id>'
```

---

## 🔍 PROBLEM 3: Status użytkownika nie działa

### **Obecna implementacja:**

**Flow:**
```
Dashboard → useUserStatus → updateUserStatus → Supabase UPDATE → RLS check
```

### **MOŻLIWE PROBLEMY:**

#### **A) SQL NIE BYŁ WYKONANY (99% pewności!):**

**Bez SQL:**
```sql
-- Brak policy:
SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_update'
-- Result: 0 rows

-- UPDATE próbuje się wykonać:
UPDATE users SET status = 'online' WHERE id = 'user-123'

-- RLS BLOKUJE:
ERROR: new row violates row-level security policy for table "users"

-- Console error:
❌ Failed to update user status: permission denied
```

**Test w Supabase SQL Editor:**
```sql
-- 1. Sprawdź czy policy istnieje
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

-- POWINNO ZWRÓCIĆ:
-- users_select   | SELECT
-- users_insert   | INSERT
-- users_update   | UPDATE  ← TEN MUSI BYĆ!
-- users_delete   | DELETE

-- Jeśli brak users_update → MUSISZ EXECUTE QUICK_FIX.sql!
```

#### **B) updateUserStatus() failuje ale cicho:**

**Kod (supabase.ts:823-826):**
```typescript
if (error) {
  console.error('❌ Failed to update user status:', error)
  throw error  // ← Rzuca błąd
}
```

**Hook catch (useUserStatus.ts:39):**
```typescript
} catch (error) {
  console.error('Failed to set online status:', error)
  // ❌ NIE INFORMUJE UŻYTKOWNIKA!
}
```

**Problem:**
- Błąd jest logowany, ale toast nie pojawia się
- Użytkownik nie wie że status nie działa

**Fix:**
```typescript
} catch (error) {
  console.error('Failed to set online status:', error)
  // DODAJ toast dla użytkownika:
  toast.error('Failed to update your status. Please check your connection.')
}
```

#### **C) Status się aktualizuje, ale UI nie odświeża:**

**Kod (ChatInterface.tsx:245):**
```typescript
status: otherParticipantData.users.status || 'offline',
```

**Problem:**
- Status jest pobierany tylko raz (przy loadConversations)
- Jeśli inny użytkownik zmieni status → UI się nie aktualizuje
- Brak realtime subscription

**Fix 1: Włącz UserPresenceSync**
```typescript
// W Dashboard.tsx, odkomentuj:
<UserPresenceSync />
```

**Fix 2: Dodaj event listener**
```typescript
useEffect(() => {
  const handleStatusChange = (event: CustomEvent) => {
    const { userId, status } = event.detail
    
    // Update conversations
    setConversations(prev => 
      prev.map(conv => 
        conv.otherParticipant?.id === userId
          ? { ...conv, otherParticipant: { ...conv.otherParticipant, status }}
          : conv
      )
    )
  }
  
  window.addEventListener('user-status-changed', handleStatusChange)
  return () => window.removeEventListener('user-status-changed', handleStatusChange)
}, [])
```

#### **D) Status pokazuje się, ale jest "mockowy" (stary):**

**Przyczyny:**
1. Status w DB jest stary (nie był aktualizowany)
2. Query pobiera stare dane (cache)
3. Browser cache pokazuje starą wersję

**Test w Supabase:**
```sql
-- Sprawdź faktyczny status w DB:
SELECT id, username, status, last_seen 
FROM users 
ORDER BY updated_at DESC 
LIMIT 10;

-- Jeśli status = NULL lub stary timestamp → hook nie działa
```

---

## 🛠️ KOMPLETNA NAPRAWA (KOD)

### **NAPRAWA 1: Dialog szyfrowania - delay przed zamknięciem**

**Plik:** `src/components/ChatInterface.tsx`

**Line 827, zamień:**
```typescript
// PRZED:
setShowEncryptionDialog(false)

// PO:
// Show "100% Complete" for 1.5 seconds before closing
setTimeout(() => {
  setShowEncryptionDialog(false)
}, 1500)
```

**Line 1675-1688, dodaj fallback:**
```typescript
// PRZED:
{encryptionProgress && (
  <>
    <Progress value={encryptionProgress.progress} />
    <p>{encryptionProgress.message}</p>
  </>
)}

// PO:
{encryptionProgress ? (
  <>
    <Progress value={encryptionProgress.progress} className="h-2" />
    <p className="text-sm text-muted-foreground">
      {encryptionProgress.message}
    </p>
  </>
) : (
  <>
    <Progress value={0} className="h-2 animate-pulse" />
    <p className="text-sm text-muted-foreground animate-pulse">
      Initializing encryption...
    </p>
  </>
)}
```

---

### **NAPRAWA 2: Konwersacje - reload mechanism**

**Plik:** `src/components/ChatInterface.tsx`

**Line 271, fix dependency array:**
```typescript
// PRZED:
}, [currentUser.id, setConversations])

// PO:
}, [currentUser.id])  // Usuń setConversations
```

**Dodaj manual reload (po line 270):**
```typescript
  }, [currentUser.id])

  // Manual reload function
  const reloadConversations = async () => {
    try {
      console.log('🔄 Manually reloading conversations...')
      const userConversations = await getUserConversations(currentUser.id)
      const loadedConversations = await Promise.all(
        userConversations.map(async (item: any) => {
          // ... same transform logic ...
        })
      )
      setConversations(loadedConversations)
      console.log(`✅ Reloaded ${loadedConversations.length} conversations`)
    } catch (error) {
      console.error('Failed to reload conversations:', error)
    }
  }
```

**Dodaj reload button do UI (line ~1076):**
```typescript
<div className="flex items-center justify-between mb-4">
  <h1 className="text-xl font-bold">{t.chats}</h1>
  <div className="flex gap-2">
    {/* ADD: Refresh button */}
    <button 
      onClick={reloadConversations}
      className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
      title="Refresh conversations"
    >
      <ArrowsClockwise className="w-5 h-5 text-muted-foreground" />
    </button>
    {/* Existing buttons... */}
  </div>
</div>
```

**Reload po utworzeniu konwersacji (line ~520):**
```typescript
// W performCreateConversation, zamień:
// PRZED:
setConversations((prev) => [...(prev || []), conversation])

// PO:
await reloadConversations()  // Pełny reload z DB
```

---

### **NAPRAWA 3: Status użytkownika - comprehensive fix**

#### **Fix 3A: Dodaj realtime subscription**

**Plik:** `src/components/ChatInterface.tsx`

**Dodaj useEffect (po line 271):**
```typescript
// Realtime status updates
useEffect(() => {
  const handleStatusChange = (event: any) => {
    const { userId, status } = event.detail
    console.log(`🔔 Status changed: ${userId} → ${status}`)
    
    // Update conversations with new status
    setConversations(prev => 
      prev.map(conv => {
        if (conv.otherParticipant?.id === userId) {
          return {
            ...conv,
            otherParticipant: {
              ...conv.otherParticipant,
              status: status
            }
          }
        }
        return conv
      })
    )
    
    // Update active conversation if needed
    if (activeConversation?.otherParticipant?.id === userId) {
      setActiveConversation(prev => prev ? {
        ...prev,
        otherParticipant: prev.otherParticipant ? {
          ...prev.otherParticipant,
          status: status
        } : undefined
      } : null)
    }
  }
  
  window.addEventListener('user-status-changed', handleStatusChange as EventListener)
  return () => window.removeEventListener('user-status-changed', handleStatusChange as EventListener)
}, [setConversations, activeConversation])
```

#### **Fix 3B: Włącz UserPresenceSync**

**Plik:** `src/components/Dashboard.tsx`

**Znajdź zakomentowany UserPresenceSync (~line 60) i odkomentuj:**
```typescript
// PRZED (zakomentowane):
{/* <UserPresenceSync /> */}

// PO (aktywne):
<UserPresenceSync />
```

#### **Fix 3C: Dodaj visual feedback**

**Plik:** `src/components/ChatInterface.tsx`

**Line 1313-1315, dodaj animację:**
```typescript
// PRZED:
<div className={`... rounded-full ${
  status === 'online' ? 'bg-green-500' :
  status === 'away' ? 'bg-yellow-500' : 
  'bg-muted-foreground'
}`}></div>

// PO (z animacją pulsowania dla online):
<div className={`... rounded-full ${
  status === 'online' ? 'bg-green-500 animate-pulse' :
  status === 'away' ? 'bg-yellow-500' : 
  'bg-muted-foreground'
}`}></div>
```

#### **Fix 3D: Debugging - dodaj status indicator**

**Dodaj do headera (line ~1400):**
```typescript
<div className="flex items-center gap-2 text-sm">
  <div className={`w-2 h-2 rounded-full ${
    activeConversation.otherParticipant?.status === 'online' ? 'bg-green-500 animate-pulse' :
    activeConversation.otherParticipant?.status === 'away' ? 'bg-yellow-500' : 
    'bg-muted-foreground'
  }`}></div>
  <span className="text-muted-foreground">
    {activeConversation.otherParticipant?.status || 'unknown'}
  </span>
  <span className="text-xs text-muted-foreground">
    (Last seen: {activeConversation.otherParticipant?.last_seen ? 
      new Date(activeConversation.otherParticipant.last_seen).toLocaleTimeString() : 
      'never'})
  </span>
</div>
```

---

## 🔄 FLOW DIAGNOSTYCZNY

### **Test 1: Czy SQL został wykonany?**

```sql
-- W Supabase SQL Editor:
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('users', 'conversations', 'messages')
ORDER BY tablename, policyname;

-- MUSI ZWRÓCIĆ (minimum):
-- conversations | conversations_insert | INSERT
-- conversations | conversations_select | SELECT
-- users         | users_update         | UPDATE  ← KLUCZOWE!
-- messages      | messages_insert      | INSERT
-- messages      | messages_select      | SELECT
```

### **Test 2: Czy konwersacje są w DB?**

```sql
-- Sprawdź czy masz konwersacje:
SELECT 
  c.id,
  c.name,
  c.is_group,
  cp.user_id,
  u.username
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
JOIN users u ON u.id = cp.user_id
WHERE c.id IN (
  SELECT conversation_id 
  FROM conversation_participants 
  WHERE user_id = '<TWOJE-USER-ID>'
)
ORDER BY c.created_at DESC;

-- Jeśli 0 rows → nie masz żadnych konwersacji
-- Jeśli są rows → RLS może blokować SELECT
```

### **Test 3: Czy status się aktualizuje?**

```sql
-- Sprawdź statusy w DB:
SELECT id, username, status, last_seen, updated_at
FROM users
ORDER BY updated_at DESC
LIMIT 5;

-- Zaloguj się, poczekaj 30s, sprawdź ponownie
-- updated_at powinien się zmienić!
-- Jeśli NIE → hook nie działa lub RLS blokuje
```

### **Test 4: Console logs**

Po zalogowaniu MUSISZ zobaczyć:
```
✅ Supabase connection verified
📋 Loading conversations for user: <id>
✅ Loaded X conversations
👤 User status: online
📊 Updating user status: <id> → online
✅ User status updated successfully
```

Co 30 sekund:
```
📊 Updating user status: <id> → online
✅ User status updated successfully
```

**Jeśli NIE WIDZISZ** tych logów:
- ❌ Hook nie działa → sprawdź Dashboard.tsx:46-50
- ❌ SQL nie wykonany → execute QUICK_FIX.sql
- ❌ RLS blokuje → sprawdź pg_policies

---

## 🎯 PLAN NAPRAWY - PRIORYTET

### **PRIORYTET 1: EXECUTE SQL (KRYTYCZNE!)**

Bez tego **NIC** nie będzie działać:
- ❌ Conversations: nie można tworzyć
- ❌ Messages: nie można wysyłać
- ❌ Status: nie można aktualizować

**→ Execute QUICK_FIX.sql w Supabase (2 minuty)**

---

### **PRIORYTET 2: Fix dependency array**

```typescript
// ChatInterface.tsx:271
}, [currentUser.id])  // Usuń setConversations
```

**→ To naprawi loadowanie konwersacji**

---

### **PRIORYTET 3: Delay dialog close**

```typescript
// ChatInterface.tsx:827
setTimeout(() => {
  setShowEncryptionDialog(false)
}, 1500)
```

**→ To pozwoli zobaczyć progress 100%**

---

### **PRIORYTET 4: Włącz UserPresenceSync**

```typescript
// Dashboard.tsx:~60
<UserPresenceSync />  // Odkomentuj
```

**→ To włączy realtime updates statusów**

---

### **PRIORYTET 5: Dodaj status event listener**

```typescript
// ChatInterface.tsx, nowy useEffect
// Kod z Fix 3A powyżej
```

**→ To zaktualizuje UI gdy status się zmieni**

---

## 📊 PODSUMOWANIE

**Główny problem (99%):**
```
❌ SQL NIE BYŁ WYKONANY W SUPABASE
```

**Bez SQL:**
- ❌ Wszystkie UPDATE/INSERT blokowane przez RLS
- ❌ Konwersacje nie ładują się (SELECT blokowany)
- ❌ Wiadomości nie wysyłają się (INSERT blokowany)
- ❌ Status nie aktualizuje się (UPDATE blokowany)

**Z SQL:**
- ✅ RLS policies zezwalają na operacje
- ✅ Wszystko działa

---

## 🚀 NASTĘPNE KROKI

1. **Execute QUICK_FIX.sql** (2 min) ⚠️
2. **Hard refresh** (10 sek)
3. **Sprawdź Console** (1 min)
4. **Jeśli nadal problemy** → wprowadzę pozostałe fixy

---

*Analiza wygenerowana: 2025-10-12*

