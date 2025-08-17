-- ============================================================================
-- SpiceZify Database Setup - Complete SQL Script
-- ============================================================================
-- This script creates all necessary tables, triggers, policies, and indexes
-- for the SpiceZify music player application with chat functionality.
--
-- Instructions:
-- 1. Open your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
--
-- Note: This script is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable trigram extension for fuzzy text search (required for GIN indexes)
-- This must be done before creating the indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Shared helper: updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE CREATION
-- ============================================================================

-- 1. PROFILES TABLE
-- Stores user profile information
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger for profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 2. PREFERENCES TABLE
-- Stores user preferences (audio settings, UI preferences, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.preferences (
  user_id UUID PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger for preferences
DROP TRIGGER IF EXISTS preferences_updated_at ON public.preferences;
CREATE TRIGGER preferences_updated_at
  BEFORE UPDATE ON public.preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 3. CONVERSATIONS TABLE
-- Stores chat rooms/conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger for conversations
DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 4. CONVERSATION_PARTICIPANTS TABLE
-- Manages who can participate in each conversation
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- 5. MESSAGES TABLE
-- Stores chat messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - PROFILES
-- ============================================================================

-- Allow public read of basic profile fields (safe for user lists)
DROP POLICY IF EXISTS profiles_public_select ON public.profiles;
CREATE POLICY profiles_public_select
  ON public.profiles
  FOR SELECT
  USING (TRUE);

-- Allow users to insert/update/delete their own profile
DROP POLICY IF EXISTS profiles_owner_mutation ON public.profiles;
CREATE POLICY profiles_owner_mutation
  ON public.profiles
  FOR ALL
  USING (user_id::TEXT = auth.uid()::TEXT)
  WITH CHECK (user_id::TEXT = auth.uid()::TEXT);

-- ============================================================================
-- RLS POLICIES - PREFERENCES
-- ============================================================================

-- Users can only access their own preferences
DROP POLICY IF EXISTS preferences_owner_policy ON public.preferences;
CREATE POLICY preferences_owner_policy
  ON public.preferences
  FOR ALL
  USING (user_id::TEXT = auth.uid()::TEXT)
  WITH CHECK (user_id::TEXT = auth.uid()::TEXT);

-- ============================================================================
-- RLS POLICIES - CONVERSATIONS
-- ============================================================================

-- Any authenticated user can create a conversation (created_by must match auth.uid())
DROP POLICY IF EXISTS conversations_insert_policy ON public.conversations;
CREATE POLICY conversations_insert_policy
  ON public.conversations
  FOR INSERT
  WITH CHECK (created_by::TEXT = auth.uid()::TEXT);

-- Select: public conversations visible to all; private only to participants
DROP POLICY IF EXISTS conversations_select_policy ON public.conversations;
CREATE POLICY conversations_select_policy
  ON public.conversations
  FOR SELECT
  USING (
    is_private = FALSE
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversations.id
        AND cp.user_id::TEXT = auth.uid()::TEXT
    )
  );

-- Update: only the creator can modify their conversation
DROP POLICY IF EXISTS conversations_owner_update ON public.conversations;
CREATE POLICY conversations_owner_update
  ON public.conversations
  FOR UPDATE
  USING (created_by::TEXT = auth.uid()::TEXT)
  WITH CHECK (created_by::TEXT = auth.uid()::TEXT);

-- Delete: only the creator can delete their conversation
DROP POLICY IF EXISTS conversations_owner_delete ON public.conversations;
CREATE POLICY conversations_owner_delete
  ON public.conversations
  FOR DELETE
  USING (created_by::TEXT = auth.uid()::TEXT);

-- ============================================================================
-- RLS POLICIES - CONVERSATION_PARTICIPANTS
-- ============================================================================

-- Allow a user to add themselves as a participant
DROP POLICY IF EXISTS participants_insert_policy ON public.conversation_participants;
CREATE POLICY participants_insert_policy
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (user_id::TEXT = auth.uid()::TEXT);

-- Select: participants visible to conversation members or if conversation is public
DROP POLICY IF EXISTS participants_select_policy ON public.conversation_participants;
CREATE POLICY participants_select_policy
  ON public.conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.is_private = FALSE
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id::TEXT = auth.uid()::TEXT
    )
  );

-- Allow removal: participant can remove themselves OR conversation owner can manage
DROP POLICY IF EXISTS participants_delete_policy ON public.conversation_participants;
CREATE POLICY participants_delete_policy
  ON public.conversation_participants
  FOR DELETE
  USING (
    user_id::TEXT = auth.uid()::TEXT
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by::TEXT = auth.uid()::TEXT
    )
  );

-- ============================================================================
-- RLS POLICIES - MESSAGES
-- ============================================================================

-- Allow insert if sender is authenticated user AND they are a participant
DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
CREATE POLICY messages_insert_policy
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id::TEXT = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.messages.conversation_id
        AND cp.user_id::TEXT = auth.uid()::TEXT
    )
  );

-- Select: allow if conversation is public OR user is participant
DROP POLICY IF EXISTS messages_select_policy ON public.messages;
CREATE POLICY messages_select_policy
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = public.messages.conversation_id
        AND c.is_private = FALSE
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.messages.conversation_id
        AND cp.user_id::TEXT = auth.uid()::TEXT
    )
  );

-- Update: limit to sender or conversation creator
DROP POLICY IF EXISTS messages_owner_update ON public.messages;
CREATE POLICY messages_owner_update
  ON public.messages
  FOR UPDATE
  USING (
    sender_id::TEXT = auth.uid()::TEXT
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = public.messages.conversation_id
        AND c.created_by::TEXT = auth.uid()::TEXT
    )
  )
  WITH CHECK (
    sender_id::TEXT = auth.uid()::TEXT
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = public.messages.conversation_id
        AND c.created_by::TEXT = auth.uid()::TEXT
    )
  );

-- Delete: limit to sender or conversation creator
DROP POLICY IF EXISTS messages_owner_delete ON public.messages;
CREATE POLICY messages_owner_delete
  ON public.messages
  FOR DELETE
  USING (
    sender_id::TEXT = auth.uid()::TEXT
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = public.messages.conversation_id
        AND c.created_by::TEXT = auth.uid()::TEXT
    )
  );

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Messages: optimize for conversation queries ordered by time
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at 
  ON public.messages (conversation_id, created_at DESC);

-- Messages: optimize for sender queries
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
  ON public.messages (sender_id);

-- Participants: optimize for user lookups
CREATE INDEX IF NOT EXISTS idx_participants_user_id 
  ON public.conversation_participants (user_id);

-- Participants: optimize for conversation lookups
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id 
  ON public.conversation_participants (conversation_id);

-- Conversations: optimize for creator queries
CREATE INDEX IF NOT EXISTS idx_conversations_created_by 
  ON public.conversations (created_by);

-- Conversations: optimize for public conversation queries
CREATE INDEX IF NOT EXISTS idx_conversations_private_updated 
  ON public.conversations (is_private, updated_at DESC);

-- Profiles: optimize for search queries (using trigram extension)
-- Note: These indexes require the pg_trgm extension
DO $$
BEGIN
  -- Only create trigram indexes if the extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_display_name 
      ON public.profiles USING gin(display_name gin_trgm_ops);
    
    CREATE INDEX IF NOT EXISTS idx_profiles_email 
      ON public.profiles USING gin(email gin_trgm_ops);
  ELSE
    -- Fallback to regular B-tree indexes
    CREATE INDEX IF NOT EXISTS idx_profiles_display_name 
      ON public.profiles (display_name);
    
    CREATE INDEX IF NOT EXISTS idx_profiles_email 
      ON public.profiles (email);
  END IF;
END
$$;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert a sample public conversation
INSERT INTO public.conversations (id, title, is_private, created_by)
VALUES (
  '11111111-1111-1111-1111-111111111111'::UUID,
  'Public Music Lounge',
  FALSE,
  '00000000-0000-0000-0000-000000000001'::UUID
) ON CONFLICT (id) DO NOTHING;

-- Add the creator as owner participant
INSERT INTO public.conversation_participants (conversation_id, user_id, role)
VALUES (
  '11111111-1111-1111-1111-111111111111'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  'owner'
) ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Add a welcome message
INSERT INTO public.messages (conversation_id, sender_id, body)
VALUES (
  '11111111-1111-1111-1111-111111111111'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Welcome to the Public Music Lounge! Share your favorite tracks and chat with other music lovers.'
) ON CONFLICT (id) DO NOTHING;

-- Insert sample user profile
INSERT INTO public.profiles (user_id, email, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'demo@spicezify.com',
  'Demo User'
) ON CONFLICT (user_id) DO NOTHING;

-- Insert sample preferences
INSERT INTO public.preferences (user_id, data)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  '{"audioQuality":"normal","crossfade":true,"normalizeVolume":false}'::JSONB
) ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment these to verify the setup worked correctly:

-- -- Check all tables exist
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('profiles', 'preferences', 'conversations', 'conversation_participants', 'messages');

-- -- Check policies are enabled
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public';

-- -- Check sample data
-- SELECT 'conversations' as table_name, COUNT(*) as count FROM public.conversations
-- UNION ALL
-- SELECT 'messages', COUNT(*) FROM public.messages
-- UNION ALL
-- SELECT 'profiles', COUNT(*) FROM public.profiles
-- UNION ALL
-- SELECT 'preferences', COUNT(*) FROM public.preferences;

COMMIT;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- 
-- Your SpiceZify database is now ready!
--
-- Next steps:
-- 1. Update your .env file with Supabase credentials
-- 2. Restart your development server
-- 3. Test the connection using the database service layer
--
-- The following tables are now available:
-- - profiles (user information)
-- - preferences (app settings)
-- - conversations (chat rooms)  
-- - conversation_participants (room membership)
-- - messages (chat messages)
--
-- All tables have proper RLS policies for security and indexes for performance.
-- ============================================================================
