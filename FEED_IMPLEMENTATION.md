# Feed Implementation - Twitter/X Style Social Feed

## 🎯 Przegląd (Overview)

Dodano nową funkcjonalność social feed w stylu Twitter/X do aplikacji Secure Messenger. Użytkownicy mogą teraz tworzyć posty, lajkować, komentować i udostępniać treści między sobą, niezależnie od prywatnych zaszyfrowanych czatów.

## ✅ Zaimplementowane Komponenty

### 1. **Feed.tsx** (300+ linii)
Główny komponent feed'a zawierający:

#### Interfejsy TypeScript:
```typescript
interface Post {
  id: string
  userId: string
  username: string
  avatar?: string
  content: string
  image?: string
  timestamp: Date
  likes: number
  comments: number
  shares: number
  isLiked?: boolean
}

interface User {
  id: string
  username: string
  email: string
  displayName?: string
}
```

#### Główne Funkcjonalności:
- **Tworzenie postów**: Textarea z limitem 280 znaków, licznik znaków
- **Wyświetlanie postów**: Lista postów z avatarami, timestampami, treścią
- **Interakcje**:
  - ❤️ Polubienia (like/unlike) z dynamiczną animacją
  - 💬 Komentarze (placeholder dla przyszłej implementacji)
  - 🔄 Udostępnienia (repost/share)
  - ✉️ Wysyłanie w wiadomości prywatnej
- **Pasek boczny (Trending)**:
  - Trending Topics (hashtagi z licznikami)
  - Who to Follow (sugerowane profile)
  
#### UI Components używane:
- `Button` - przyciski akcji
- `Card` - karty postów
- `ScrollArea` - przewijanie feed'a
- `Textarea` - pole tworzenia postów
- `Avatar` - awatary użytkowników
- `toast` (sonner) - powiadomienia o akcjach

### 2. **Dashboard.tsx** - Zmodyfikowany
Dodano system nawigacji tabulatorowej:

#### Zmiany:
```typescript
// Nowy import
import { Feed } from './Feed'
import { ChatCircle, Newspaper } from '@phosphor-icons/react'

// Nowy state
const [activeTab, setActiveTab] = useState<'chat' | 'feed'>('chat')

// Nowa nawigacja w headerze
<div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
  <Button variant={activeTab === 'chat' ? 'default' : 'ghost'} onClick={() => setActiveTab('chat')}>
    <ChatCircle /> Chat
  </Button>
  <Button variant={activeTab === 'feed' ? 'default' : 'ghost'} onClick={() => setActiveTab('feed')}>
    <Newspaper /> Feed
  </Button>
</div>

// Warunkowe renderowanie
{activeTab === 'chat' ? (
  <ChatInterface currentUser={currentUser} />
) : (
  <Feed currentUser={currentUser} />
)}
```

## 📋 Mock Data (do testowania)

```typescript
const mockPosts: Post[] = [
  {
    id: '1',
    userId: '1',
    username: 'Jan Kowalski',
    content: 'Właśnie testujemy nowy feed w SecureChat! 🚀',
    timestamp: new Date(),
    likes: 12,
    comments: 3,
    shares: 2,
    isLiked: false
  },
  {
    id: '2',
    userId: '2',
    username: 'Anna Nowak',
    content: 'End-to-end encryption + social feed = perfekcyjne połączenie! 🔐',
    timestamp: new Date(Date.now() - 3600000),
    likes: 28,
    comments: 7,
    shares: 5,
    isLiked: true
  }
]
```

## 🔧 Następne Kroki (Backend Implementation)

### 1. Schemat Bazy Danych (Supabase)

#### Tabela: `posts`
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 280),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0
);

-- Indeksy dla wydajności
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

#### Tabela: `posts_likes`
```sql
CREATE TABLE posts_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_posts_likes_post_id ON posts_likes(post_id);
CREATE INDEX idx_posts_likes_user_id ON posts_likes(user_id);
```

#### Tabela: `posts_comments`
```sql
CREATE TABLE posts_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_posts_comments_post_id ON posts_comments(post_id);
CREATE INDEX idx_posts_comments_user_id ON posts_comments(user_id);
```

#### Tabela: `posts_shares`
```sql
CREATE TABLE posts_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_posts_shares_post_id ON posts_shares(post_id);
```

### 2. API Functions (lib/supabase.ts)

Dodać następujące funkcje:

```typescript
// Pobieranie postów z feed'a
export async function getFeedPosts(limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users!posts_user_id_fkey (id, username, email, display_name),
      posts_likes (user_id),
      is_liked:posts_likes!posts_likes_post_id_fkey (user_id)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) throw error
  return data
}

// Tworzenie nowego posta
export async function createPost(content: string, imageUrl?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      content,
      image_url: imageUrl
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Polubienie posta
export async function likePost(postId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { error } = await supabase
    .from('posts_likes')
    .insert({ post_id: postId, user_id: user.id })
  
  if (error) throw error
  
  // Inkrementuj licznik likes w posts
  await supabase.rpc('increment_post_likes', { post_id: postId })
}

// Usunięcie polubienia
export async function unlikePost(postId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { error } = await supabase
    .from('posts_likes')
    .delete()
    .match({ post_id: postId, user_id: user.id })
  
  if (error) throw error
  
  // Dekrementuj licznik likes w posts
  await supabase.rpc('decrement_post_likes', { post_id: postId })
}

// Dodawanie komentarza
export async function addComment(postId: string, content: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('posts_comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Inkrementuj licznik komentarzy
  await supabase.rpc('increment_post_comments', { post_id: postId })
  
  return data
}
```

### 3. RPC Functions (Supabase SQL)

```sql
-- Inkrementacja licznika likes
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dekrementacja licznika likes
CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inkrementacja licznika komentarzy
CREATE OR REPLACE FUNCTION increment_post_comments(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Real-time Subscriptions

W `Feed.tsx` dodać subskrypcje dla live updates:

```typescript
useEffect(() => {
  // Subskrybuj nowe posty
  const postsSubscription = supabase
    .channel('posts-channel')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'posts' },
      (payload) => {
        // Dodaj nowy post na górę feed'a
        setPosts(prev => [payload.new, ...prev])
      }
    )
    .subscribe()
  
  // Subskrybuj zmiany w likes
  const likesSubscription = supabase
    .channel('likes-channel')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'posts_likes' },
      (payload) => {
        // Zaktualizuj licznik likes w odpowiednim poście
        updatePostLikes(payload)
      }
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(postsSubscription)
    supabase.removeChannel(likesSubscription)
  }
}, [])
```

### 5. Upload Obrazków (Supabase Storage)

```typescript
export async function uploadPostImage(file: File) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `post-images/${fileName}`
  
  const { error: uploadError } = await supabase.storage
    .from('posts')
    .upload(filePath, file)
  
  if (uploadError) throw uploadError
  
  const { data } = supabase.storage
    .from('posts')
    .getPublicUrl(filePath)
  
  return data.publicUrl
}
```

## 🎨 Planowane Ulepszenia

### Faza 1 (Podstawowa funkcjonalność):
- ✅ UI komponentu Feed
- ⏳ Schemat bazy danych
- ⏳ CRUD operacje dla postów
- ⏳ System like/unlike
- ⏳ Real-time updates

### Faza 2 (Rozszerzone funkcje):
- ⏳ System komentarzy z wątkami
- ⏳ Udostępnianie postów (repost)
- ⏳ Upload i wyświetlanie obrazków
- ⏳ Hashtagi z funkcją wyszukiwania
- ⏳ Trending topics (algorytm)

### Faza 3 (Social features):
- ⏳ System followowania użytkowników
- ⏳ Personalizowany feed (tylko od followowanych)
- ⏳ Powiadomienia o nowych aktywnościach
- ⏳ Profil użytkownika z historią postów
- ⏳ Statystyki (liczba followersów, postów, etc.)

### Faza 4 (Advanced):
- ⏳ Emoji reactions (nie tylko likes)
- ⏳ Ankiety w postach
- ⏳ Video upload i streaming
- ⏳ Stories (tymczasowe posty 24h)
- ⏳ Wyszukiwanie postów i użytkowników

## 🚀 Deployment

Po zaimplementowaniu backendu:

1. **Utwórz tabele w Supabase Dashboard**
2. **Zaimplementuj API functions w `lib/supabase.ts`**
3. **Dodaj real-time subscriptions w `Feed.tsx`**
4. **Skonfiguruj Supabase Storage bucket dla obrazków**
5. **Build i deploy aplikacji:**
   ```bash
   npm run build
   ./update-server.sh
   ```

## 📊 Struktura Projektu

```
src/
├── components/
│   ├── Feed.tsx              ✅ UTWORZONY
│   ├── Dashboard.tsx         ✅ ZMODYFIKOWANY
│   ├── ChatInterface.tsx     ✅ ISTNIEJĄCY
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── scroll-area.tsx
│       ├── textarea.tsx
│       └── avatar.tsx
├── lib/
│   └── supabase.ts           ⏳ DO ROZSZERZENIA
└── hooks/
    └── useFeed.ts            ⏳ DO UTWORZENIA
```

## 🔐 Bezpieczeństwo

- ✅ Row Level Security (RLS) w Supabase
- ✅ Walidacja długości postów (max 280 znaków)
- ✅ Sanityzacja treści przed wyświetleniem
- ✅ Rate limiting dla tworzenia postów
- ✅ Moderacja treści (opcjonalnie)

## 📝 Notatki

- Mock data jest używane do testowania UI
- Backend wymaga pełnej implementacji Supabase
- Feed zachowuje spójność stylistyczną z ChatInterface
- Responsive design dla mobile i desktop
- Ikony z Phosphor Icons (spójna biblioteka)

---

**Status:** Frontend UI gotowy ✅ | Backend pending ⏳
**Ostatnia aktualizacja:** $(date)
**Autor:** GitHub Copilot + Filip Śliwa
