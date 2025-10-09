-- ============================================================================
-- ALTER LOGIN_SESSIONS - DODAJ KOLUMNY DLA DEVICE TRACKING
-- ============================================================================
-- Data: 9 października 2025
-- Cel: Dodanie brakujących kolumn dla device tracking
-- ============================================================================

-- Sprawdź jakie kolumny już istnieją
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'login_sessions'
ORDER BY column_name;

-- Dodaj brakujące kolumny (jeśli nie istnieją)
ALTER TABLE public.login_sessions 
ADD COLUMN IF NOT EXISTS device_model TEXT,
ADD COLUMN IF NOT EXISTS viewport_size TEXT,
ADD COLUMN IF NOT EXISTS pixel_ratio NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS orientation TEXT,
ADD COLUMN IF NOT EXISTS aspect_ratio NUMERIC,
ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_tablet BOOLEAN DEFAULT FALSE;

-- Dodaj index dla szybkich queries po device type
CREATE INDEX IF NOT EXISTS idx_login_sessions_device 
ON public.login_sessions(device_type, is_mobile, is_tablet);

-- Dodaj index dla queries po user_id i is_active
CREATE INDEX IF NOT EXISTS idx_login_sessions_user_active 
ON public.login_sessions(user_id, is_active);

-- Update statistics
ANALYZE public.login_sessions;

-- ============================================================================
-- WERYFIKACJA
-- ============================================================================

-- Sprawdź czy kolumny zostały dodane
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'login_sessions'
AND column_name IN (
  'device_model', 'viewport_size', 'pixel_ratio', 
  'orientation', 'aspect_ratio', 'is_mobile', 'is_tablet'
)
ORDER BY column_name;

-- Sprawdź indeksy
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'login_sessions'
AND indexname LIKE 'idx_login_sessions_%'
ORDER BY indexname;

-- ============================================================================
-- OCZEKIWANY WYNIK
-- ============================================================================

/*
KOLUMNY (7):
✅ aspect_ratio | numeric
✅ device_model | text
✅ is_mobile | boolean
✅ is_tablet | boolean
✅ orientation | text
✅ pixel_ratio | numeric
✅ viewport_size | text

INDEKSY (2):
✅ idx_login_sessions_device
✅ idx_login_sessions_user_active
*/

-- ============================================================================
-- KONIEC
-- ============================================================================

SELECT 
  '✅ LOGIN_SESSIONS TABLE UPDATED' as status,
  'Device tracking columns added successfully' as details;

