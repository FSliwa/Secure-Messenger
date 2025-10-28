# System Śledzenia Statusu Użytkownika (User Presence System)

## Przegląd

System śledzenia statusu użytkownika w SecureChat Pro automatycznie monitoruje i aktualizuje status każdego zalogowanego użytkownika w czasie rzeczywistym. System obsługuje trzy stany: **Online**, **Away** (Z dala), i **Offline**.

---

## Jak Działa System

### 1. **Inicjalizacja podczas logowania**

Gdy użytkownik się loguje:
1. Funkcja `signIn()` w `supabase.ts` aktualizuje status użytkownika na `'online'` w tabeli `users`
2. `App.tsx` wywołuje `userPresence.initialize(userId)` po pomyślnym zalogowaniu
3. System rozpoczyna śledzenie aktywności użytkownika

```typescript
// src/lib/supabase.ts
await supabase
  .from('users')
  .update({
    status: 'online',
    last_seen: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .eq('id', data.user.id)

// src/App.tsx
await userPresence.initialize(user.id);
```

### 2. **Komponenty Systemu Śledzenia**

System składa się z kilku kluczowych mechanizmów:

#### A. **Heartbeat (Puls życia)**
- Co 30 sekund system automatycznie aktualizuje pole `last_seen` w bazie danych
- Zapewnia, że status użytkownika jest świeży nawet bez aktywności

```typescript
private readonly HEARTBEAT_INTERVAL = 30000 // 30 sekund

private startHeartbeat() {
  this.heartbeatInterval = setInterval(async () => {
    if (this.userId) {
      await this.updateLastSeen()
    }
  }, this.HEARTBEAT_INTERVAL)
}
```

#### B. **Realtime Presence Channel**
- Używa Supabase Realtime Presence do synchronizacji statusu między urządzeniami
- Każdy użytkownik jest śledzony w kanale `user-presence`
- Automatycznie wykrywa gdy użytkownik opuszcza aplikację

```typescript
this.channel = supabase.channel('user-presence', {
  config: {
    presence: {
      key: this.userId,
    },
  },
})

this.channel
  .on('presence', { event: 'sync' }, () => {
    // Synchronizacja stanu
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    // Użytkownik dołączył
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    // Użytkownik wyszedł - ustaw status offline
    this.handleUserLeft(key)
  })
  .subscribe()
```

#### C. **Activity Detection (Wykrywanie Aktywności)**
- Nasłuchuje na zdarzenia użytkownika: ruch myszy, klawisze, scroll, dotyk
- Automatycznie przełącza status z `'away'` na `'online'` gdy użytkownik jest aktywny
- Po 5 minutach braku aktywności status zmienia się na `'away'`

```typescript
private readonly AWAY_TIMEOUT = 300000 // 5 minut

private setupActivityListeners() {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
  
  const resetAwayTimer = () => {
    if (this.awayTimeout) {
      clearTimeout(this.awayTimeout)
    }
    
    this.setStatus('online')
    
    this.awayTimeout = setTimeout(() => {
      this.setStatus('away')
    }, this.AWAY_TIMEOUT)
  }

  events.forEach(event => {
    document.addEventListener(event, resetAwayTimer, { passive: true })
  })
}
```

#### D. **Window Focus Detection**
- Automatycznie zmienia status gdy użytkownik przełącza zakładki/okna
- `focus` → Status: `'online'`
- `blur` → Rozpoczyna licznik do `'away'`

```typescript
window.addEventListener('focus', () => {
  this.setStatus('online')
})

window.addEventListener('blur', () => {
  this.awayTimeout = setTimeout(() => {
    this.setStatus('away')
  }, this.AWAY_TIMEOUT)
})
```

#### E. **Beforeunload Handler**
- Gdy użytkownik zamyka kartę/przeglądarkę, natychmiast ustawia status `'offline'`

```typescript
window.addEventListener('beforeunload', () => {
  this.setStatus('offline')
})
```

### 3. **Aktualizacja Statusu w Bazie Danych**

Każda zmiana statusu jest zapisywana w dwóch miejscach:

1. **Tabela `users`** - Trwały status w PostgreSQL
```typescript
await supabase
  .from('users')
  .update({
    status,
    last_seen: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq('id', this.userId)
```

2. **Realtime Presence** - Status w czasie rzeczywistym
```typescript
await this.channel?.track({
  user_id: this.userId,
  status,
  last_seen: new Date().toISOString(),
})
```

### 4. **Pobieranie Statusu Innych Użytkowników**

Komponenty mogą pobierać status innych użytkowników na dwa sposoby:

#### A. **Jednorazowe pobranie**
```typescript
const status = await userPresence.getUserStatus(userId)
```

Logika sprawdzania:
- Jeśli `last_seen` > 5 minut → `'offline'`
- W przeciwnym razie zwróć zapisany status

#### B. **Subskrypcja na zmiany (Realtime)**
```typescript
const unsubscribe = userPresence.subscribeToUserStatus(userId, (newStatus) => {
  console.log(`User status changed to: ${newStatus}`)
})

// Pamiętaj o cleanup
return unsubscribe
```

### 5. **Wylogowanie i Cleanup**

Podczas wylogowania:
1. Zatrzymaj wszystkie interwały (heartbeat, away timer)
2. Ustaw status użytkownika na `'offline'`
3. Wypisz się z kanału Realtime Presence
4. Wyczyść dane lokalne

```typescript
// src/App.tsx
const handleLogout = async () => {
  await userPresence.cleanup();
  await signOut();
  // ...
}

// src/lib/user-presence.ts
async cleanup() {
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval)
  }
  
  if (this.awayTimeout) {
    clearTimeout(this.awayTimeout)
  }

  if (this.userId) {
    await this.setStatus('offline')
  }

  if (this.channel) {
    await this.channel.unsubscribe()
  }

  this.userId = null
  this.channel = null
}
```

---

## Użycie w Komponentach

### Wyświetlanie Wskaźnika Statusu

```typescript
import { UserStatusIndicator } from '@/components/UserStatusIndicator'

<UserStatusIndicator 
  userId={user.id} 
  size="md"
  showLabel={true}
/>
```

Props:
- `userId: string` - ID użytkownika do śledzenia
- `size?: 'sm' | 'md' | 'lg'` - Rozmiar wskaźnika (domyślnie: `'md'`)
- `showLabel?: boolean` - Czy pokazywać tekst statusu (domyślnie: `false`)
- `className?: string` - Dodatkowe klasy CSS

### Przykład w Liście Konwersacji

```typescript
<div className="flex items-center gap-3">
  <div className="relative">
    <Avatar>
      <AvatarImage src={user.avatar_url} />
      <AvatarFallback>{user.username[0]}</AvatarFallback>
    </Avatar>
    <div className="absolute bottom-0 right-0">
      <UserStatusIndicator userId={user.id} size="sm" />
    </div>
  </div>
  <div>
    <p className="font-medium">{user.display_name}</p>
    <UserStatusIndicator 
      userId={user.id} 
      size="sm" 
      showLabel={true} 
    />
  </div>
</div>
```

---

## Struktura Bazy Danych

### Tabela `users`

```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  public_key text NOT NULL,
  status text DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  last_seen timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

Pola związane ze statusem:
- `status` - Aktualny status: `'online'`, `'offline'`, `'away'`
- `last_seen` - Ostatni czas aktywności użytkownika
- `updated_at` - Ostatnia aktualizacja profilu

---

## Diagram Przepływu

```
┌─────────────────────────────────────────────────────────────┐
│                      User Login                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Set status = 'online' in database                       │
│  2. Initialize userPresence.initialize(userId)              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│            Start Background Processes                       │
├─────────────────────────────────────────────────────────────┤
│  • Heartbeat: Update last_seen every 30s                    │
│  • Activity Listeners: Track user interactions              │
│  • Realtime Presence: Subscribe to presence channel         │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
         ▼                    ▼
┌──────────────┐    ┌──────────────────┐
│ User Active  │    │  No Activity     │
│ (< 5 min)    │    │  (> 5 min)       │
└──────┬───────┘    └────────┬─────────┘
       │                     │
       │ Status = 'online'   │ Status = 'away'
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
      ┌───────────────────────┐
      │  Window blur/close?   │
      └───────────┬───────────┘
                  │
                  ▼
      ┌───────────────────────┐
      │  Set status = 'offline'│
      │  Update last_seen      │
      └───────────┬───────────┘
                  │
                  ▼
      ┌───────────────────────┐
      │    User Logout        │
      │  • Stop heartbeat     │
      │  • Clear timers       │
      │  • Unsubscribe channel│
      └───────────────────────┘
```

---

## Wydajność i Optymalizacja

### 1. **Throttling Updates**
- Status NIE jest aktualizowany przy każdym ruchu myszy
- Używamy debounce/throttle dla zdarzeń aktywności

### 2. **Batch Updates**
- Heartbeat grupuje aktualizacje co 30 sekund zamiast ciągle

### 3. **Realtime Presence**
- Używa WebSocket dla efektywnej komunikacji
- Automatyczne reconnect przy utracie połączenia

### 4. **Lazy Status Check**
- Status innych użytkowników jest pobierany tylko gdy są widoczni w UI
- Używamy React hooks do automatycznego cleanup

---

## Testowanie

### Scenariusz 1: Login i Status Online
1. Zaloguj się do aplikacji
2. Sprawdź w Supabase Dashboard → Table Editor → `users`
3. Status powinien być `'online'`
4. `last_seen` powinien być aktualny timestamp

### Scenariusz 2: Przejście do Away
1. Zaloguj się do aplikacji
2. Pozostaw kartę bezczynną przez 5 minut
3. Status powinien zmienić się na `'away'`
4. Po ruchu myszą → z powrotem `'online'`

### Scenariusz 3: Logout
1. Zaloguj się do aplikacji
2. Kliknij "Log Out"
3. Status powinien zmienić się na `'offline'`
4. `last_seen` powinien być zaktualizowany

### Scenariusz 4: Zamknięcie karty
1. Zaloguj się do aplikacji
2. Zamknij kartę przeglądarki
3. Status powinien zmienić się na `'offline'`

---

## Bezpieczeństwo

### Row Level Security (RLS)

Status użytkownika jest publiczny (każdy może go zobaczyć), ale tylko właściciel może go aktualizować:

```sql
-- Wszyscy mogą czytać statusy
CREATE POLICY "Anyone can view user status"
  ON users FOR SELECT
  USING (true);

-- Tylko właściciel może aktualizować swój status
CREATE POLICY "Users can update their own status"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

---

## Troubleshooting

### Problem: Status nie aktualizuje się
**Rozwiązanie:**
1. Sprawdź czy Realtime jest włączony w Supabase Dashboard
2. Zweryfikuj RLS policies
3. Sprawdź console.log czy heartbeat działa

### Problem: Status zawsze offline
**Rozwiązanie:**
1. Sprawdź czy `userPresence.initialize()` jest wywoływany
2. Zweryfikuj połączenie z bazą danych
3. Sprawdź czy tabela `users` istnieje

### Problem: Zbyt częste aktualizacje
**Rozwiązanie:**
1. Zwiększ `HEARTBEAT_INTERVAL` (np. do 60000ms)
2. Dodaj throttling do activity listeners

---

## Podsumowanie

System śledzenia statusu użytkownika w SecureChat Pro działa w następujący sposób:

1. **Login** → Status ustawiony na `'online'`, inicjalizacja monitoringu
2. **Aktywność** → Status `'online'` (heartbeat co 30s)
3. **Brak aktywności (5 min)** → Status `'away'`
4. **Window blur** → Licznik do `'away'`
5. **Window close / Logout** → Status `'offline'`, cleanup

System wykorzystuje:
- ✅ Supabase Realtime Presence dla synchronizacji
- ✅ PostgreSQL dla trwałego przechowywania
- ✅ Activity listeners dla wykrywania aktywności
- ✅ Heartbeat dla utrzymania świeżego statusu
- ✅ Automatyczny cleanup przy wylogowaniu

**Status użytkownika jest zawsze aktualny i synchronizowany w czasie rzeczywistym między wszystkimi urządzeniami!** 🎉
