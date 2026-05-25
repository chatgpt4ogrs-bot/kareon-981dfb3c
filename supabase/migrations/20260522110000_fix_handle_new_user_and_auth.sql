-- =====================================================================
-- FIX: handle_new_user trigger + profiles INSERT policy
-- 
-- ROOT CAUSE: In Supabase Cloud, SECURITY DEFINER triggers on auth.users
-- run in the supabase_auth_admin context. Even though the function is
-- SECURITY DEFINER owned by postgres, RLS can still block the INSERT
-- into profiles unless row_security is explicitly disabled.
--
-- ALSO: No ON CONFLICT clause means duplicate attempts crash the trigger.
-- =====================================================================

-- Step 1: Ensure columns exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS telefone text;

-- Step 2: Ensure the status column has a proper DEFAULT (idempotent)
ALTER TABLE public.profiles
  ALTER COLUMN status SET DEFAULT 'pendente';

-- Step 3: Recreate handle_new_user with:
--   - SET row_security TO 'off'  → bypasses RLS regardless of call context
--   - ON CONFLICT (user_id) DO NOTHING → idempotent, won't crash on retry
--   - EXCEPTION handler → prevents trigger from blocking auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, telefone, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    'pendente'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block user creation
  RAISE WARNING 'handle_new_user() failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Step 4: Ensure the trigger exists and is correctly wired
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Grant postgres (function owner/superuser) explicit access
-- This is a no-op for superusers but ensures no role stripping occurred
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
