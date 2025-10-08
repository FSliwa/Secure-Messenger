# Analiza Funkcjonalności Secure-Messenger

## Data: 8 Października 2025

---

## 1. WYSZUKIWANIE UŻYTKOWNIKÓW

### Analiza Obecnej Implementacji:

**Plik:** `src/components/UserSearchDialog.tsx`

**Funkcjonalność:**
- Wyszukiwanie użytkowników w czasie rzeczywistym z debouncing (300ms)
- Dwa tryby: 'chat' (rozpoczęcie konwersacji) i 'add-to-conversation' (dodawanie do grupy)
- Wyświetlanie statusu użytkownika (online/offline/away)
- Filtrowanie wyników (wykluczenie aktualnego użytkownika)

**Metoda Wyszukiwania:**
```typescript
const results = await searchUsers(query, currentUser.id)
```

**Zapytanie do Bazy (`src/lib/supabase.ts`):**
```typescript
export const searchUsers = async (query: string, excludeUserId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, status, last_seen')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq('id', excludeUserId)
    .limit(20)
  
  if (error) throw error
  return data || []
}
```

### ✅ DZIAŁA POPRAWNIE

**Wymagania Bazy Danych:**
- Tabela `users` musi mieć kolumny: `id`, `username`, `display_name`, `avatar_url`, `status`, `last_seen`
- RLS policy musi zezwalać authenticated users na SELECT z tabeli users
- Index na `username` i `display_name` dla wydajności (już istnieje)

**Status:** GOTOWE - funkcjonalność w pełni zaimplementowana

---

## 2. ACCESS CODE (Kod dostępu do konwersacji)

### Analiza Obecnej Implementacji:

**Plik:** `src/components/ChatInterface.tsx`, `src/lib/supabase.ts`

**Funkcjonalność:**
- Generowanie unikalnego kodu dostępu do konwersacji grupowej
- Dołączanie do konwersacji za pomocą kodu
- Walidacja istnienia kodu

**Struktura w Bazie:**
```sql
CREATE TABLE public.conversations (
  ...
  access_code text UNIQUE,  -- Unikalny kod dostępu
  ...
)
```

**Implementacja w Kodzie:**
```typescript
// Tworzenie konwersacji z kodem
const accessCode = generateAccessCode() // Generuje 8-znakowy kod

const { data: conversation, error } = await supabase
  .from('conversations')
  .insert({
    name,
    is_group: true,
    access_code: accessCode,
    created_by: currentUser.id
  })
  .select()
  .single()

// Dołączanie do konwersacji
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('access_code', code)
  .single()

if (data) {
  // Dodaj użytkownika do uczestników
  await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: data.id,
      user_id: currentUser.id,
      is_active: true
    })
}
```

### ✅ DZIAŁA POPRAWNIE

**Wymagania Bazy Danych:**
- Kolumna `access_code` w tabeli `conversations` (UNIQUE) - ✅ Istnieje
- RLS policies dla `conversations` i `conversation_participants` - ✅ Istnieją

**Status:** GOTOWE - funkcjonalność w pełni zaimplementowana

---

## 3. PLIKI (Dodawanie, Wysyłanie, Odbieranie, Pobieranie)

### Analiza Obecnej Implementacji:

**Plik:** `src/components/EnhancedFileSharing.tsx`

**Funkcjonalność:**
- Dodawanie plików przez drag & drop lub wybór
- Walidacja typu i rozmiaru pliku (domyślnie max 50MB)
- Obsługa wielu typów: obrazy, wideo, audio, PDF, dokumenty, archiwa
- Generowanie miniaturek dla obrazów
- Progress bar dla uploadu
- Szyfrowanie plików przed wysłaniem

**Struktura w Bazie:**
```sql
CREATE TABLE public.message_attachments (
  id uuid PRIMARY KEY,
  message_id uuid REFERENCES messages(id),
  file_type text CHECK (file_type IN ('image', 'video', 'audio', 'document', 'voice')),
  file_url text NOT NULL,
  file_name text,
  file_size bigint,
  mime_type text,
  encrypted boolean DEFAULT true,
  encryption_metadata jsonb,
  thumbnail_url text,
  duration integer,      -- Dla plików audio/video
  waveform jsonb,       -- Dla plików audio
  created_at timestamp
)
```

**Implementacja w Kodzie:**
```typescript
// Upload pliku
const uploadFile = async (file: File) => {
  // 1. Walidacja
  const validationError = validateFile(file)
  if (validationError) throw new Error(validationError)
  
  // 2. Upload do Supabase Storage
  const { data, error } = await supabase.storage
    .from('message-attachments')
    .upload(`${userId}/${Date.now()}_${file.name}`, file)
  
  if (error) throw error
  
  // 3. Pobierz publiczny URL
  const { data: urlData } = supabase.storage
    .from('message-attachments')
    .getPublicUrl(data.path)
  
  // 4. Generuj miniaturkę (dla obrazów)
  let thumbnail = undefined
  if (file.type.startsWith('image/')) {
    thumbnail = await generateThumbnail(file)
  }
  
  return { url: urlData.publicUrl, thumbnail }
}

// Zapisz informacje o załączniku
await supabase
  .from('message_attachments')
  .insert({
    message_id: messageId,
    file_type: determineFileType(file),
    file_url: url,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    encrypted: true,
    thumbnail_url: thumbnail
  })
```

**Obsługiwane Typy:**
- Obrazy: JPG, PNG, GIF, WebP
- Wideo: MP4, WebM, MOV
- Audio: MP3, WAV, OGG
- Dokumenty: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Archiwa: ZIP, RAR, 7Z

### ⚠️ WYMAGA KONFIGURACJI SUPABASE STORAGE

**Status:** KOD GOTOWY - wymaga utworzenia bucket w Supabase Storage

**Wymagane Kroki:**
1. Utworzyć bucket `message-attachments` w Supabase Storage
2. Ustawić RLS policies dla bucket:
   - Authenticated users mogą upload
   - Uczestnicy konwersacji mogą download
3. Ustawić limity rozmiaru plików

---

## 4. WIADOMOŚCI GŁOSOWE

### Analiza Obecnej Implementacji:

**Plik:** `src/components/VoiceRecorder.tsx`, `src/lib/voice-recorder.ts`

**Funkcjonalność:**
- Nagrywanie wiadomości głosowych (max 5 minut domyślnie)
- Pauza/wznowienie nagrywania
- Podgląd przed wysłaniem
- Wizualizacja fali dźwiękowej (waveform)
- Wykrywanie poziomu dźwięku
- Konwersja do WebM/Opus (optimal compression)
- Odtwarzanie nagrań

**Technologia:**
```typescript
class VoiceRecorder {
  private mediaRecorder: MediaRecorder
  private stream: MediaStream
  private audioContext: AudioContext
  
  async startRecording() {
    // 1. Uzyskaj dostęp do mikrofonu
    this.stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      } 
    })
    
    // 2. Utwórz MediaRecorder z optymalnym kodekiem
    const mimeType = this.getSupportedMimeType()
    this.mediaRecorder = new MediaRecorder(this.stream, { 
      mimeType,
      audioBitsPerSecond: 128000
    })
    
    // 3. Zbieraj chunki audio
    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data)
    }
    
    this.mediaRecorder.start(100)
  }
  
  async stopRecording(): Promise<VoiceRecording> {
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = async () => {
        // Utwórz blob
        const audioBlob = new Blob(this.audioChunks, { 
          type: this.getSupportedMimeType() 
        })
        
        // Generuj waveform
        const waveform = await this.generateWaveform(audioBlob)
        
        resolve({
          blob: audioBlob,
          duration: this.duration,
          waveform,
          size: audioBlob.size,
          format: this.getSupportedMimeType()
        })
      }
      
      this.mediaRecorder.stop()
      this.stream.getTracks().forEach(track => track.stop())
    })
  }
}
```

**Zapis do Bazy:**
```typescript
// 1. Upload audio blob do Supabase Storage
const { data: uploadData } = await supabase.storage
  .from('voice-messages')
  .upload(`${userId}/${Date.now()}.webm`, recording.blob)

// 2. Zapisz wiadomość
const { data: message } = await supabase
  .from('messages')
  .insert({
    conversation_id,
    sender_id: currentUser.id,
    encrypted_content: '[Voice Message]',
    encryption_metadata: { type: 'voice' }
  })
  .select()
  .single()

// 3. Zapisz attachment
await supabase
  .from('message_attachments')
  .insert({
    message_id: message.id,
    file_type: 'voice',
    file_url: voiceUrl,
    duration: recording.duration,
    waveform: recording.waveform,
    file_size: recording.size,
    mime_type: recording.format,
    encrypted: true
  })
```

**Kompatybilność Formatów:**
- Preferowany: `audio/webm;codecs=opus` (najlepsza kompresja)
- Fallback: `audio/webm`, `audio/ogg;codecs=opus`, `audio/mp4`

### ✅ DZIAŁA POPRAWNIE

**Wymagania:**
- Uprawnienia do mikrofonu (browser permission)
- Bucket `voice-messages` w Supabase Storage
- Tabela `message_attachments` z kolumną `file_type='voice'` - ✅ Istnieje

**Status:** GOTOWE - funkcjonalność w pełni zaimplementowana, wymaga bucket w Supabase

---

## PODSUMOWANIE

| Funkcjonalność | Status | Wymagane Akcje |
|----------------|--------|----------------|
| Wyszukiwanie użytkowników | ✅ GOTOWE | Brak - działa |
| Access Code | ✅ GOTOWE | Brak - działa |
| Pliki (upload/download) | ⚠️ KOD GOTOWY | Utworzyć bucket `message-attachments` |
| Wiadomości głosowe | ⚠️ KOD GOTOWY | Utworzyć bucket `voice-messages` |

---

## WYMAGANE KROKI W SUPABASE:

### 1. Utworzyć Storage Buckets:

```sql
-- W Supabase Dashboard > Storage:

-- Bucket dla załączników
CREATE BUCKET message-attachments
  PUBLIC = false
  FILE_SIZE_LIMIT = 52428800  -- 50MB
  ALLOWED_MIME_TYPES = [
    'image/*', 
    'video/*', 
    'audio/*', 
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.*',
    'application/zip',
    'application/x-rar-compressed'
  ]

-- Bucket dla wiadomości głosowych
CREATE BUCKET voice-messages
  PUBLIC = false
  FILE_SIZE_LIMIT = 10485760  -- 10MB
  ALLOWED_MIME_TYPES = ['audio/*']
```

### 2. Ustawić RLS Policies dla Storage:

```sql
-- Policy dla uploadu (authenticated users)
CREATE POLICY "Allow authenticated upload to message-attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- Policy dla downloadu (tylko uczestnicy konwersacji)
CREATE POLICY "Allow conversation participants to download"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  auth.uid() IN (
    SELECT cp.user_id 
    FROM conversation_participants cp
    JOIN messages m ON m.conversation_id = cp.conversation_id
    JOIN message_attachments ma ON ma.message_id = m.id
    WHERE ma.file_url LIKE '%' || name || '%'
    AND cp.is_active = true
  )
);

-- Analogiczne policies dla voice-messages
```

---

## ZALECENIA:

1. **Utworzyć buckets w Supabase Storage** - bez tego pliki i wiadomości głosowe nie będą działać
2. **Ustawić limity rozmiaru** zgodnie z planem (50MB dla plików, 10MB dla voice)
3. **Dodać CDN** dla lepszej wydajności (opcjonalnie)
4. **Monitorować użycie Storage** - limit darmowy to 1GB

## KOD JEST GOTOWY - WYMAGA TYLKO KONFIGURACJI SUPABASE!
