-- =====================================================================
-- Gestor = dono de uma ou mais clínicas
--
-- O Admin Master vincula o Gestor (profiles.role = 'supervisor_plataforma')
-- às clínicas dele no cadastro. O Gestor só vê e gerencia essas clínicas,
-- os usuários delas (exceto Admin Master e outros Gestores) e os dados delas.
--
-- Políticas abaixo são ADITIVAS: não removem nenhuma regra existente.
-- Requer 20261009160000_profiles_role_check_gestor.sql.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.gestor_clinicas (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id  uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS gestor_clinicas_clinic_idx ON public.gestor_clinicas (clinic_id);

-- Helpers (SECURITY DEFINER para não cair em recursão de RLS em profiles)
CREATE OR REPLACE FUNCTION public.audit_is_admin_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND lower(trim(coalesce(role, ''))) = 'admin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.audit_is_admin_master() TO authenticated;

CREATE OR REPLACE FUNCTION public.gestor_clinic_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT g.clinic_id
  FROM public.gestor_clinicas g
  JOIN public.profiles p ON p.id = g.profile_id
  WHERE g.profile_id = auth.uid()
    AND lower(trim(coalesce(p.role, ''))) = 'supervisor_plataforma';
$$;
GRANT EXECUTE ON FUNCTION public.gestor_clinic_ids() TO authenticated;

-- Vínculos: Admin Master gerencia; o Gestor só lê os próprios
ALTER TABLE public.gestor_clinicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gestor_clinicas_select" ON public.gestor_clinicas;
CREATE POLICY "gestor_clinicas_select"
  ON public.gestor_clinicas FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.audit_is_admin_master());

DROP POLICY IF EXISTS "gestor_clinicas_admin_insert" ON public.gestor_clinicas;
CREATE POLICY "gestor_clinicas_admin_insert"
  ON public.gestor_clinicas FOR INSERT TO authenticated
  WITH CHECK (public.audit_is_admin_master());

DROP POLICY IF EXISTS "gestor_clinicas_admin_delete" ON public.gestor_clinicas;
CREATE POLICY "gestor_clinicas_admin_delete"
  ON public.gestor_clinicas FOR DELETE TO authenticated
  USING (public.audit_is_admin_master());

-- Clínicas: Gestor vê e edita as vinculadas (CNPJ continua travado pelo trigger próprio)
DROP POLICY IF EXISTS "gestor_select_linked_clinics" ON public.clinics;
CREATE POLICY "gestor_select_linked_clinics"
  ON public.clinics FOR SELECT TO authenticated
  USING (id IN (SELECT public.gestor_clinic_ids()));

DROP POLICY IF EXISTS "gestor_update_linked_clinics" ON public.clinics;
CREATE POLICY "gestor_update_linked_clinics"
  ON public.clinics FOR UPDATE TO authenticated
  USING (id IN (SELECT public.gestor_clinic_ids()))
  WITH CHECK (id IN (SELECT public.gestor_clinic_ids()));

-- Ativar/desativar clínica: somente Admin Master (ou service_role)
CREATE OR REPLACE FUNCTION public.guard_clinics_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.audit_is_admin_master() THEN
    RAISE EXCEPTION 'Somente o suporte pode ativar ou desativar clínicas. Entre em contato com o suporte';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_guard_clinics_status ON public.clinics;
CREATE TRIGGER trg_guard_clinics_status
  BEFORE UPDATE OF status ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.guard_clinics_status();

-- Usuários: Gestor vê os usuários das clínicas dele (nunca Admin Master nem outros Gestores)
DROP POLICY IF EXISTS "gestor_select_linked_profiles" ON public.profiles;
CREATE POLICY "gestor_select_linked_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    clinic_id IN (SELECT public.gestor_clinic_ids())
    AND lower(trim(coalesce(role, ''))) NOT IN ('admin', 'supervisor_plataforma')
  );

-- Perfil pré-cadastrado "Gestor": nova descrição e aba de usuários no modelo
-- (só se ainda estiver com os valores originais)
DO $$
BEGIN
  IF to_regclass('public.perfis_acesso') IS NOT NULL THEN
    UPDATE public.perfis_acesso
       SET descricao = 'Dono de uma ou mais clínicas: faz a gestão apenas das clínicas vinculadas pelo Admin Master.',
           abas = ARRAY['pacientes','agenda','estoque','cameras','clinica_usuarios']
     WHERE is_system
       AND base_role = 'supervisor_plataforma'
       AND abas = ARRAY['pacientes','agenda','estoque','cameras'];
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
