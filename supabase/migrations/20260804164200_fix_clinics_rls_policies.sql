-- Adiciona as policies de RLS que estão faltando na tabela 'clinics'
-- Causa: policies existentes só cobriam 'clinicas' (tabela antiga em PT), não 'clinics' (tabela atual em EN)

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin master can insert clinics" ON public.clinics;
DROP POLICY IF EXISTS "Admin master views all clinics" ON public.clinics;
DROP POLICY IF EXISTS "Admin master can update any clinic" ON public.clinics;
DROP POLICY IF EXISTS "Admin master can delete clinics" ON public.clinics;
DROP POLICY IF EXISTS "Users view own clinic" ON public.clinics;
DROP POLICY IF EXISTS "Clinic managers can update their clinic" ON public.clinics;

CREATE POLICY "Admin master can insert clinics"
  ON public.clinics FOR INSERT TO authenticated
  WITH CHECK (private.is_admin_master());

CREATE POLICY "Admin master views all clinics"
  ON public.clinics FOR SELECT TO authenticated
  USING (private.is_admin_master());

CREATE POLICY "Admin master can update any clinic"
  ON public.clinics FOR UPDATE TO authenticated
  USING (private.is_admin_master());

CREATE POLICY "Admin master can delete clinics"
  ON public.clinics FOR DELETE TO authenticated
  USING (private.is_admin_master());

CREATE POLICY "Users view own clinic"
  ON public.clinics FOR SELECT TO authenticated
  USING (id = private.get_user_clinica_id());

CREATE POLICY "Clinic managers can update their clinic"
  ON public.clinics FOR UPDATE TO authenticated
  USING (id = private.get_user_clinica_id() AND private.can_manage_clinica());

NOTIFY pgrst, 'reload schema';
