# 🔍 ANALIZA BŁĘDU: "Failed to encrypt message"

## 📍 LOKALIZACJA BŁĘDU

**Plik:** `src/components/ChatInterface.tsx`  
**Linia:** 834  
**Funkcja:** `performSendMessage()`

```typescript
try {
  const encryptedContent = await encryptMessage(...)
  const dbMessage = await sendMessage(...)
} catch (error) {
  console.error('Encryption failed:', error)
  toast.error('Failed to encrypt message. Please try again.')  // ← TU
}
```

---

## 🎯 MOŻLIWE PRZYCZYNY (10 scenariuszy)

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### ❌ PRZYCZYNA 1: HARDCODED RECIPIENT KEY (90% pewności!)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Kod (ChatInterface.tsx:795-802):**
```typescript
const encryptedContent = await encryptMessage(
  messageToSend,
  'recipient-public-key', // ← HARDCODED STRING! ❌
  keyPair,
  (progress) => { ... }
)
```

**Problem:**
- Używa literalnego stringa `'recipient-public-key'` zamiast prawdziwego klucza
- `encryptMessage()` próbuje zdekodować ten string jako base64 (line 445)
- `base64ToArrayBuffer('recipient-public-key')` → BŁĄD!

**Co się dzieje:**
```typescript
// crypto.ts:445
const publicKeyBuffer = base64ToArrayBuffer(recipientPublicKey);
// recipientPublicKey = 'recipient-public-key'
// atob('recipient-public-key') → DOMException: Invalid character

// crypto.ts:446-455
const publicKey = await crypto.subtle.importKey(...)
// Fail: invalid base64 → Error: Failed to execute 'importKey'

// Wynik: throw error → catch block → "Failed to encrypt message"
```

**Jak naprawić:**
1. Pobierz prawdziwy klucz publiczny odbiorcy z conversation participants
2. Zastąp hardcoded string prawdziwym kluczem

**Fix:**
```typescript
// 1. Pobierz klucz odbiorcy z conversation
const recipientUser = activeConversation.otherParticipant
const recipientPublicKey = recipientUser?.public_key

if (!recipientPublicKey) {
  toast.error('Cannot find recipient public key')
  return
}

// 2. Użyj w encryptMessage
const encryptedContent = await encryptMessage(
  messageToSend,
  recipientPublicKey,  // ← Prawdziwy klucz!
  keyPair,
  (progress) => { ... }
)
```

**Prawdopodobieństwo:** ⭐⭐⭐⭐⭐ (90%)

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### ❌ PRZYCZYNA 2: BRAK KEYPAIR (keyPair = null)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Kod (ChatInterface.tsx:769):**
```typescript
if (!newMessage.trim() || !activeConversation || !keyPair) return
```

**Problem:**
- Guard sprawdza `!keyPair`, ale jeśli przejdzie dalej, a `keyPair` stanie się null...
- `encryptMessage(message, key, null, ...)` → błąd

**Przyczyny braku keyPair:**
1. localStorage jest zablokowany (tryb prywatny)
2. Klucze nigdy nie zostały wygenerowane
3. localStorage został wyczyszczony
4. Błąd w `getStoredKeys()`

**Jak sprawdzić:**
```javascript
// W Console (F12):
const stored = localStorage.getItem('securechat-keypair')
console.log('Stored keys:', stored)

// Powinno zwrócić:
// {"publicKey":"MIIBIjANBg...","privateKey":"MIIEvQ..."}

// Jeśli null → klucze nie istnieją!
```

**Jak naprawić:**
- Wygeneruj nowe klucze podczas rejestracji
- Sprawdź czy są zapisane w localStorage
- Dodaj lepszy guard w performSendMessage

**Prawdopodobieństwo:** ⭐⭐⭐ (20%)

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### ❌ PRZYCZYNA 3: WebCrypto API nie dostępne
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Kod (crypto.ts:446-455):**
```typescript
const publicKey = await crypto.subtle.importKey(
  'spki',
  publicKeyBuffer,
  { name: 'RSA-OAEP', hash: 'SHA-256' },
  false,
  ['encrypt']
);
```

**Problem:**
- `crypto.subtle` nie istnieje w:
  - HTTP (nie-HTTPS) w niektórych przeglądarkach
  - Starych przeglądarkach (Chrome < 37, Firefox < 34, Safari < 11)
  - Private/Incognito mode w niektórych konfiguracjach

**Jak sprawdzić:**
```javascript
// W Console (F12):
console.log('crypto:', typeof crypto)
console.log('crypto.subtle:', typeof crypto.subtle)
console.log('HTTPS:', window.location.protocol === 'https:')

// Powinno być:
// crypto: "object"
// crypto.subtle: "object"  ← MUSI BYĆ!
// HTTPS: true
```

**Jak naprawić:**
- Sprawdź czy używasz HTTPS (https://secure-messenger.info)
- Sprawdź wersję przeglądarki
- Użyj `checkBrowserCompatibility()` z crypto.ts

**Prawdopodobieństwo:** ⭐⭐ (10% - bo używasz HTTPS)

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### ❌ PRZYCZYNA 4: base64ToArrayBuffer() failuje
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Kod (crypto.ts:678-685):**
```typescript
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);  // ← Może rzucić DOMException!
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
```

**Problem:**
- `atob()` rzuca `DOMException` jeśli string nie jest valid base64
- Hardcoded `'recipient-public-key'` → **NIE JEST** valid base64!
- Error: "Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded"

**Test:**
```javascript
// W Console:
try {
  atob('recipient-public-key')
} catch (e) {
  console.error(e)  // DOMException: Invalid character
}

try {
  atob('MIIBIjANBg...')  // Prawdziwy base64
  console.log('OK')
} catch (e) {
  console.error(e)
}
```

**Prawdopodobieństwo:** ⭐⭐⭐⭐⭐ (95% - łączy się z przyczyną 1!)

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### ❌ PRZYCZYNA 5: sendMessage() failuje (RLS block)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Kod (ChatInterface.tsx:805-810):**
```typescript
const dbMessage = await sendMessage(
  activeConversation.id,
  currentUser.id,
  JSON.stringify(encryptedContent),
  { algorithm: 'PQC-AES-256-GCM-RSA2048', bitLength: 2048 }
)
```

**Problem:**
- Nawet jeśli szyfrowanie się powiedzie, `sendMessage()` może failować
- RLS może blokować INSERT do tabeli `messages`
- Błąd w try-catch bloku → "Failed to encrypt message" (mylący komunikat!)

**Możliwe błędy RLS:**
```sql
-- Jeśli brak policy messages_insert:
ERROR: new row violates row-level security policy for table "messages"

-- Jeśli user nie jest w conversation_participants:
ERROR: insert or update on table "messages" violates foreign key constraint
```

**Jak sprawdzić:**
```javascript
// Dodaj więcej logów w catch block:
} catch (error) {
  console.error('Full error details:', error)
  console.error('Error name:', error.name)
  console.error('Error message:', error.message)
  console.error('Error stack:', error.stack)
}
```

**Prawdopodobieństwo:** ⭐⭐⭐ (20% - jeśli SQL nie był wykonany)

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### ❌ PRZYCZYNA 6: Brak public_key w otherParticipant
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Problem:**
- `getUserConversations()` NIE pobiera `public_key` (tylko status, username, etc.)
- `activeConversation.otherParticipant.public_key` = undefined
- Nie ma skąd wziąć klucza do szyfrowania!

**Aktualny query (supabase.ts:586-593):**
```typescript
users!inner (
  id,
  username,
  display_name,
  avatar_url,
  status,
  last_seen
  // ❌ BRAK: public_key!
)
```

**Fix:**
```typescript
users!inner (
  id,
  username,
  display_name,
  avatar_url,
  status,
  last_seen,
  public_key  // ← DODAJ!
)
```

**Prawdopodobieństwo:** ⭐⭐⭐⭐ (30% - trzeba dodać public_key do query)

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### ❌ PRZYCZYNA 7: TextEncoder nie działa
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Kod (crypto.ts:442):**
```typescript
const encodedMessage = new TextEncoder().encode(message);
```

**Problem:**
- `TextEncoder` nie dostępny w starych przeglądarkach
- Error: "TextEncoder is not defined"

**Jak sprawdzić:**
```javascript
// Console:
console.log('TextEncoder:', typeof TextEncoder)
// Powinno być: "function"
```

**Prawdopodobieństwo:** ⭐ (5% - nowoczesne przeglądarki mają to)

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### ❌ PRZYCZYNA 8: crypto.subtle.importKey() failuje
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Kod (crypto.ts:446-455):**
```typescript
const publicKey = await crypto.subtle.importKey(
  'spki',              // Format
  publicKeyBuffer,     // Data
  { name: 'RSA-OAEP', hash: 'SHA-256' },
  false,
  ['encrypt']
);
```

**Możliwe błędy:**
1. **Invalid format:** publicKeyBuffer nie jest valid SPKI
2. **Invalid algorithm:** RSA-OAEP nie wspierany
3. **Invalid usage:** Klucz nie ma flag 'encrypt'
4. **Corrupted data:** publicKeyBuffer jest uszkodzony

**Error messages:**
```
DOMException: Data provided to an operation does not meet requirements
DOMException: The provided key material is invalid
OperationError: The operation failed for an operation-specific reason
```

**Prawdopodobieństwo:** ⭐⭐⭐⭐ (40% - ze względu na hardcoded key)

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### ❌ PRZYCZYNA 9: crypto.subtle.encrypt() failuje
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Kod (crypto.ts:458-462):**
```typescript
const encryptedData = await crypto.subtle.encrypt(
  { name: 'RSA-OAEP' },
  publicKey,
  encodedMessage
);
```

**Możliwe błędy:**
1. **Message too long:** RSA-2048 max = 214 bytes (z padding)
2. **Invalid key:** Klucz nie jest typu 'public' lub nie ma usage 'encrypt'
3. **Algorithm mismatch:** Klucz był wygenerowany innym algorytmem

**RSA-2048 Limit:**
```
Max message size = (keySize / 8) - padding
                 = (2048 / 8) - 42
                 = 256 - 42
                 = 214 bytes

Jeśli message.length > 214 bytes → OperationError!
```

**Prawdopodobieństwo:** ⭐⭐ (10% - większość wiadomości < 214 bytes)

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### ❌ PRZYCZYNA 10: sendMessage() DB error (RLS/FK)
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Kod (message-operations.ts:74-78):**
```typescript
const { data: message, error } = await supabase
  .from('messages')
  .insert(insertData)
  .select()
  .single();
```

**Możliwe błędy:**
1. **RLS block:** Brak policy `messages_insert`
2. **FK violation:** `sender_id` nie istnieje w `auth.users`
3. **FK violation:** `conversation_id` nie istnieje w `conversations`
4. **Check constraint:** `forwarding_disabled` nie jest boolean

**Error messages:**
```
ERROR: new row violates row-level security policy for table "messages"
ERROR: insert or update violates foreign key constraint "messages_sender_id_fkey"
ERROR: insert or update violates foreign key constraint "messages_conversation_id_fkey"
```

**Prawdopodobieństwo:** ⭐⭐⭐ (20% - jeśli SQL nie wykonany)

---

## 🔍 DIAGNOSTYKA - CO SPRAWDZIĆ

### **1. Console Logs (NAJWAŻNIEJSZE!)**

Otwórz F12 → Console i wyślij wiadomość. Sprawdź który błąd dokładnie pojawia się:

```javascript
// Możliwe błędy:

// A) Base64 decode error (PRZYCZYNA 1+4)
DOMException: Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded

// B) ImportKey error (PRZYCZYNA 1+8)
DOMException: Failed to execute 'importKey' on 'SubtleCrypto': The provided key material is invalid

// C) Encrypt error (PRZYCZYNA 9)
OperationError: The operation failed for an operation-specific reason

// D) Database error (PRZYCZYNA 10)
Error: new row violates row-level security policy for table "messages"

// E) No keyPair (PRZYCZYNA 2)
TypeError: Cannot read property 'publicKey' of null

// F) No WebCrypto (PRZYCZYNA 3+7)
ReferenceError: crypto is not defined
TypeError: Cannot read property 'subtle' of undefined
ReferenceError: TextEncoder is not defined
```

**Skopiuj DOKŁADNY błąd i prześlij mi!**

---

### **2. Sprawdź keyPair**

```javascript
// W Console przed wysłaniem wiadomości:
const stored = localStorage.getItem('securechat-keypair')
console.log('KeyPair exists:', !!stored)
console.log('KeyPair length:', stored?.length)

// Powinno być:
// KeyPair exists: true
// KeyPair length: ~3000-5000 (długi string)
```

---

### **3. Sprawdź recipient public key**

```javascript
// W Console (w otwartej konwersacji):
console.log('Active conversation:', activeConversation)
console.log('Other participant:', activeConversation?.otherParticipant)
console.log('Recipient public key:', activeConversation?.otherParticipant?.public_key)

// POWINNO BYĆ:
// Recipient public key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg..."

// JEŚLI undefined → to jest problem!
```

---

### **4. Sprawdź WebCrypto**

```javascript
// Console:
console.log({
  crypto: typeof crypto,
  subtle: typeof crypto?.subtle,
  TextEncoder: typeof TextEncoder,
  https: window.location.protocol === 'https:'
})

// Wszystkie powinny być:
// crypto: "object"
// subtle: "object"
// TextEncoder: "function"
// https: true
```

---

### **5. Test base64 decode**

```javascript
// Console:
const testKey = 'recipient-public-key'
try {
  const decoded = atob(testKey)
  console.log('Decoded OK')
} catch (e) {
  console.error('Base64 error:', e.message)
  // Jeśli błąd → to jest przyczyna!
}
```

---

## 🛠️ NAJPRAWDOPODOBNIEJSZA NAPRAWA

### **Problem: Hardcoded 'recipient-public-key' (90%)**

**Miejsce:** ChatInterface.tsx:797

**Trzeba zmienić na:**

```typescript
// 1. Dodaj public_key do query w getUserConversations()
// W supabase.ts, dodaj do users!inner:
users!inner (
  id,
  username,
  display_name,
  avatar_url,
  status,
  last_seen,
  public_key  // ← DODAJ TĘ LINIĘ!
)

// 2. Pobierz klucz przed szyfrowaniem w ChatInterface.tsx
const performSendMessage = async () => {
  if (!newMessage.trim() || !activeConversation || !keyPair) return

  // DODAJ: Pobierz recipient public key
  const recipientPublicKey = activeConversation.otherParticipant?.public_key
  
  if (!recipientPublicKey) {
    toast.error('Cannot find recipient encryption key. Please try starting a new conversation.')
    return
  }

  // ... reszta kodu ...

  try {
    const encryptedContent = await encryptMessage(
      messageToSend,
      recipientPublicKey,  // ← Prawdziwy klucz zamiast hardcoded!
      keyPair,
      (progress) => { ... }
    )
    
    // ... reszta
  }
}
```

---

## 📊 RANKING PRZYCZYN (od najbardziej prawdopodobnej)

| # | Przyczyna | Prawdopodobieństwo | Fix Difficulty |
|---|-----------|-------------------|----------------|
| 1 | Hardcoded recipient key | ⭐⭐⭐⭐⭐ 90% | Łatwy |
| 4 | base64ToArrayBuffer fails | ⭐⭐⭐⭐⭐ 95% | Wynika z #1 |
| 8 | importKey fails | ⭐⭐⭐⭐ 40% | Wynika z #1 |
| 6 | Brak public_key w query | ⭐⭐⭐⭐ 30% | Łatwy |
| 5 | sendMessage RLS block | ⭐⭐⭐ 20% | Execute SQL |
| 2 | keyPair null | ⭐⭐⭐ 20% | Regenerate keys |
| 10 | DB errors | ⭐⭐⭐ 20% | Execute SQL |
| 9 | Message too long | ⭐⭐ 10% | Chunk messages |
| 3 | No WebCrypto | ⭐⭐ 10% | Use HTTPS |
| 7 | No TextEncoder | ⭐ 5% | Update browser |

---

## 🎯 CO ZROBIĆ TERAZ

### **KROK 1: Sprawdź dokładny błąd**

1. Otwórz aplikację
2. F12 → Console
3. Wyślij wiadomość
4. **Skopiuj DOKŁADNY błąd z Console**
5. Prześlij mi go

**To pozwoli mi określić DOKŁADNĄ przyczynę!**

---

### **KROK 2: Quick checks**

Wklej w Console i prześlij wyniki:

```javascript
// Test 1: KeyPair
const kp = localStorage.getItem('securechat-keypair')
console.log('1. KeyPair exists:', !!kp, 'Length:', kp?.length)

// Test 2: Recipient key
console.log('2. Recipient key:', activeConversation?.otherParticipant?.public_key?.substring(0, 50))

// Test 3: WebCrypto
console.log('3. WebCrypto:', typeof crypto?.subtle)

// Test 4: Base64 test
try { atob('recipient-public-key') } catch(e) { console.log('4. Base64 error:', e.message) }
```

---

## 🚀 TYMCZASOWE ROZWIĄZANIE

Jeśli chcesz szybko przetestować czy reszta działa, możesz **tymczasowo wyłączyć szyfrowanie**:

**W ChatInterface.tsx:793-802, zamień na:**

```typescript
// TEMPORARY: Skip encryption for testing
const encryptedContent = {
  data: messageToSend,  // Niezaszyfrowane (tylko test!)
  keyId: 'test',
  nonce: 'test',
  timestamp: Date.now(),
  integrity: 'test',
  algorithm: 'NONE',
  bitLength: 0
}

// Commented out real encryption:
// const encryptedContent = await encryptMessage(...)
```

**⚠️ UWAGA:** To tylko do testowania! Wiadomości będą niezaszyfrowane!

---

**Prześlij mi błąd z Console - wtedy podam dokładną naprawę!** 🎯

