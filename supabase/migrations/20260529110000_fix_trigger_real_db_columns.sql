-- =====================================================================
-- CRITICAL FIX: handle_new_user trigger to match REAL database schema
--
-- The remote Supabase database uses different column names than the
-- local migrations assumed:
--   - profiles.id   = auth.users.id (NOT a separate user_id column)
--   - profiles.name (NOT nome)
--   - profiles.role (NOT cargo)
--   - profiles.clinic_id (NOT clinica_id)
--   - profiles.avatar_url EXISTS
--   - profiles.telefone EXISTS
--   - profiles.status EXISTS
--   - profiles.must_change_password EXISTS
--
-- This migration fixes the trigger to insert with the correct columns
-- and also ensures the profiles table has all necessary columns.
-- =====================================================================

-- Step 1: Ensure all columns exist with correct names
-- (safe to run even if columns already exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'terapeuta';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinicas(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Step 2: Backfill name from nome if name is null (handles existing rows)
UPDATE public.profiles SET name = nome WHERE name IS NULL AND nome IS NOT NULL;

-- Step 3: Fix the profiles primary key constraint
-- profiles.id should equal auth.users.id directly (no separate user_id needed)
-- If there is a unique constraint on user_id, we need to allow the trigger to insert by id

-- Step 4: Recreate handle_new_user with real column names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, telefone, status, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'nome',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    'pendente',
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user() failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Step 5: Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Ensure permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- Step 7: Update get_user_clinica_id helper to use real column names
CREATE OR REPLACE FUNCTION public.get_user_clinica_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$;

-- Step 8: Helper to check if user is admin (using real column names)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$;
