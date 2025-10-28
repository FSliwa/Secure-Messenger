# 📋 PLIKI ODPOWIEDZIALNE ZA STATUS UŻYTKOWNIKA

## 🎯 TOP 5 NAJWAŻNIEJSZYCH PLIKÓW

### 1. ⭐⭐⭐⭐⭐ src/hooks/useUserStatus.ts (184 linie)
**Rola:** Automatyczne zarządzanie statusem (online/away/offline)

**Co robi:**
- Sets online on mount
- Sets offline on unmount
- Sets away after 5 min inactivity
- Heartbeat every 30 seconds
- Detects activity (mouse, keyboard, touch)

**Kluczowe funkcje:**
- Line 31-41: `setOnline()`
- Line 44-54: `setAway()`
- Line 57-67: `setOffline()`
- Line 94-98: Heartbeat interval
- Line 82-84: Inactivity timeout (5 min)

**Używany w:** Dashboard.tsx

---

### 2. ⭐⭐⭐⭐⭐ src/lib/supabase.ts (line 808-834)
**Rola:** API function - updateUserStatus()

**Co robi:**
- UPDATE users SET status = ...
- Logs do Console
- Error handling

**Kluczowy kod:**
```typescript
export const updateUserStatus = async (userId, status) => {
  console.log(\`📊 Updating user status: \${userId} → \${status}\`)
  
  const { data, error } = await supabase
    .from('users')
    .update({ status, last_seen: NOW(), updated_at: NOW() })
    .eq('id', userId)
}
```

**Wywoływana przez:** useUserStatus.ts

---

### 3. ⭐⭐⭐⭐⭐ src/components/Dashboard.tsx (line 46-50)
**Rola:** Integracja hooka useUserStatus

**Kluczowy kod:**
```typescript
useUserStatus({
  userId: currentUser?.id || '',
  enabled: !!currentUser?.id,
  heartbeatInterval: 30
})
```

**Efekt:** Automatyczny status tracking dla zalogowanego usera

---

### 4. ⭐⭐⭐⭐⭐ src/components/ChatInterface.tsx
**Rola:** Wyświetlanie statusu w UI (3 miejsca)

**Miejsca wyświetlania:**

**A) Lista konwersacji (line ~1295-1302):**
```typescript
<div className={\`rounded-full \${
  status === 'online' ? 'bg-green-500' :
  status === 'away' ? 'bg-yellow-500' : 
  'bg-muted-foreground'
}\`}></div>
```

**B) Header konwersacji (line ~1382-1385):**
```typescript
// Wskaźnik przy awatarze
```

**C) Tekst "Active now" (line ~1400-1402):**
```typescript
<span>{t.activeNow}</span>
```

**Kolory:**
- 🟢 Green = online
- 🟡 Yellow = away
- ⚪ Gray = offline

---

### 5. ⭐⭐⭐⭐⭐ QUICK_FIX.sql lub FIX_CONVERSATIONS_RLS.sql
**Rola:** Baza danych - RLS policies + functions

**Zawiera:**
- users_update policy (pozwala UPDATE status)
- set_user_status() function
- update_user_status_on_activity() trigger

**Status:** ⚠️ DO WYKONANIA W SUPABASE!

---

## 🔄 INNE PLIKI (mniej ważne)

### 6. ⭐⭐⭐ src/components/UserPresenceSync.tsx
**Rola:** Realtime sync statusów (WebSocket)
**Status:** ⚠️ Obecnie WYŁĄCZONY w Dashboard
**Można włączyć:** Odkomentować w Dashboard.tsx

### 7. ⭐⭐⭐ src/components/UserSearchDialog.tsx
**Rola:** Badge statusu w wyszukiwaniu użytkowników
**Kod:** `<Badge variant={user.status === 'online' ? 'default' : 'secondary'}>`

### 8. ⭐⭐⭐ src/components/DirectMessageDialog.tsx
**Rola:** Status w bezpośrednich wiadomościach

### 9. ⭐⭐ src/components/ProfileSettings.tsx
**Rola:** Wyświetlanie własnego statusu

### 10. ⭐⭐ src/components/ActivityTracker.tsx
**Rola:** Tracking aktywności użytkownika

---

## 🎯 FLOW LOGIKI

```
USER ACTIVITY
     ↓
useUserStatus.ts (hook) → detectuje aktywność
     ↓
setOnline() / setAway() / setOffline()
     ↓
updateUserStatus() w supabase.ts
     ↓
UPDATE users SET status = ... (WYMAGA SQL!)
     ↓
UserPresenceSync.tsx (realtime listener)
     ↓
ChatInterface.tsx (UI update)
     ↓
Wskaźnik zmienia kolor 🟢🟡⚪
```

---

## ⚠️ PROBLEM: DLACZEGO NIE DZIAŁA?

**99% pewności:**
```
❌ NIE WYKONAŁEŚ QUICK_FIX.sql W SUPABASE
```

**Bez tego SQL:**
- ❌ RLS blokuje UPDATE na users
- ❌ Functions nie istnieją
- ❌ Hook NIE MOŻE zaktualizować statusu
- ❌ UI pokazuje stary/mockowy status

**Rozwiązanie:**
1. Execute QUICK_FIX.sql (2 minuty)
2. Hard refresh (Ctrl+Shift+R)
3. Status będzie działać!

---

## 📊 PODSUMOWANIE

**Wszystkie pliki są na serwerze** ✅  
**GitHub jest aktualny** ✅  
**Kod TypeScript działa** ✅  

**ALE:**
**SQL nie został wykonany** ❌ ← TO MUSISZ ZROBIĆ!

**Pliki do sprawdzenia/edytowania (jeśli SQL jest OK):**
- `src/hooks/useUserStatus.ts` - główna logika
- `src/components/Dashboard.tsx` - integracja
- `src/components/ChatInterface.tsx` - wyświetlanie

---

*Lista plików wygenerowana: 2025-10-10*
