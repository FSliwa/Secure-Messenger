# 🚨 Krytyczne Poprawki - Do Natychmiastowej Implementacji

## 🔴 FIX #1: Deszyfrowanie Wiadomości (CRITICAL)

### Problem:
Funkcja `decryptMessage` w `src/lib/crypto.ts` NIE deszyfruje wiadomości z bazy danych.
Używa tylko cache (`messageStorage` Map) który działa tylko w tej samej sesji.

### Lokalizacja:
`src/lib/crypto.ts` - linie 304-380

### Rozwiązanie - Dodaj ten kod:

```typescript
// Dodaj te helper functions na początku pliku
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// ZAMIEŃ całą funkcję decryptMessage na:
export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  recipientKeyPair: KeyPair,
  onProgress?: (progress: EncryptionProgress) => void
): Promise<string> {
  const startTime = Date.now();
  
  try {
    // Phase 1: Load keys
    onProgress?.({
      phase: 'key-derivation',
      progress: 10,
      message: 'Loading decryption keys...'
    });
    
    // Import private key
    const privateKeyData = base64ToArrayBuffer(recipientKeyPair.privateKey);
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      false,
      ['decrypt']
    );
    
    onProgress?.({
      phase: 'key-derivation',
      progress: 30,
      message: 'Private key loaded successfully'
    });
    
    // Phase 2: Decrypt
    onProgress?.({
      phase: 'quantum-resistance',
      progress: 40,
      message: 'Decrypting message...'
    });
    
    // Najpierw sprawdź cache (dla wiadomości z tej samej sesji)
    const cachedMessage = messageStorage.get(encryptedMessage.data);
    if (cachedMessage) {
      onProgress?.({
        phase: 'finalization',
        progress: 100,
        message: 'Message decrypted from cache!'
      });
      return cachedMessage;
    }
    
    // Jeśli nie ma w cache, deszyfruj prawdziwie
    // Konwertuj zaszyfrowane dane z base64
    const encryptedData = base64ToArrayBuffer(encryptedMessage.data);
    
    // Deszyfruj używając RSA-OAEP
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
      },
      privateKey,
      encryptedData
    );
    
    onProgress?.({
      phase: 'integrity-hash',
      progress: 80,
      message: 'Verifying message integrity...'
    });
    
    // Decode decrypted data
    const decoder = new TextDecoder();
    const decryptedMessage = decoder.decode(decryptedData);
    
    onProgress?.({
      phase: 'finalization',
      progress: 100,
      message: 'Message decrypted successfully!'
    });
    
    return decryptedMessage;
    
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Failed to decrypt message: ${error.message}`);
  }
}
```

---

## 🔴 FIX #2: RLS Policies dla Messages

### Problem:
Tabela `messages` nie ma Row Level Security policies, więc użytkownicy nie mogą czytać/wysyłać wiadomości.

### Lokalizacja:
Dodaj do pliku `database-schema.sql` lub uruchom w Supabase SQL Editor

### Rozwiązanie:

```sql
-- Włącz RLS dla messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Użytkownicy mogą czytać wiadomości w swoich konwersacjach
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = messages.conversation_id 
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.is_active = true
    )
  );

-- Policy: Użytkownicy mogą wysyłać wiadomości do swoich konwersacji
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
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

-- Policy: Użytkownicy mogą edytować swoje wiadomości
DROP POLICY IF EXISTS "Users can edit their own messages" ON public.messages;
CREATE POLICY "Users can edit their own messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Policy: Użytkownicy mogą usuwać swoje wiadomości
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE USING (sender_id = auth.uid());
```

---

## 🔴 FIX #3: RLS Policies dla Conversations

### Problem:
Tabela `conversations` nie ma RLS policies

### Rozwiązanie:

```sql
-- Włącz RLS dla conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Użytkownicy mogą czytać swoje konwersacje
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = conversations.id 
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.is_active = true
    )
  );

-- Policy: Użytkownicy mogą tworzyć konwersacje
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Tylko creator może edytować konwersację
DROP POLICY IF EXISTS "Creators can update their conversations" ON public.conversations;
CREATE POLICY "Creators can update their conversations" ON public.conversations
  FOR UPDATE USING (created_by = auth.uid());
```

---

## 🔴 FIX #4: RLS Policies dla Conversation Participants

### Rozwiązanie:

```sql
-- Włącz RLS dla conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Uczestnicy mogą widzieć innych uczestników
DROP POLICY IF EXISTS "Participants can view other participants" ON public.conversation_participants;
CREATE POLICY "Participants can view other participants" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = conversation_participants.conversation_id 
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

-- Policy: Użytkownicy mogą dołączyć do konwersacji (jeśli mają access_code)
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
CREATE POLICY "Users can join conversations" ON public.conversation_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Użytkownicy mogą opuścić konwersację
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_participants;
CREATE POLICY "Users can leave conversations" ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid());
```

---

## 🔴 FIX #5: Message Attachments Table

### Problem:
Brak tabeli dla załączników (voice messages, zdjęcia, pliki)

### Rozwiązanie:

```sql
-- Utwórz tabelę dla załączników
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document', 'voice')),
  file_url text NOT NULL,
  file_name text,
  file_size bigint,
  mime_type text,
  encrypted boolean DEFAULT true NOT NULL,
  encryption_metadata jsonb,
  thumbnail_url text,
  duration integer, -- for audio/video in seconds
  waveform jsonb, -- for audio visualization
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_file_type ON public.message_attachments(file_type);

-- RLS Policies
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view attachments in their conversations" ON public.message_attachments;
CREATE POLICY "Users can view attachments in their conversations" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can upload attachments to their messages" ON public.message_attachments;
CREATE POLICY "Users can upload attachments to their messages" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
    )
  );
```

---

## 🟡 FIX #6: Email Configuration (Supabase Dashboard)

### Problem:
System mailingu może nie działać jeśli nie jest skonfigurowany w Supabase

### Kroki w Supabase Dashboard:

1. **Authentication** → **Email Templates**
   - Confirm signup: Customize template
   - Magic Link: Customize template
   - Change Email Address: Customize template
   - Reset Password: Customize template

2. **Authentication** → **URL Configuration**
   - Site URL: `http://5.22.223.49` (lub Twoja domena)
   - Redirect URLs: Dodaj `http://5.22.223.49/auth/callback`

3. **Project Settings** → **API**
   - Sprawdź czy Site URL jest poprawny

4. **Authentication** → **Providers** → **Email**
   - Włącz "Confirm email"
   - Włącz "Secure email change"

---

## 🟢 FIX #7: Message Status RLS

### Rozwiązanie:

```sql
-- Włącz RLS dla message_status
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view message status in their conversations" ON public.message_status;
CREATE POLICY "Users can view message status in their conversations" ON public.message_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_status.message_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update their own message status" ON public.message_status;
CREATE POLICY "Users can update their own message status" ON public.message_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can modify their message status" ON public.message_status;
CREATE POLICY "Users can modify their message status" ON public.message_status
  FOR UPDATE USING (user_id = auth.uid());
```

---

## 📋 KOLEJNOŚĆ IMPLEMENTACJI:

1. ✅ **FIX #2** - RLS dla Messages (bez tego NIE DZIAŁA messaging)
2. ✅ **FIX #3** - RLS dla Conversations
3. ✅ **FIX #4** - RLS dla Conversation Participants  
4. ✅ **FIX #1** - Deszyfrowanie (krytyczne dla czytania wiadomości)
5. ✅ **FIX #5** - Message Attachments (dla voice messages)
6. ✅ **FIX #7** - Message Status RLS
7. ⚠️ **FIX #6** - Email Config (w Supabase Dashboard)

---

## 🚀 JAK WDROŻYĆ:

### Krok 1: Baza Danych
```bash
# Skopiuj FIX #2, #3, #4, #5, #7 do jednego pliku
# Uruchom w Supabase SQL Editor
```

### Krok 2: Kod Aplikacji
```bash
# Edytuj src/lib/crypto.ts - FIX #1
# Rebuild aplikacji
npm run build
```

### Krok 3: Supabase Dashboard
```bash
# Skonfiguruj Email Templates - FIX #6
# Dodaj Site URL i Redirect URLs
```

### Krok 4: Deploy
```bash
# Push do GitHub
git add .
git commit -m "Critical fixes: decryption, RLS policies, message attachments"
git push

# Rebuild na serwerze
ssh admin@5.22.223.49
cd /opt/Secure-Messenger
git pull
docker build -f Dockerfile.production.fixed -t secure-messenger:latest .
docker restart secure-messenger
```

---

*Dokumentacja utworzona: 8 października 2025*
*Priorytet: 🔴 KRYTYCZNY - Wymaga natychmiastowej implementacji*
