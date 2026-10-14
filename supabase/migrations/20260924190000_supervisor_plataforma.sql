-- =====================================================================
-- Supervisor de Plataforma (acesso superior às clínicas)
-- - Vê todas as clínicas e todos os usuários/dados
-- - Invisível para qualquer um que não seja Admin Master
-- - Só Admin Master cria/gerencia esse acesso (UI em Clínicas)
-- =====================================================================

-- 1) Role permitida em profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (
    role IS NULL
    OR role IN (
      'admin',
      'clinica_admin',
      'responsavel_clinica',
      'terapeuta',
      'familiar',
      'therapist',
      'supervisor_plataforma'
    )
  );

-- Enum app_role (usado por private.has_role) — ignora se já existir
DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor_plataforma';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- 2) Helpers
CREATE OR REPLACE FUNCTION private.is_platform_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.current_profile_role() = 'supervisor_plataforma';
$$;

-- Visão global (Admin Master OU Supervisor de Plataforma)
CREATE OR REPLACE FUNCTION private.can_view_all_clinics()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.is_admin_master() OR private.is_platform_supervisor();
$$;

GRANT EXECUTE ON FUNCTION private.is_platform_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_all_clinics() TO authenticated;

-- 3) Profiles: recriar SELECT com invisibilidade do supervisor
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    -- Sempre: próprio perfil
    id = auth.uid()
    OR (
      -- Admin Master vê todos (incluindo supervisores)
      private.is_admin_master()
    )
    OR (
      -- Supervisor vê todos, EXCETO Admin Master e outros supervisores
      private.is_platform_supervisor()
      AND lower(trim(coalesce(role, ''))) NOT IN ('admin', 'supervisor_plataforma')
    )
    OR (
      -- Admin clínica: mesma clínica, sem ver supervisores/admin
      private.is_clinica_admin()
      AND clinic_id IS NOT NULL
      AND clinic_id = private.get_user_clinica_id()
      AND lower(trim(coalesce(role, ''))) NOT IN ('admin', 'supervisor_plataforma')
    )
    OR (
      -- Staff/terapeuta: colegas da clínica, sem supervisores/admin
      private.current_profile_role() IN ('responsavel_clinica', 'terapeuta')
      AND clinic_id IS NOT NULL
      AND clinic_id = private.get_user_clinica_id()
      AND lower(trim(coalesce(role, ''))) NOT IN ('admin', 'supervisor_plataforma')
    )
  );

-- UPDATE: supervisor não altera outros; admin master e regras anteriores
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    private.is_admin_master()
    OR id = auth.uid()
    OR (
      private.is_clinica_admin()
      AND clinic_id IS NOT NULL
      AND clinic_id = private.get_user_clinica_id()
      AND lower(trim(coalesce(role, ''))) NOT IN ('admin', 'supervisor_plataforma')
    )
  )
  WITH CHECK (
    private.is_admin_master()
    OR id = auth.uid()
    OR (
      private.is_clinica_admin()
      AND clinic_id IS NOT NULL
      AND clinic_id = private.get_user_clinica_id()
      AND lower(trim(coalesce(role, ''))) NOT IN ('admin', 'supervisor_plataforma')
    )
  );

-- Trigger: só admin master atribui supervisor_plataforma
CREATE OR REPLACE FUNCTION public.enforce_profile_privilege_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $fn$
DECLARE
  caller_role text := private.current_profile_role();
  caller_clinic uuid := private.current_profile_clinic_id();
  new_role text := lower(trim(coalesce(NEW.role, '')));
  old_role text := lower(trim(coalesce(OLD.role, '')));
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.clinic_id IS NOT DISTINCT FROM OLD.clinic_id
     AND NEW.status IS NOT DISTINCT FROM OLD.status
  THEN
    RETURN NEW;
  END IF;

  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF new_role IN ('admin', 'supervisor_plataforma') THEN
    RAISE EXCEPTION 'Sem permissão para atribuir este papel';
  END IF;

  IF old_role IN ('admin', 'supervisor_plataforma') AND NEW.id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão para editar este usuário';
  END IF;

  IF caller_role = 'clinica_admin' THEN
    IF caller_clinic IS NULL THEN
      RAISE EXCEPTION 'Admin da clínica sem clinic_id';
    END IF;
    IF OLD.clinic_id IS DISTINCT FROM caller_clinic AND OLD.id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Sem permissão para editar usuário de outra clínica';
    END IF;
    IF NEW.clinic_id IS DISTINCT FROM caller_clinic AND NEW.clinic_id IS NOT NULL THEN
      RAISE EXCEPTION 'Sem permissão para alterar clínica de destino';
    END IF;
    IF NEW.clinic_id IS NULL THEN
      NEW.clinic_id := caller_clinic;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.id = auth.uid() THEN
    NEW.role := OLD.role;
    NEW.clinic_id := OLD.clinic_id;
    NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissão para alterar este perfil';
END;
$fn$;

-- 4) Clinics: supervisor vê todas
DROP POLICY IF EXISTS "Admin master views all clinics" ON public.clinics;
DROP POLICY IF EXISTS "Platform supervisor views all clinics" ON public.clinics;
DROP POLICY IF EXISTS "Users view own clinic" ON public.clinics;

CREATE POLICY "Global roles view all clinics"
  ON public.clinics FOR SELECT TO authenticated
  USING (private.can_view_all_clinics());

CREATE POLICY "Users view own clinic"
  ON public.clinics FOR SELECT TO authenticated
  USING (
    id = private.get_user_clinica_id()
    AND private.get_user_clinica_id() IS NOT NULL
  );

-- 5) Dados clínicos: supervisor lê tudo (políticas ADDITIVAS)
DROP POLICY IF EXISTS "Platform supervisor views all patients" ON public.pacientes;
CREATE POLICY "Platform supervisor views all patients"
  ON public.pacientes FOR SELECT TO authenticated
  USING (private.is_platform_supervisor());

DROP POLICY IF EXISTS "Platform supervisor views all sessoes" ON public.sessoes;
CREATE POLICY "Platform supervisor views all sessoes"
  ON public.sessoes FOR SELECT TO authenticated
  USING (private.is_platform_supervisor());

DROP POLICY IF EXISTS "Platform supervisor views all objetivos" ON public.objetivos;
CREATE POLICY "Platform supervisor views all objetivos"
  ON public.objetivos FOR SELECT TO authenticated
  USING (private.is_platform_supervisor());

DROP POLICY IF EXISTS "Platform supervisor views all eventos" ON public.eventos;
CREATE POLICY "Platform supervisor views all eventos"
  ON public.eventos FOR SELECT TO authenticated
  USING (private.is_platform_supervisor());

DROP POLICY IF EXISTS "Platform supervisor views all cameras" ON public.cameras;
CREATE POLICY "Platform supervisor views all cameras"
  ON public.cameras FOR SELECT TO authenticated
  USING (private.is_platform_supervisor());

NOTIFY pgrst, 'reload schema';
