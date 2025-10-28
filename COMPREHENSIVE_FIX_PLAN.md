# 🔧 Kompleksowy Plan Naprawy - Secure Messenger

## 📊 ANALIZA REPOZYTORIUM

### Statystyki:
- **TypeScript plików:** 145
- **SQL plików:** 11
- **Dokumentacja:** 662 MD files

### Struktura:
```
✅ src/              - Kod aplikacji
✅ deployment/       - Konfiguracje Docker/Kubernetes
✅ scripts/          - Skrypty pomocnicze
✅ docs/             - Dokumentacja
✅ public/           - Assety statyczne
```

---

## 🐛 ZIDENTYFIKOWANE PROBLEMY

### 🔴 KRYTYCZNE (Muszą być naprawione):

#### 1. **Deszyfrowanie nie działa** ⚠️
**Plik:** `src/lib/crypto.ts` linie 372-393
**Problem:**
```typescript
const originalMessage = messageStorage.get(encryptedMessage.data);
if (originalMessage) {
  return originalMessage; // ❌ Zwraca tylko z cache!
}
// Fallback nie działa dla prawdziwych zaszyfrowanych wiadomości
```

**Naprawa:** Dodać prawdziwe RSA-OAEP decryption z WebCrypto API

---

#### 2. **Brak RLS Policies dla Messages**
**Tabela:** `public.messages`
**Problem:** Użytkownicy nie mogą czytać/pisać wiadomości
**Naprawa:** Dodać 4 RLS policies

---

#### 3. **Brak RLS Policies dla Conversations**
**Tabela:** `public.conversations`
**Problem:** Użytkownicy nie mogą tworzyć/czytać konwersacji
**Naprawa:** Dodać 3 RLS policies

---

#### 4. **Brak tabeli Message Attachments**
**Problem:** Voice messages i media nie mogą być przechowywane
**Naprawa:** Utworzyć tabelę `message_attachments`

---

### 🟡 ŚREDNIE (Ważne ale nie blokujące):

#### 5. **Długi czas szyfrowania (30s)**
**Plik:** `src/lib/crypto.ts`
**Problem:** UX - użytkownik czeka 30s na wysłanie wiadomości
**Rozwiązanie:** Opcjonalne - można skrócić do 5-10s

#### 6. **Brak UI dla Messaging**
**Problem:** Brak komponentów ChatView, MessageList, MessageInput
**Status:** Planowane na przyszłość

#### 7. **Email configuration**
**Problem:** Wymaga konfiguracji w Supabase Dashboard
**Rozwiązanie:** Dokumentacja już przygotowana

---

## ✅ PLAN IMPLEMENTACJI

### FAZA 1: Naprawa Krytycznych Bugów (30 min)

#### Krok 1.1: Napraw Deszyfrowanie RSA
```typescript
// src/lib/crypto.ts - nowa implementacja decryptMessage

export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  recipientKeyPair: KeyPair,
  onProgress?: (progress: EncryptionProgress) => void
): Promise<string> {
  try {
    // 1. Sprawdź cache (dla wiadomości z tej samej sesji)
    const cachedMessage = messageStorage.get(encryptedMessage.data);
    if (cachedMessage) {
      onProgress?.({ phase: 'finalization', progress: 100, message: 'Loaded from cache' });
      return cachedMessage;
    }

    // 2. Prawdziwe RSA decryption
    onProgress?.({ phase: 'key-derivation', progress: 20, message: 'Loading private key...' });
    
    // Import private key
    const privateKeyBuffer = base64ToArrayBuffer(recipientKeyPair.privateKey);
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );

    onProgress?.({ phase: 'quantum-resistance', progress: 50, message: 'Decrypting message...' });

    // Decrypt data
    const encryptedBuffer = base64ToArrayBuffer(encryptedMessage.data);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedBuffer
    );

    onProgress?.({ phase: 'finalization', progress: 100, message: 'Decryption complete!' });

    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);

  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Failed to decrypt message: ${error.message}`);
  }
}
```

#### Krok 1.2: Dodaj RLS Policies SQL
```sql
-- messages_rls_policies.sql

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "users_view_conversation_messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = messages.conversation_id 
      AND user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "users_send_messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = messages.conversation_id 
      AND user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "users_edit_own_messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "users_delete_own_messages" ON public.messages
  FOR DELETE USING (sender_id = auth.uid());

-- Conversations policies
CREATE POLICY "users_view_conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = conversations.id 
      AND user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "users_create_conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "creators_update_conversations" ON public.conversations
  FOR UPDATE USING (created_by = auth.uid());

-- Conversation participants policies
CREATE POLICY "participants_view_participants" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp 
      WHERE cp.conversation_id = conversation_participants.conversation_id 
      AND cp.user_id = auth.uid() AND cp.is_active = true
    )
  );

CREATE POLICY "users_join_conversations" ON public.conversation_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_leave_conversations" ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Message status policies
CREATE POLICY "users_view_message_status" ON public.message_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_status.message_id
      AND cp.user_id = auth.uid() AND cp.is_active = true
    )
  );

CREATE POLICY "users_update_own_status" ON public.message_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_modify_status" ON public.message_status
  FOR UPDATE USING (user_id = auth.uid());
```

#### Krok 1.3: Dodaj Message Attachments Table
```sql
-- message_attachments.sql

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
  duration integer,
  waveform jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX idx_message_attachments_file_type ON public.message_attachments(file_type);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_attachments" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
      AND cp.user_id = auth.uid() AND cp.is_active = true
    )
  );

CREATE POLICY "users_upload_attachments" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
    )
  );
```

---

### FAZA 2: Deployment (20 min)

#### Krok 2.1: Commit Zmian
```bash
git add -A
git commit -m "🔧 Critical fixes: RSA decryption + RLS policies"
git push origin main
```

#### Krok 2.2: Update Bazy Danych w Supabase
1. Otwórz Supabase SQL Editor
2. Uruchom `messages_rls_policies.sql`
3. Uruchom `message_attachments.sql`
4. Zweryfikuj: `SELECT * FROM pg_policies WHERE tablename = 'messages';`

#### Krok 2.3: Rebuild i Deploy na Serwer
```bash
ssh admin@5.22.223.49
cd /opt/Secure-Messenger
git pull
docker build -f Dockerfile.production.fixed -t secure-messenger:latest .
docker stop secure-messenger
docker rm secure-messenger
docker run -d --name secure-messenger --restart always -p 80:80 secure-messenger:latest
docker ps
docker logs secure-messenger
```

#### Krok 2.4: Weryfikacja
```bash
# Test HTTP
curl http://5.22.223.49/health

# Test aplikacji
open http://5.22.223.49
```

---

## 📝 PLIKI DO UTWORZENIA/MODYFIKACJI

### Do modyfikacji:
1. ✅ `src/lib/crypto.ts` - Napraw decryptMessage
2. ✅ `complete-security-migration.sql` - Już zawiera security tables

### Do utworzenia:
3. ✅ `messages_rls_policies.sql` - RLS dla messaging
4. ✅ `message_attachments.sql` - Tabela dla mediów

### Dokumentacja:
5. ✅ `COMPREHENSIVE_FIX_PLAN.md` - Ten plik
6. ✅ `DEPLOYMENT_CHECKLIST.md` - Checklist deployment

---

## ⏱️ TIMELINE

- **Faza 1:** 30 minut (implementacja fixów)
- **Faza 2:** 20 minut (deployment)
- **Total:** ~50 minut

---

## ✅ KRYTERIA SUKCESU

Po implementacji wszystkie te funkcje będą działać:

1. ✅ Użytkownicy mogą wysyłać wiadomości
2. ✅ Wiadomości są szyfrowane i deszyfrowane RSA
3. ✅ Wiadomości są widoczne tylko dla uczestników konwersacji
4. ✅ Można przesyłać załączniki (przygotowanie na voice messages)
5. ✅ Email confirmation działa
6. ✅ Wszystkie security features działają

---

## 🚀 START IMPLEMENTACJI

**Status:** READY TO IMPLEMENT
**Next Action:** Implementuj Krok 1.1 - Napraw decryptMessage

---

*Plan utworzony: 8 października 2025*
*Priorytet: 🔴 KRYTYCZNY*
*Czas implementacji: ~50 minut*
