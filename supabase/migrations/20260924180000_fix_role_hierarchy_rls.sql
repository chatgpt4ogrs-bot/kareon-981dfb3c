-- =====================================================================
-- FIX HIERARQUIA KAREON: helpers RLS + profiles + policies de operação
--
-- Fonte de verdade: public.profiles.role + public.profiles.clinic_id
-- (profiles.id = auth.uid())
--
-- Admin Master     → tudo
-- Admin Clínica    → só sua clínica (usuários + dados)
-- Responsável      → operação da clínica (sem gerir usuários)
-- Terapeuta        → pacientes/agenda/registros da clínica (próprios)
-- Familiar         → vínculos paciente_usuarios / câmeras
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ---------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, sem loop de RLS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT lower(trim(coalesce(role, '')))
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_profile_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT clinic_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_admin_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.current_profile_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION private.is_clinica_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.current_profile_role() = 'clinica_admin';
$$;

-- Staff operacional da clínica (sem Admin Master)
CREATE OR REPLACE FUNCTION private.is_clinica_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.current_profile_role() IN ('clinica_admin', 'responsavel_clinica');
$$;

-- Quem gerencia usuários / config da clínica
CREATE OR REPLACE FUNCTION private.can_manage_clinica()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.current_profile_role() IN ('admin', 'clinica_admin');
$$;

CREATE OR REPLACE FUNCTION private.get_user_clinica_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.current_profile_clinic_id();
$$;

CREATE OR REPLACE FUNCTION private.get_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND lower(trim(coalesce(p.role, ''))) = lower(_role::text)
  );
$$;

GRANT EXECUTE ON FUNCTION private.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_profile_clinic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_master() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_clinica_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_clinica_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_clinica() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_clinica_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- Mantém aliases públicos usados por policies recentes
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.current_profile_role();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.current_profile_clinic_id();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.is_admin_master();
$$;

CREATE OR REPLACE FUNCTION public.get_user_clinica_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT private.get_user_clinica_id();
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_clinic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_clinica_id() TO authenticated;

-- ---------------------------------------------------------------------
-- Trigger: impede escalação de privilégio via UPDATE direto em profiles
-- ---------------------------------------------------------------------
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
BEGIN
  -- Sem alteração sensível → ok
  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.clinic_id IS NOT DISTINCT FROM OLD.clinic_id
     AND NEW.status IS NOT DISTINCT FROM OLD.status
  THEN
    RETURN NEW;
  END IF;

  -- Admin Master pode tudo
  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Ninguém além do admin pode se tornar / criar admin
  IF lower(trim(coalesce(NEW.role, ''))) = 'admin' THEN
    RAISE EXCEPTION 'Sem permissão para atribuir Admin Master';
  END IF;

  -- Admin da clínica: só na própria clínica, sem tocar em admin master
  IF caller_role = 'clinica_admin' THEN
    IF caller_clinic IS NULL THEN
      RAISE EXCEPTION 'Admin da clínica sem clinic_id';
    END IF;
    IF OLD.clinic_id IS DISTINCT FROM caller_clinic AND OLD.id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Sem permissão para editar usuário de outra clínica';
    END IF;
    IF lower(trim(coalesce(OLD.role, ''))) = 'admin' THEN
      RAISE EXCEPTION 'Sem permissão para editar Admin Master';
    END IF;
    -- Não pode mover para outra clínica
    IF NEW.clinic_id IS DISTINCT FROM caller_clinic AND NEW.clinic_id IS NOT NULL THEN
      RAISE EXCEPTION 'Sem permissão para alterar clínica de destino';
    END IF;
    -- Força clínica do admin ao vincular
    IF NEW.clinic_id IS NULL AND OLD.clinic_id IS NOT NULL THEN
      -- permitir desvincular? não — mantém na clínica
      NEW.clinic_id := caller_clinic;
    END IF;
    IF NEW.clinic_id IS NULL THEN
      NEW.clinic_id := caller_clinic;
    END IF;
    RETURN NEW;
  END IF;

  -- Usuário comum: só pode editar a si mesmo e sem mudar role/clinic/status
  IF NEW.id = auth.uid() THEN
    NEW.role := OLD.role;
    NEW.clinic_id := OLD.clinic_id;
    NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissão para alterar este perfil';
END;
$fn$;

DROP TRIGGER IF EXISTS trg_enforce_profile_privilege_guard ON public.profiles;
CREATE TRIGGER trg_enforce_profile_privilege_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_privilege_guard();

-- ---------------------------------------------------------------------
-- Profiles: policies alinhadas à hierarquia
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view clinic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Clinica admin updates clinic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin master updates any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin master views all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- SELECT
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    private.is_admin_master()
    OR id = auth.uid()
    OR (
      -- Admin clínica vê todos da sua clínica
      private.is_clinica_admin()
      AND clinic_id IS NOT NULL
      AND clinic_id = private.get_user_clinica_id()
    )
    OR (
      -- Staff/terapeuta: vê colegas da mesma clínica (dropdowns), não familiares de outras
      private.current_profile_role() IN ('responsavel_clinica', 'terapeuta')
      AND clinic_id IS NOT NULL
      AND clinic_id = private.get_user_clinica_id()
      AND lower(trim(coalesce(role, ''))) <> 'admin'
    )
  );

-- UPDATE
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    private.is_admin_master()
    OR id = auth.uid()
    OR (
      private.is_clinica_admin()
      AND clinic_id IS NOT NULL
      AND clinic_id = private.get_user_clinica_id()
      AND lower(trim(coalesce(role, ''))) <> 'admin'
    )
  )
  WITH CHECK (
    private.is_admin_master()
    OR id = auth.uid()
    OR (
      private.is_clinica_admin()
      AND clinic_id IS NOT NULL
      AND clinic_id = private.get_user_clinica_id()
      AND lower(trim(coalesce(role, ''))) <> 'admin'
    )
  );

-- INSERT (cadastro próprio / admins)
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR private.is_admin_master()
    OR (
      private.is_clinica_admin()
      AND clinic_id IS NOT NULL
      AND clinic_id = private.get_user_clinica_id()
      AND lower(trim(coalesce(role, ''))) <> 'admin'
    )
  );

-- ---------------------------------------------------------------------
-- Sessões / objetivos: responsável precisa VER (staff), não só manage
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Clinic managers view clinic sessoes" ON public.sessoes;
CREATE POLICY "Clinic staff view clinic sessoes"
  ON public.sessoes FOR SELECT TO authenticated
  USING (
    private.is_admin_master()
    OR (
      paciente_id IN (
        SELECT p.id FROM public.pacientes p
        WHERE p.clinica_id = private.get_user_clinica_id()
          AND private.get_user_clinica_id() IS NOT NULL
      )
      AND private.is_clinica_staff()
    )
  );

DROP POLICY IF EXISTS "Clinic managers view clinic objetivos" ON public.objetivos;
CREATE POLICY "Clinic staff view clinic objetivos"
  ON public.objetivos FOR SELECT TO authenticated
  USING (
    private.is_admin_master()
    OR (
      paciente_id IN (
        SELECT p.id FROM public.pacientes p
        WHERE p.clinica_id = private.get_user_clinica_id()
          AND private.get_user_clinica_id() IS NOT NULL
      )
      AND private.is_clinica_staff()
    )
  );

-- Eventos: staff vê agenda da clínica
DROP POLICY IF EXISTS "Clinic managers view clinic eventos" ON public.eventos;
CREATE POLICY "Clinic staff view clinic eventos"
  ON public.eventos FOR SELECT TO authenticated
  USING (
    private.is_admin_master()
    OR (
      clinica_id IS NOT NULL
      AND clinica_id = private.get_user_clinica_id()
      AND private.is_clinica_staff()
    )
  );

-- Pacientes: admin master explícito + staff (já existia staff; garante admin)
DROP POLICY IF EXISTS "Admin master views all patients" ON public.pacientes;
CREATE POLICY "Admin master views all patients"
  ON public.pacientes FOR SELECT TO authenticated
  USING (private.is_admin_master());

DROP POLICY IF EXISTS "Admin master manages patients" ON public.pacientes;
DROP POLICY IF EXISTS "Admin master inserts patients" ON public.pacientes;
DROP POLICY IF EXISTS "Admin master updates patients" ON public.pacientes;
DROP POLICY IF EXISTS "Admin master deletes patients" ON public.pacientes;

CREATE POLICY "Admin master inserts patients"
  ON public.pacientes FOR INSERT TO authenticated
  WITH CHECK (private.is_admin_master());
CREATE POLICY "Admin master updates patients"
  ON public.pacientes FOR UPDATE TO authenticated
  USING (private.is_admin_master());
CREATE POLICY "Admin master deletes patients"
  ON public.pacientes FOR DELETE TO authenticated
  USING (private.is_admin_master());

-- Responsável (staff) opera pacientes da clínica (além de clinica_admin via can_manage)
DROP POLICY IF EXISTS "Clinic staff updates patients" ON public.pacientes;
CREATE POLICY "Clinic staff updates patients"
  ON public.pacientes FOR UPDATE TO authenticated
  USING (
    clinica_id IS NOT NULL
    AND clinica_id = private.get_user_clinica_id()
    AND private.is_clinica_staff()
  );

DROP POLICY IF EXISTS "Clinic staff updates sessoes" ON public.sessoes;
CREATE POLICY "Clinic staff updates sessoes"
  ON public.sessoes FOR UPDATE TO authenticated
  USING (
    paciente_id IN (
      SELECT p.id FROM public.pacientes p
      WHERE p.clinica_id = private.get_user_clinica_id()
        AND private.get_user_clinica_id() IS NOT NULL
    )
    AND private.is_clinica_staff()
  );

DROP POLICY IF EXISTS "Clinic staff updates objetivos" ON public.objetivos;
CREATE POLICY "Clinic staff updates objetivos"
  ON public.objetivos FOR UPDATE TO authenticated
  USING (
    paciente_id IN (
      SELECT p.id FROM public.pacientes p
      WHERE p.clinica_id = private.get_user_clinica_id()
        AND private.get_user_clinica_id() IS NOT NULL
    )
    AND private.is_clinica_staff()
  );

DROP POLICY IF EXISTS "Clinic staff updates eventos" ON public.eventos;
CREATE POLICY "Clinic staff updates eventos"
  ON public.eventos FOR UPDATE TO authenticated
  USING (
    clinica_id IS NOT NULL
    AND clinica_id = private.get_user_clinica_id()
    AND private.is_clinica_staff()
  );

-- Clinics: já usam private.*; helpers corrigidos bastam.
-- Garante que clinic_id nulo nunca case com outra clínica nas policies existentes
-- (comparação NULL = x é false em SQL — ok).

-- Limpeza: Admin Master sem clínica; clinica_admin não pode ser admin
UPDATE public.profiles
SET clinic_id = NULL
WHERE lower(trim(coalesce(role, ''))) = 'admin';

NOTIFY pgrst, 'reload schema';
