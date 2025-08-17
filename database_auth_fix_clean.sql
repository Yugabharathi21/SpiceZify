-- ============================================================================
-- SpiceZify Database Fix - Allow Sample User Access (CORRECTED)
-- ============================================================================
-- Run this to temporarily allow the sample user to access preferences
-- This fixes the 401 errors you're seeing

BEGIN;

-- Fix: Use proper UUID casting and comparison
-- The sample user ID needs to be cast as UUID properly

DROP POLICY IF EXISTS preferences_owner_policy ON public.preferences;
CREATE POLICY preferences_owner_policy
  ON public.preferences
  FOR ALL
  USING (
    user_id::TEXT = auth.uid()::TEXT 
    OR user_id::TEXT = '00000000-0000-0000-0000-000000000001'::TEXT  -- Allow sample user
  )
  WITH CHECK (
    user_id::TEXT = auth.uid()::TEXT 
    OR user_id::TEXT = '00000000-0000-0000-0000-000000000001'::TEXT  -- Allow sample user
  );

-- Also update profiles policy to allow sample user
DROP POLICY IF EXISTS profiles_owner_mutation ON public.profiles;
CREATE POLICY profiles_owner_mutation
  ON public.profiles
  FOR ALL
  USING (
    user_id::TEXT = auth.uid()::TEXT 
    OR user_id::TEXT = '00000000-0000-0000-0000-000000000001'::TEXT  -- Allow sample user
  )
  WITH CHECK (
    user_id::TEXT = auth.uid()::TEXT 
    OR user_id::TEXT = '00000000-0000-0000-0000-000000000001'::TEXT  -- Allow sample user
  );

COMMIT;

-- ============================================================================
-- Better Solution: Create Test User Account via Supabase Dashboard
-- ============================================================================
-- If you prefer to create a real Supabase user account for testing:
--
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Authentication > Users  
-- 3. Click "Add User"
-- 4. Enter:
--    - Email: test@spicezify.com
--    - Password: testpassword123
--    - Email Confirm: Yes
-- 5. The app will then work with real authentication!
-- ============================================================================
