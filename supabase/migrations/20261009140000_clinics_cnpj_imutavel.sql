-- =====================================================================
-- CNPJ da clínica é imutável depois de preenchido.
-- Pode ser informado no cadastro (ou preenchido uma vez, se estiver vazio);
-- depois disso nenhum usuário consegue alterá-lo pelo sistema.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.guard_clinics_cnpj()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF nullif(trim(coalesce(OLD.cnpj, '')), '') IS NOT NULL
     AND NEW.cnpj IS DISTINCT FROM OLD.cnpj THEN
    RAISE EXCEPTION 'O CNPJ da clínica não pode ser alterado. Para corrigir, entre em contato com o suporte';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_guard_clinics_cnpj ON public.clinics;
CREATE TRIGGER trg_guard_clinics_cnpj
  BEFORE UPDATE OF cnpj ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.guard_clinics_cnpj();
