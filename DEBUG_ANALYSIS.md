# 🐛 Analiza Bugów i Rozwiązań - Secure Messenger

## 📋 Zgłoszone Problemy:

1. ❌ Nie można wysłać wiadomości
2. ❌ Nie można deszyfrować wiadomości  
3. ❌ Nie można nagrać wiadomości (voice message)
4. ❌ System mailingu nie działa

---

## 🔍 ANALIZA PROBLEMU #1: Wysyłanie Wiadomości

### Potencjalne przyczyny:
1. **Brak konwersacji** - Użytkownik nie może utworzyć/znaleźć konwersacji
2. **Błąd szyfrowania** - Zbyt długi czas szyfrowania (30s) blokuje UI
3. **Brakujące dane** - PublicKey odbiorcy nie został pobrany
4. **RLS Permissions** - Brak uprawnień do wstawiania wiadomości do bazy
5. **Brak UI** - Interfejs nie ma pola do wysyłania wiadomości

### Analiza kodu:
- `src/lib/crypto.ts` - Szyfrowanie trwa 30 sekund (symulowane)
- Brak komponentu `MessageInput` lub `ChatView` w repozytorium
- Potrzebne komponenty do tworzenia konwersacji

### Rozwiązanie:
✅ Utworzyć kompletny UI dla messaging
✅ Dodać RLS policies dla messages table
✅ Zmniejszyć czas szyfrowania dla lepszego UX

---

## 🔍 ANALIZA PROBLEMU #2: Deszyfrowanie Wiadomości

### Potencjalne przyczyny:
1. **Klucz prywatny niedostępny** - Nie zapisany w IndexedDB
2. **Błąd deszyfrowania** - Niezgodność algorytmów
3. **Uszkodzona wiadomość** - Błąd w encrypted_content
4. **Brak metadanych** - encryption_metadata jest null/pusty

### Analiza funkcji `decryptMessage`:
```typescript
// src/lib/crypto.ts - linie 200+
export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  recipientKeyPair: KeyPair,
  onProgress?: (progress: EncryptionProgress) => void
): Promise<string>
```

**Problem:** Funkcja deszyfruje TYLKO jeśli wiadomość była wcześniej zaszyfrowana w tej samej sesji (używa `messageStorage` Map)

### Rozwiązanie:
❌ **GŁÓWNY BUG:** Deszyfrowanie nie działa dla wiadomości z bazy danych!
```typescript
// Linia 268-271
const decryptedMessage = messageStorage.get(encryptedMessage.data);
if (decryptedMessage) {
  return decryptedMessage; // ❌ Zwraca TYLKO z cache
}
```

✅ **FIX:** Dodać prawdziwe deszyfrowanie RSA zamiast polegać na cache

---

## 🔍 ANALIZA PROBLEMU #3: Nagrywanie Wiadomości

### Potencjalne przyczyny:
1. **Brak komponentu** - Nie ma `VoiceRecorder` w UI
2. **Brak uprawnień** - Mikrofon nie ma permissions
3. **Brak storage** - Audio files nie są przechowywane
4. **Brak tabeli** - Media/attachments table nie istnieje w bazie

### Analiza:
- **BRAK** pliku `VoiceRecorder.tsx` lub podobnego
- **BRAK** obsługi MediaRecorder API
- **BRAK** tabeli `message_attachments` lub `media_files` w schemacie

### Rozwiązanie:
✅ Utworzyć komponent VoiceRecorder
✅ Dodać tabelę message_attachments
✅ Implementować MediaRecorder API

---

## 🔍 ANALIZA PROBLEMU #4: System Mailingu

### Potencjalne przyczyny:
1. **Email templates nie skonfigurowane** - Supabase Auth Email Templates
2. **SMTP nie działa** - Supabase używa własnego SMTP lub custom
3. **Brak testów** - Email confirmation nie jest testowane
4. **Redirect URL** - Niepoprawny callback URL

### Analiza kodu mailingu:
```typescript
// src/lib/supabase.ts - linia 178-194
const redirectUrl = import.meta.env.VITE_REDIRECT_URL || import.meta.env.VITE_APP_URL || window.location.origin
const callbackUrl = `${redirectUrl}/auth/callback`

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: callbackUrl, // ✅ Poprawnie skonfigurowane
    data: {
      display_name: displayName,
      username: username,
      public_key: publicKey,
    },
  },
})
```

### Sprawdzić w Supabase:
1. Authentication → Email Templates
2. Authentication → URL Configuration
3. Project Settings → API → Site URL

### Rozwiązanie:
✅ Skonfigurować email templates w Supabase Dashboard
✅ Dodać prawidłowy Site URL
✅ Włączyć email confirmation

---

## 📊 PODSUMOWANIE GŁÓWNYCH BUGÓW:

### 🔴 CRITICAL BUGS:
1. **Deszyfrowanie nie działa** - Używa tylko cache, nie prawdziwego RSA decrypt
2. **Brak UI dla messaging** - Nie ma gdzie pisać wiadomości
3. **Brak komponentu nagrywania** - Voice messages nie istnieją

### 🟡 MEDIUM BUGS:
4. **Email może nie działać** - Zależy od konfiguracji Supabase
5. **Długi czas szyfrowania** - 30s to za dużo dla UX

### 🟢 MINOR IMPROVEMENTS:
6. **Brak tabeli attachments** - Potrzebna dla mediów
7. **Brak RLS dla messages** - Może powodować błędy

---

## ✅ PLAN NAPRAWY:

### Priorytet 1 - Napraw Deszyfrowanie (CRITICAL)
```typescript
// Dodaj prawdziwe RSA decryption zamiast cache
export async function decryptMessage(encryptedMessage: EncryptedMessage, recipientKeyPair: KeyPair): Promise<string> {
  // Import klucza prywatnego
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    base64ToArrayBuffer(recipientKeyPair.privateKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
  
  // Deszyfruj
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    base64ToArrayBuffer(encryptedMessage.data)
  );
  
  return new TextDecoder().decode(decrypted);
}
```

### Priorytet 2 - Dodaj UI Messaging
- Utworzyć `ChatView.tsx`
- Utworzyć `MessageList.tsx`
- Utworzyć `MessageInput.tsx`
- Utworzyć `ConversationList.tsx`

### Priorytet 3 - Dodaj Voice Recording
- Utworzyć `VoiceRecorder.tsx`
- Implementować MediaRecorder API
- Dodać tabelę `message_attachments`

### Priorytet 4 - Napraw Email
- Skonfigurować Supabase Email Templates
- Przetestować registration flow

---

## 📝 SZCZEGÓŁOWE FIXE:

### FIX #1: Deszyfrowanie
**Plik:** `src/lib/crypto.ts`
**Problem:** Deszyfrowanie zwraca tylko z cache
**Rozwiązanie:** Dodać prawdziwe RSA decryption

### FIX #2: RLS dla Messages
**Plik:** `database-schema.sql`
**Problem:** Brak RLS policies
**Rozwiązanie:**
```sql
-- Dodaj RLS policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = messages.conversation_id 
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.is_active = true
    )
  );

CREATE POLICY "Users can send messages to their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = messages.conversation_id 
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.is_active = true
    )
  );
```

### FIX #3: Message Attachments Table
```sql
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document')),
  file_url text NOT NULL,
  file_name text,
  file_size bigint,
  mime_type text,
  encrypted boolean DEFAULT true NOT NULL,
  encryption_metadata jsonb,
  thumbnail_url text,
  duration integer, -- for audio/video
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## 🔧 WYMAGANE ZMIANY W PLIKACH:

1. ✅ `src/lib/crypto.ts` - Napraw deszyfrowanie
2. ✅ `database-schema.sql` - Dodaj RLS dla messages
3. ✅ `database-schema.sql` - Dodaj message_attachments table
4. ✅ Utworzyć `src/components/ChatView.tsx`
5. ✅ Utworzyć `src/components/VoiceRecorder.tsx`
6. ⚠️ Supabase Dashboard - Skonfigurować email templates

---

*Dokument utworzony: 8 października 2025*
*Status: Wymaga natychmiastowej implementacji poprawek*
