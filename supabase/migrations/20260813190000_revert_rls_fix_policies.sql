-- =====================================================================
-- REVERTER: Remove políticas criadas pela migração 20260813170000
-- e restaura políticas simples e seguras sem recursão infinita
-- =====================================================================

-- 1. Remove as políticas problemáticas que criamos
DROP POLICY IF EXISTS "Users view clinic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Clinica admin updates clinic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin master updates any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin master views all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- 2. Cria função auxiliar que bypassa RLS para checar o role do usuário logado
-- SECURITY DEFINER garante que não entra em loop recursivo
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- 3. Cria função auxiliar para obter clinic_id do usuário logado (sem RLS loop)
CREATE OR REPLACE FUNCTION public.get_current_user_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_clinic_id() TO authenticated;

-- 4. Habilita RLS (caso não esteja)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Política de LEITURA - sem recursão:
-- Admin master vê tudo; outros veem próprio perfil ou perfis da mesma clínica
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() = 'admin'
    OR id = auth.uid()
    OR (
      clinic_id IS NOT NULL 
      AND clinic_id = public.get_current_user_clinic_id()
    )
  );

-- 6. Política de UPDATE - sem recursão:
-- Admin master atualiza todos; clinica_admin atualiza perfis da sua clínica; usuário atualiza o próprio
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    public.get_current_user_role() = 'admin'
    OR id = auth.uid()
    OR (
      public.get_current_user_role() = 'clinica_admin'
      AND clinic_id IS NOT NULL
      AND clinic_id = public.get_current_user_clinic_id()
    )
  );

-- 7. Política de INSERT - usuário insere o próprio perfil (trigger de auth)
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR public.get_current_user_role() IN ('admin', 'clinica_admin')
  );

-- 8. Garante que o admin@kareon.com está com dados corretos
UPDATE public.profiles 
SET 
  role = 'admin',
  status = 'ativo',
  clinic_id = NULL
WHERE email = 'admin@kareon.com';

-- 9. NÃO reatribuir clinic_id de usuários admin (desfaz o UPDATE anterior)
-- Garante que usuários com role='admin' nunca tenham clinic_id forçado
UPDATE public.profiles SET clinic_id = NULL WHERE role = 'admin';

NOTIFY pgrst, 'reload schema';
