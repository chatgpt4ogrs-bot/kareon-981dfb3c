
-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_clinica_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'clinica_admin', 'responsavel_clinica')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_clinica()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'clinica_admin')
  )
$$;

-- =============================================
-- CLINICAS
-- =============================================
DROP POLICY IF EXISTS "Users can view their clinic" ON public.clinicas;
DROP POLICY IF EXISTS "Users can update their clinic" ON public.clinicas;

CREATE POLICY "Admin master views all clinics"
ON public.clinicas FOR SELECT TO authenticated
USING (is_admin_master());

CREATE POLICY "Users view own clinic"
ON public.clinicas FOR SELECT TO authenticated
USING (id = get_user_clinica_id());

CREATE POLICY "Admin master can insert clinics"
ON public.clinicas FOR INSERT TO authenticated
WITH CHECK (is_admin_master());

CREATE POLICY "Clinic managers can update their clinic"
ON public.clinicas FOR UPDATE TO authenticated
USING (id = get_user_clinica_id() AND can_manage_clinica());

CREATE POLICY "Admin master can update any clinic"
ON public.clinicas FOR UPDATE TO authenticated
USING (is_admin_master());

CREATE POLICY "Admin master can delete clinics"
ON public.clinicas FOR DELETE TO authenticated
USING (is_admin_master());

-- =============================================
-- PROFILES
-- =============================================
DROP POLICY IF EXISTS "Users can view profiles in their clinic" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Admin master views all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (is_admin_master());

CREATE POLICY "Users view clinic profiles"
ON public.profiles FOR SELECT TO authenticated
USING (clinica_id = get_user_clinica_id() OR user_id = auth.uid());

CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admin master updates any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (is_admin_master());

-- =============================================
-- USER_ROLES
-- =============================================
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admin master views all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (is_admin_master());

CREATE POLICY "Admin master manages roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (is_admin_master());

CREATE POLICY "Admin master updates roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (is_admin_master());

CREATE POLICY "Admin master deletes roles"
ON public.user_roles FOR DELETE TO authenticated
USING (is_admin_master());

CREATE POLICY "Clinica admin manages clinic roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  can_manage_clinica()
  AND role != 'admin'
  AND user_id IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.clinica_id = get_user_clinica_id()
  )
);

-- =============================================
-- PACIENTES
-- =============================================
DROP POLICY IF EXISTS "View patients" ON public.pacientes;
DROP POLICY IF EXISTS "Create patients" ON public.pacientes;
DROP POLICY IF EXISTS "Update patients" ON public.pacientes;
DROP POLICY IF EXISTS "Delete patients" ON public.pacientes;

CREATE POLICY "Admin master views all patients"
ON public.pacientes FOR SELECT TO authenticated
USING (is_admin_master());

CREATE POLICY "Clinic staff views clinic patients"
ON public.pacientes FOR SELECT TO authenticated
USING (clinica_id = get_user_clinica_id() AND is_clinica_staff());

CREATE POLICY "Terapeuta views own patients"
ON public.pacientes FOR SELECT TO authenticated
USING (
  clinica_id = get_user_clinica_id()
  AND (terapeuta_id = get_user_profile_id() OR terapeuta_id IS NULL)
  AND has_role(auth.uid(), 'terapeuta')
);

CREATE POLICY "Staff creates patients"
ON public.pacientes FOR INSERT TO authenticated
WITH CHECK (clinica_id = get_user_clinica_id() AND (is_clinica_staff() OR has_role(auth.uid(), 'terapeuta')));

CREATE POLICY "Managers update patients"
ON public.pacientes FOR UPDATE TO authenticated
USING (clinica_id = get_user_clinica_id() AND can_manage_clinica());

CREATE POLICY "Terapeuta updates own patients"
ON public.pacientes FOR UPDATE TO authenticated
USING (
  clinica_id = get_user_clinica_id()
  AND (terapeuta_id = get_user_profile_id() OR terapeuta_id IS NULL)
  AND has_role(auth.uid(), 'terapeuta')
);

CREATE POLICY "Admin master updates any patient"
ON public.pacientes FOR UPDATE TO authenticated
USING (is_admin_master());

CREATE POLICY "Managers delete patients"
ON public.pacientes FOR DELETE TO authenticated
USING (clinica_id = get_user_clinica_id() AND can_manage_clinica());

CREATE POLICY "Admin master deletes any patient"
ON public.pacientes FOR DELETE TO authenticated
USING (is_admin_master());

-- =============================================
-- SESSOES
-- =============================================
DROP POLICY IF EXISTS "View sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Create sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Update sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Delete sessoes" ON public.sessoes;

CREATE POLICY "Admin master views all sessoes"
ON public.sessoes FOR SELECT TO authenticated
USING (is_admin_master());

CREATE POLICY "Clinic managers view clinic sessoes"
ON public.sessoes FOR SELECT TO authenticated
USING (
  paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
  AND can_manage_clinica()
);

CREATE POLICY "Terapeuta views own sessoes"
ON public.sessoes FOR SELECT TO authenticated
USING (
  paciente_id IN (
    SELECT id FROM public.pacientes
    WHERE clinica_id = get_user_clinica_id()
    AND (terapeuta_id = get_user_profile_id() OR terapeuta_id IS NULL)
  )
  AND has_role(auth.uid(), 'terapeuta')
);

CREATE POLICY "Staff creates sessoes"
ON public.sessoes FOR INSERT TO authenticated
WITH CHECK (
  paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
  AND (can_manage_clinica() OR has_role(auth.uid(), 'terapeuta'))
);

CREATE POLICY "Terapeuta updates own sessoes"
ON public.sessoes FOR UPDATE TO authenticated
USING (
  paciente_id IN (
    SELECT id FROM public.pacientes
    WHERE clinica_id = get_user_clinica_id()
    AND (terapeuta_id = get_user_profile_id() OR terapeuta_id IS NULL)
  )
  AND has_role(auth.uid(), 'terapeuta')
);

CREATE POLICY "Managers update sessoes"
ON public.sessoes FOR UPDATE TO authenticated
USING (
  paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
  AND can_manage_clinica()
);

CREATE POLICY "Admin master manages all sessoes"
ON public.sessoes FOR UPDATE TO authenticated
USING (is_admin_master());

CREATE POLICY "Admin master deletes sessoes"
ON public.sessoes FOR DELETE TO authenticated
USING (is_admin_master());

CREATE POLICY "Managers delete sessoes"
ON public.sessoes FOR DELETE TO authenticated
USING (
  paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
  AND can_manage_clinica()
);

-- =============================================
-- OBJETIVOS
-- =============================================
DROP POLICY IF EXISTS "View objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Create objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Update objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Delete objetivos" ON public.objetivos;

CREATE POLICY "Admin master views all objetivos"
ON public.objetivos FOR SELECT TO authenticated
USING (is_admin_master());

CREATE POLICY "Clinic managers view clinic objetivos"
ON public.objetivos FOR SELECT TO authenticated
USING (
  paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
  AND can_manage_clinica()
);

CREATE POLICY "Terapeuta views own objetivos"
ON public.objetivos FOR SELECT TO authenticated
USING (
  paciente_id IN (
    SELECT id FROM public.pacientes
    WHERE clinica_id = get_user_clinica_id()
    AND (terapeuta_id = get_user_profile_id() OR terapeuta_id IS NULL)
  )
  AND has_role(auth.uid(), 'terapeuta')
);

CREATE POLICY "Staff creates objetivos"
ON public.objetivos FOR INSERT TO authenticated
WITH CHECK (
  paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
  AND (can_manage_clinica() OR has_role(auth.uid(), 'terapeuta'))
);

CREATE POLICY "Terapeuta updates own objetivos"
ON public.objetivos FOR UPDATE TO authenticated
USING (
  paciente_id IN (
    SELECT id FROM public.pacientes
    WHERE clinica_id = get_user_clinica_id()
    AND (terapeuta_id = get_user_profile_id() OR terapeuta_id IS NULL)
  )
  AND has_role(auth.uid(), 'terapeuta')
);

CREATE POLICY "Managers update objetivos"
ON public.objetivos FOR UPDATE TO authenticated
USING (
  paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
  AND can_manage_clinica()
);

CREATE POLICY "Admin master manages all objetivos"
ON public.objetivos FOR UPDATE TO authenticated
USING (is_admin_master());

CREATE POLICY "Managers delete objetivos"
ON public.objetivos FOR DELETE TO authenticated
USING (
  paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
  AND can_manage_clinica()
);

CREATE POLICY "Admin master deletes objetivos"
ON public.objetivos FOR DELETE TO authenticated
USING (is_admin_master());
