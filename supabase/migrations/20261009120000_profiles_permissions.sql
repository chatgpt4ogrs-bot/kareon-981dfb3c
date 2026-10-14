-- =====================================================================
-- Acessos por usuário (abas liberadas individualmente)
--
-- profiles.permissions = lista de abas liberadas para o usuário.
--   NULL  → usa o modelo do perfil (ROLE_DEFAULT_TABS no frontend)
--   '{}'  → nenhuma aba além de Início/Perfil
-- Valores válidos: pacientes, agenda, estoque, cameras,
--                  clinica_usuarios, clinica_detalhes
--
-- Alterações de acesso passam pela Edge Function manage-clinic-user
-- (service_role). O gatilho abaixo impede que um usuário altere os
-- próprios acessos (ou os de outros) direto pela API.
-- =====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions text[];

COMMENT ON COLUMN public.profiles.permissions IS
  'Abas liberadas para o usuário; NULL = modelo do perfil';

CREATE OR REPLACE FUNCTION public.guard_profile_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $fn$
DECLARE
  caller_role text;
BEGIN
  -- service_role / SQL Editor / triggers internos não têm auth.uid()
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.permissions IS NOT DISTINCT FROM OLD.permissions THEN
    RETURN NEW;
  END IF;

  SELECT lower(trim(coalesce(role, ''))) INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.permissions := NULL;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissão para alterar acessos';
END;
$fn$;

DROP TRIGGER IF EXISTS trg_guard_profile_permissions ON public.profiles;
CREATE TRIGGER trg_guard_profile_permissions
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_permissions();

NOTIFY pgrst, 'reload schema';
