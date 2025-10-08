# 📨 Schemat Przepływu Wiadomości - Secure Messenger

## Kompletna droga wiadomości od nadawcy do odbiorcy

### 1. WYSYŁANIE WIADOMOŚCI (Użytkownik A → Serwer)

```
┌─────────────────────────────────────────────────────────────┐
│                     UŻYTKOWNIK A (Nadawca)                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Wpisuje wiadomość w ChatInput                            │
│ 2. Klika "Send" lub naciska Enter                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React App)                      │
├─────────────────────────────────────────────────────────────┤
│ ChatInput.tsx:                                              │
│ ├─ handleSendMessage()                                      │
│ ├─ Sprawdza czy wiadomość nie jest pusta                   │
│ └─ Wywołuje onSendMessage(content, attachments)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SZYFROWANIE (crypto.ts)                   │
├─────────────────────────────────────────────────────────────┤
│ encryptMessage():                                           │
│ ├─ Pobiera publiczne klucze wszystkich uczestników         │
│ ├─ Dla każdego odbiorcy:                                   │
│ │  ├─ Importuje klucz publiczny (RSA-OAEP)                │
│ │  └─ Szyfruje wiadomość używając crypto.subtle.encrypt   │
│ └─ Zwraca zaszyfrowaną wiadomość + metadane               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   WYSYŁANIE (messages.ts)                    │
├─────────────────────────────────────────────────────────────┤
│ sendMessage():                                              │
│ ├─ Przygotowuje obiekt wiadomości:                        │
│ │  ├─ conversation_id                                      │
│ │  ├─ sender_id (z auth.users)                            │
│ │  ├─ encrypted_content                                    │
│ │  ├─ encryption_metadata                                  │
│ │  └─ forwarding_disabled (domyślnie true)               │
│ └─ Wywołuje supabase.from('messages').insert()            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
```

### 2. PRZETWARZANIE W BAZIE DANYCH (Supabase)

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────┤
│ RLS Policies (messages table):                              │
│ ├─ "Users can send messages" - sprawdza:                   │
│ │  └─ is_conversation_participant(conversation_id, user_id)│
│ │                                                           │
│ Funkcja SECURITY DEFINER:                                   │
│ ├─ is_conversation_participant() sprawdza:                 │
│ │  └─ EXISTS w conversation_participants                   │
│ │                                                           │
│ Po INSERT:                                                  │
│ ├─ Wiadomość zapisana w tabeli messages                   │
│ ├─ sent_at = NOW()                                         │
│ └─ ID wiadomości wygenerowane (UUID)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 REALTIME (Supabase Realtime)                 │
├─────────────────────────────────────────────────────────────┤
│ Broadcast Event:                                            │
│ ├─ Channel: conversations:{conversation_id}                │
│ ├─ Event: INSERT na tabeli messages                       │
│ └─ Payload: nowa wiadomość                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
```

### 3. ODBIERANIE WIADOMOŚCI (Serwer → Użytkownik B)

```
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND ODBIORCY (React App)                │
├─────────────────────────────────────────────────────────────┤
│ ConversationDetail.tsx:                                     │
│ ├─ useEffect() - nasłuchuje na kanale Realtime            │
│ ├─ supabase.channel(`conversations:${conversationId}`)     │
│ └─ .on('postgres_changes', { event: 'INSERT' }, ...)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              ODBIERANIE WIADOMOŚCI (messages.ts)             │
├─────────────────────────────────────────────────────────────┤
│ handleRealtimeMessage():                                    │
│ ├─ Otrzymuje payload z nową wiadomością                   │
│ ├─ Dodaje wiadomość do lokalnego stanu                    │
│ └─ Wywołuje fetchMessageWithDetails()                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 DESZYFROWANIE (crypto.ts)                    │
├─────────────────────────────────────────────────────────────┤
│ decryptMessage():                                           │
│ ├─ Pobiera klucz prywatny użytkownika                     │
│ ├─ Importuje klucz (RSA-OAEP)                             │
│ ├─ crypto.subtle.decrypt() - deszyfruje wiadomość         │
│ └─ Zwraca odszyfrowaną treść                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 WYŚWIETLANIE (MessageBubble.tsx)             │
├─────────────────────────────────────────────────────────────┤
│ Renderowanie wiadomości:                                    │
│ ├─ Sprawdza czy wiadomość własna czy odbiorcy             │
│ ├─ Wyświetla avatar nadawcy                               │
│ ├─ Pokazuje odszyfrowaną treść                            │
│ ├─ Wyświetla czas wysłania                                │
│ └─ Pokazuje status dostarczenia                           │
└─────────────────────────────────────────────────────────────┘
```

### 4. POTWIERDZENIA I STATUSY

```
┌─────────────────────────────────────────────────────────────┐
│                  STATUS WIADOMOŚCI                           │
├─────────────────────────────────────────────────────────────┤
│ 1. "sent" - wiadomość zapisana w bazie                     │
│ 2. "delivered" - wiadomość dostarczona do odbiorcy         │
│ 3. "read" - wiadomość przeczytana                          │
│                                                             │
│ Tabela: message_status                                     │
│ ├─ message_id (FK → messages)                              │
│ ├─ user_id (FK → users)                                    │
│ ├─ status (ENUM)                                           │
│ └─ timestamp                                                │
└─────────────────────────────────────────────────────────────┘
```

### 5. BEZPIECZEŃSTWO I KONTROLA DOSTĘPU

```
┌─────────────────────────────────────────────────────────────┐
│                    WARSTWY BEZPIECZEŃSTWA                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Autentykacja (Supabase Auth):                           │
│    └─ JWT token weryfikuje tożsamość użytkownika          │
│                                                             │
│ 2. RLS Policies:                                           │
│    ├─ Tylko uczestnicy konwersacji mogą wysyłać          │
│    └─ Tylko uczestnicy mogą odbierać wiadomości          │
│                                                             │
│ 3. Szyfrowanie End-to-End:                                 │
│    ├─ RSA-2048 dla kluczy                                 │
│    └─ Tylko odbiorca może odszyfrować                     │
│                                                             │
│ 4. Conversation Passwords (opcjonalne):                    │
│    └─ Dodatkowa warstwa ochrony dla grup                  │
└─────────────────────────────────────────────────────────────┘
```

### 6. OBSŁUGA BŁĘDÓW

```
┌─────────────────────────────────────────────────────────────┐
│                      OBSŁUGA BŁĘDÓW                          │
├─────────────────────────────────────────────────────────────┤
│ Możliwe błędy:                                              │
│ ├─ Brak uprawnień (RLS policy violation)                  │
│ ├─ Błąd szyfrowania (nieprawidłowy klucz)                 │
│ ├─ Błąd sieci (brak połączenia)                           │
│ ├─ Błąd Realtime (utrata połączenia WebSocket)            │
│ └─ Błąd deszyfrowania (uszkodzone dane)                   │
│                                                             │
│ Mechanizmy obsługi:                                         │
│ ├─ Try/catch bloki w każdej funkcji                       │
│ ├─ Retry logic dla operacji sieciowych                    │
│ ├─ Fallback na polling przy błędzie Realtime              │
│ └─ User-friendly komunikaty błędów                        │
└─────────────────────────────────────────────────────────────┘
```

## PODSUMOWANIE PRZEPŁYWU

1. **Użytkownik A** pisze i wysyła wiadomość
2. **Frontend** szyfruje wiadomość kluczem publicznym odbiorcy
3. **Supabase** zapisuje zaszyfrowaną wiadomość (RLS sprawdza uprawnienia)
4. **Realtime** emituje event o nowej wiadomości
5. **Użytkownik B** otrzymuje powiadomienie przez WebSocket
6. **Frontend odbiorcy** deszyfruje wiadomość kluczem prywatnym
7. **Wiadomość** jest wyświetlana w interfejsie

### Kluczowe pliki:
- `src/components/ChatInput.tsx` - wprowadzanie wiadomości
- `src/lib/crypto.ts` - szyfrowanie/deszyfrowanie
- `src/lib/messages.ts` - operacje na wiadomościach
- `src/components/ConversationDetail.tsx` - odbieranie realtime
- `src/components/MessageBubble.tsx` - wyświetlanie
- `src/database/fix-policies.sql` - polityki RLS
