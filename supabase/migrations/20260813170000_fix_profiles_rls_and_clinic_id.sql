-- Fix RLS policies and clinic_id scoping on public.profiles

-- Ensure public.profiles table has Row Level Security enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies that referenced nonexistent columns (user_id, clinica_id)
DROP POLICY IF EXISTS "Admin master updates any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin master views all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Clinica admin updates clinic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view clinic profiles" ON public.profiles;

-- 1. SELECT Policy: Admin Master views all; users view profiles in their clinic or own profile
CREATE POLICY "Users view clinic profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR
    (clinic_id IS NOT NULL AND clinic_id = (SELECT p.clinic_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1))
    OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 2. UPDATE Policy: Admin Master updates all; Clinica Admin updates own clinic profiles; Users update own profile
CREATE POLICY "Clinica admin updates clinic profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR
    (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'clinica_admin')
      AND clinic_id IS NOT NULL 
      AND clinic_id = (SELECT p.clinic_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1)
    )
  );

-- 3. INSERT Policy: Authenticated users / triggers can insert profile
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'clinica_admin'))
  );

-- Backfill: If any user with role != 'admin' has a NULL clinic_id, assign them to the first available clinic so they are visible to their clinic admin
UPDATE public.profiles
SET clinic_id = (SELECT id FROM public.clinics ORDER BY created_at LIMIT 1)
WHERE clinic_id IS NULL AND role IS NOT NULL AND role <> 'admin';

NOTIFY pgrst, 'reload schema';
