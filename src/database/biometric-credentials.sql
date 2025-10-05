-- Create biometric_credentials table for WebAuthn credential storage
CREATE TABLE IF NOT EXISTS public.biometric_credentials (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  name text DEFAULT 'Biometric Login',
  type text DEFAULT 'fingerprint' CHECK (type = ANY (ARRAY['fingerprint'::text, 'faceId'::text, 'touchId'::text])),
  created_at timestamp with time zone DEFAULT now(),
  last_used timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT biometric_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT biometric_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS biometric_credentials_user_id_idx ON public.biometric_credentials(user_id);
CREATE INDEX IF NOT EXISTS biometric_credentials_credential_id_idx ON public.biometric_credentials(credential_id);
CREATE INDEX IF NOT EXISTS biometric_credentials_active_idx ON public.biometric_credentials(is_active);

-- Enable Row Level Security
ALTER TABLE public.biometric_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own biometric credentials" ON public.biometric_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biometric credentials" ON public.biometric_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biometric credentials" ON public.biometric_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biometric credentials" ON public.biometric_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_credentials TO authenticated;
GRANT USAGE ON SEQUENCE public.biometric_credentials_id_seq TO authenticated;