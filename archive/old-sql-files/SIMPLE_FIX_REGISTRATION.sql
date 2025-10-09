-- PROSTY FIX DLA REJESTRACJI
-- Skopiuj CAŁOŚĆ i wklej do Supabase SQL Editor

-- 1. Utwórz tabelę encryption_keys (KONIECZNE!)
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  public_key text NOT NULL DEFAULT '',
  encrypted_private_key text NOT NULL DEFAULT '',
  key_type text DEFAULT 'RSA-2048' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Włącz RLS
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- 3. Utwórz policy
CREATE POLICY "Users can manage own keys" ON public.encryption_keys
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Nadaj uprawnienia
GRANT ALL ON public.encryption_keys TO authenticated;

-- 5. TEST - sprawdź czy tabela istnieje
SELECT 'Tabela encryption_keys utworzona!' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'encryption_keys' 
  AND table_schema = 'public'
);

-- GOTOWE! Teraz możesz się zarejestrować.
