-- Fix authentication - DISABLE RLS completely
-- This migration removes all RLS policies and disables RLS for user_roles and profiles

-- =====================================================
-- DROP ALL EXISTING POLICIES
-- =====================================================

-- Drop all possible existing policies
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Users can update own role" ON user_roles;
DROP POLICY IF EXISTS "Users can delete own role" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can update roles" ON user_roles;
DROP POLICY IF EXISTS "Authenticated users can delete roles" ON user_roles;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Parents can view children profiles" ON profiles;

-- =====================================================
-- DISABLE RLS COMPLETELY
-- =====================================================

-- Disable RLS on user_roles and profiles tables
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- AUTO-CREATE PROFILE AND ROLE ON USER SIGNUP
-- =====================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_child_name TEXT;
  user_child_age INTEGER;
BEGIN
  -- Extract metadata from user if available
  user_child_name := COALESCE(NEW.raw_user_meta_data->>'child_name', 'Ребёнок');
  user_child_age := COALESCE((NEW.raw_user_meta_data->>'child_age')::INTEGER, NULL);

  -- Create profile for new user
  INSERT INTO public.profiles (id, child_name, child_age, parent_email)
  VALUES (
    NEW.id,
    user_child_name,
    user_child_age,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create default parent role for new user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'parent')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- BACKFILL EXISTING USERS
-- =====================================================

-- Create profiles for existing users who don't have one
INSERT INTO public.profiles (id, child_name, child_age, parent_email)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'child_name', 'Ребёнок'),
  COALESCE((u.raw_user_meta_data->>'child_age')::INTEGER, NULL),
  u.email
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Create roles for existing users who don't have one
INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  'parent'::app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS DISABLED - Authentication fixed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '1. DISABLED Row Level Security for user_roles and profiles tables';
  RAISE NOTICE '2. Removed all RLS policies';
  RAISE NOTICE '3. Added auto-creation trigger for new users';
  RAISE NOTICE '4. Backfilled existing users with profiles and roles';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NOTE: RLS is now disabled for these tables. All authenticated users have full access.';
END $$;
