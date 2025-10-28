# 🔄 Wizualny Diagram Przepływu Wiadomości

## Uproszczony schemat - od nadawcy do odbiorcy

```
┌─────────────────┐                    ┌─────────────────┐
│   UŻYTKOWNIK A  │                    │   UŻYTKOWNIK B  │
│    (Nadawca)    │                    │    (Odbiorca)   │
└────────┬────────┘                    └────────▲────────┘
         │                                      │
         │ 1. Pisze wiadomość                  │ 8. Widzi wiadomość
         │                                      │
         ▼                                      │
┌─────────────────┐                    ┌────────┴────────┐
│   ChatInput     │                    │  MessageBubble  │
│  (component)    │                    │   (component)   │
└────────┬────────┘                    └────────▲────────┘
         │                                      │
         │ 2. Szyfruje (RSA)                   │ 7. Deszyfruje
         │                                      │
         ▼                                      │
┌─────────────────┐                    ┌────────┴────────┐
│   crypto.ts     │                    │    crypto.ts    │
│ encryptMessage()│                    │decryptMessage() │
└────────┬────────┘                    └────────▲────────┘
         │                                      │
         │ 3. Wysyła                           │ 6. Odbiera
         │                                      │
         ▼                                      │
┌─────────────────────────────────────────────┴────────┐
│                      SUPABASE                         │
│  ┌─────────────┐    ┌──────────┐    ┌─────────────┐ │
│  │   INSERT    │───▶│   RLS    │───▶│  REALTIME   │ │
│  │  messages   │    │ Policies │    │  Broadcast  │ │
│  └─────────────┘    └──────────┘    └─────────────┘ │
└───────────────────────────────────────────────────────┘
         │              │               │
         │              │               │
         ▼              ▼               ▼
    4. Zapisuje   5. Weryfikuje   6. Powiadamia
```

## Szczegółowy przepływ danych

```
START: Użytkownik A pisze "Cześć!"
│
├─[FRONTEND]─────────────────────────────────────────────┐
│                                                         │
│  1. INPUT: "Cześć!"                                   │
│     └─> ChatInput.handleSendMessage()                 │
│                                                         │
│  2. ENCRYPT:                                           │
│     ├─> Pobierz public_key Użytkownika B             │
│     ├─> crypto.subtle.encrypt(RSA-OAEP, "Cześć!")    │
│     └─> encrypted_content = "gR7k2mN9..."            │
│                                                         │
│  3. PREPARE MESSAGE:                                   │
│     {                                                  │
│       conversation_id: "uuid-123",                     │
│       sender_id: "user-a-id",                         │
│       encrypted_content: "gR7k2mN9...",               │
│       encryption_metadata: { algorithm: "RSA-OAEP" }  │
│     }                                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
├─[NETWORK]────────────────────────────────────────────┐
│                                                       │
│  4. HTTP POST to Supabase                           │
│     Authorization: Bearer <JWT_TOKEN>                │
│     Body: { encrypted message data }                 │
│                                                       │
└───────────────────────────────────────────────────────┘
                           │
                           ▼
├─[SUPABASE DATABASE]──────────────────────────────────┐
│                                                       │
│  5. RLS CHECK:                                       │
│     is_conversation_participant(conv_id, sender_id)? │
│     └─> ✓ YES (policy allows INSERT)                │
│                                                       │
│  6. INSERT INTO messages:                            │
│     ├─> id: "msg-uuid-789"                          │
│     ├─> sent_at: "2025-01-08 15:30:45"             │
│     └─> Store encrypted content                      │
│                                                       │
│  7. TRIGGER REALTIME:                               │
│     └─> Emit to channel: conversations:uuid-123     │
│                                                       │
└───────────────────────────────────────────────────────┘
                           │
                           ▼
├─[WEBSOCKET]──────────────────────────────────────────┐
│                                                       │
│  8. BROADCAST:                                       │
│     Event: postgres_changes                          │
│     Table: messages                                  │
│     Type: INSERT                                     │
│     Payload: { new message data }                    │
│                                                       │
└───────────────────────────────────────────────────────┘
                           │
                           ▼
├─[FRONTEND - User B]──────────────────────────────────┐
│                                                       │
│  9. RECEIVE:                                         │
│     ConversationDetail.useEffect()                   │
│     └─> New message detected!                        │
│                                                       │
│  10. DECRYPT:                                        │
│      ├─> Get User B's private_key                   │
│      ├─> crypto.subtle.decrypt(RSA-OAEP, "gR7k...")│
│      └─> decrypted_content = "Cześć!"              │
│                                                       │
│  11. DISPLAY:                                        │
│      MessageBubble renders:                          │
│      ┌────────────────────┐                         │
│      │ User A: Cześć!     │                         │
│      │ 15:30              │                         │
│      └────────────────────┘                         │
│                                                       │
└───────────────────────────────────────────────────────┘
                           │
                           ▼
                         END: Użytkownik B widzi "Cześć!"
```

## Zabezpieczenia na każdym etapie

```
┌─────────────────────────────────────────────────────┐
│                  WARSTWA 1: AUTH                     │
├─────────────────────────────────────────────────────┤
│  • JWT Token weryfikuje tożsamość                  │
│  • Sesja użytkownika sprawdzana                    │
└─────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────┐
│               WARSTWA 2: ENCRYPTION                  │
├─────────────────────────────────────────────────────┤
│  • RSA-2048 bit keys                               │
│  • End-to-end encryption                           │
│  • Tylko odbiorca może odszyfrować                 │
└─────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────┐
│                 WARSTWA 3: RLS                       │
├─────────────────────────────────────────────────────┤
│  • Row Level Security policies                      │
│  • is_conversation_participant() check              │
│  • SECURITY DEFINER functions                       │
└─────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────┐
│              WARSTWA 4: AUDIT LOG                    │
├─────────────────────────────────────────────────────┤
│  • security_audit_log table                        │
│  • Śledzenie wszystkich operacji                   │
│  • IP, User Agent, timestamps                      │
└─────────────────────────────────────────────────────┘
```

## Komponenty biorące udział

### Frontend (React):
- `ChatInput.tsx` - wprowadzanie tekstu
- `ConversationDetail.tsx` - główny widok czatu
- `MessageBubble.tsx` - wyświetlanie wiadomości
- `VoiceRecorder.tsx` - nagrywanie audio
- `FileUpload.tsx` - przesyłanie plików

### Biblioteki (TypeScript):
- `crypto.ts` - szyfrowanie RSA
- `messages.ts` - API wiadomości
- `supabase.ts` - klient Supabase
- `realtime.ts` - WebSocket handling

### Backend (Supabase):
- Tabela `messages` - przechowywanie
- Tabela `message_status` - statusy
- Tabela `message_attachments` - pliki
- RLS Policies - kontrola dostępu
- Realtime - broadcasting

### Infrastruktura:
- PostgreSQL - baza danych
- WebSockets - komunikacja real-time
- Nginx - reverse proxy
- Docker - konteneryzacja
