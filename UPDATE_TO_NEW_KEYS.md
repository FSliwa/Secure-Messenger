# Aktualizacja aplikacji do nowych kluczy Supabase

## Jeśli nie możesz znaleźć kluczy JWT, możemy zaktualizować aplikację:

### 1. Zaktualizuj plik `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

// Użyj nowych kluczy
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fyxmppbrealxwnstuzuk.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_Jau8JdiOFfVKQOM1svLxMQ_9-sBqnKc'

// Dla funkcji które wymagają service_role, użyj secret key
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY || 'sb_secret_ek5NhQ2-BVZd-7yHw3RYhw_-sx2qOse'

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Publiczny klient (dla frontendu)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Admin klient (tylko dla funkcji backendowych)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  }
})

export type SupabaseClient = typeof supabase
```

### 2. Zaktualizuj `.env.production` na serwerze:

```bash
# Nowe zmienne środowiskowe
VITE_SUPABASE_URL=https://fyxmppbrealxwnstuzuk.supabase.co
VITE_SUPABASE_KEY=sb_publishable_Jau8JdiOFfVKQOM1svLxMQ_9-sBqnKc
SUPABASE_SERVICE_KEY=sb_secret_ek5NhQ2-BVZd-7yHw3RYhw_-sx2qOse
```

### 3. Zaktualizuj wszystkie pliki które używają `VITE_SUPABASE_ANON_KEY`:

Znajdź i zamień:
- `VITE_SUPABASE_ANON_KEY` → `VITE_SUPABASE_KEY`
- `supabaseAnonKey` → `supabaseKey`

### 4. Przebuduj aplikację:

```bash
npm run build
```

### 5. Wdróż na serwer:

```bash
cd /opt/Secure-Messenger
git pull
docker-compose -f deployment/docker/docker-compose.production.yml build --no-cache
docker-compose -f deployment/docker/docker-compose.production.yml up -d
```

## UWAGA:
To rozwiązanie może wymagać dodatkowych zmian w kodzie jeśli są miejsca które zakładają format JWT.
