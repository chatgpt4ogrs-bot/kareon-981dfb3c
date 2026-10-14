-- =====================================================================
-- Perfis de acesso personalizáveis
--
-- Cada perfil tem um nome livre (editável) e um "tipo de acesso" (base_role)
-- que continua sendo o valor gravado em profiles.role, para manter as regras
-- do sistema (familiar vinculado a pacientes, gestor sem clínica etc.).
-- Os 6 perfis atuais entram como pré-cadastrados: podem ser renomeados,
-- mas não excluídos nem ter o tipo alterado.
-- Requer 20261009130000_audit_logs.sql (exclusão com motivo/auditoria).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.perfis_acesso (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL CHECK (length(trim(nome)) >= 2),
  descricao   text,
  base_role   text NOT NULL CHECK (base_role IN (
                'admin', 'supervisor_plataforma', 'clinica_admin',
                'responsavel_clinica', 'terapeuta', 'familiar')),
  abas        text[] NOT NULL DEFAULT '{}',
  is_system   boolean NOT NULL DEFAULT false,
  ordem       integer NOT NULL DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- Ninguém cria um segundo perfil com poder de Admin Master
  CONSTRAINT perfis_acesso_admin_only_system CHECK (is_system OR base_role <> 'admin')
);

CREATE UNIQUE INDEX IF NOT EXISTS perfis_acesso_nome_uniq ON public.perfis_acesso (lower(trim(nome)));
CREATE UNIQUE INDEX IF NOT EXISTS perfis_acesso_system_role_uniq ON public.perfis_acesso (base_role) WHERE is_system;

-- Perfis pré-cadastrados
INSERT INTO public.perfis_acesso (nome, descricao, base_role, abas, is_system, ordem)
SELECT v.nome, v.descricao, v.base_role, v.abas, true, v.ordem
FROM (VALUES
  ('Admin Master', 'Acesso total ao sistema, todas as clínicas.', 'admin',
     ARRAY['pacientes','agenda','estoque','cameras','clinica_usuarios','clinica_detalhes'], 1),
  ('Gestor', 'Acima das clínicas: vê todas as clínicas e usuários; invisível para os demais perfis.', 'supervisor_plataforma',
     ARRAY['pacientes','agenda','estoque','cameras'], 2),
  ('Admin Clínica', 'Gerencia configurações, usuários e dados da clínica.', 'clinica_admin',
     ARRAY['pacientes','agenda','estoque','cameras','clinica_usuarios','clinica_detalhes'], 3),
  ('Responsável', 'Gestão operacional da clínica (pacientes, agenda, câmeras).', 'responsavel_clinica',
     ARRAY['pacientes','agenda','estoque','cameras'], 4),
  ('Terapeuta', 'Atende pacientes designados, registra sessões e objetivos.', 'terapeuta',
     ARRAY['pacientes','agenda','estoque'], 5),
  ('Familiar', 'Visualiza informações e câmeras dos pacientes vinculados.', 'familiar',
     ARRAY['cameras'], 6)
) AS v(nome, descricao, base_role, abas, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.perfis_acesso p WHERE p.is_system AND p.base_role = v.base_role
);

-- Vínculo do usuário com o perfil escolhido (nome exibido)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perfil_id uuid REFERENCES public.perfis_acesso(id);

-- Proteções: pré-cadastrados não mudam de tipo nem são excluídos; perfil em uso não é excluído
CREATE OR REPLACE FUNCTION public.guard_perfis_acesso()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'Perfis pré-cadastrados não podem ser excluídos (apenas renomeados)';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE perfil_id = OLD.id) THEN
      RAISE EXCEPTION 'Este perfil está em uso por usuários. Troque o perfil deles antes de excluir';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_system AND (NEW.base_role IS DISTINCT FROM OLD.base_role) THEN
      RAISE EXCEPTION 'O tipo de acesso de um perfil pré-cadastrado não pode ser alterado';
    END IF;
    NEW.is_system := OLD.is_system;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- INSERT pelo sistema nunca cria pré-cadastrado novo
  IF auth.uid() IS NOT NULL THEN
    NEW.is_system := false;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_guard_perfis_acesso ON public.perfis_acesso;
CREATE TRIGGER trg_guard_perfis_acesso
  BEFORE INSERT OR UPDATE OR DELETE ON public.perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION public.guard_perfis_acesso();

-- Mesmo helper da auditoria (recriado aqui para não depender da ordem de execução)
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

ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfis_acesso_select" ON public.perfis_acesso;
CREATE POLICY "perfis_acesso_select"
  ON public.perfis_acesso FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "perfis_acesso_insert_admin" ON public.perfis_acesso;
CREATE POLICY "perfis_acesso_insert_admin"
  ON public.perfis_acesso FOR INSERT TO authenticated
  WITH CHECK (public.audit_is_admin_master());

DROP POLICY IF EXISTS "perfis_acesso_update_admin" ON public.perfis_acesso;
CREATE POLICY "perfis_acesso_update_admin"
  ON public.perfis_acesso FOR UPDATE TO authenticated
  USING (public.audit_is_admin_master())
  WITH CHECK (public.audit_is_admin_master());

DROP POLICY IF EXISTS "perfis_acesso_delete_admin" ON public.perfis_acesso;
CREATE POLICY "perfis_acesso_delete_admin"
  ON public.perfis_acesso FOR DELETE TO authenticated
  USING (public.audit_is_admin_master());

-- Só Admin Master (ou a Edge Function, via service_role) troca o perfil de um usuário
CREATE OR REPLACE FUNCTION public.guard_profile_perfil_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.perfil_id IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.perfil_id ELSE NULL END)
     AND NOT public.audit_is_admin_master() THEN
    RAISE EXCEPTION 'Sem permissão para alterar o perfil do usuário';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_guard_profile_perfil_id ON public.profiles;
CREATE TRIGGER trg_guard_profile_perfil_id
  BEFORE INSERT OR UPDATE OF perfil_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_perfil_id();

-- Exclusão de perfil com motivo (adiciona 'perfil' à lista do delete_with_audit)
CREATE OR REPLACE FUNCTION public.delete_with_audit(p_entity text, p_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  v_table text;
  v_row   jsonb;
  v_label text;
  v_clinic uuid;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Informe o motivo da exclusão';
  END IF;

  v_table := CASE p_entity
    WHEN 'clinica'  THEN 'clinics'
    WHEN 'paciente' THEN 'pacientes'
    WHEN 'evento'   THEN 'eventos'
    WHEN 'camera'   THEN 'cameras'
    WHEN 'objetivo' THEN 'objetivos'
    WHEN 'perfil'   THEN 'perfis_acesso'
    ELSE NULL
  END;
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Tipo de registro não suportado: %', p_entity;
  END IF;

  EXECUTE format('DELETE FROM public.%I t WHERE t.id = $1 RETURNING to_jsonb(t.*)', v_table)
    INTO v_row
    USING p_id;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem permissão para excluir';
  END IF;

  -- Nunca guardar credenciais na auditoria
  v_row := v_row - 'senha' - 'password' - 'usuario';

  v_label := coalesce(v_row->>'nome', v_row->>'name', v_row->>'titulo', v_row->>'email', p_id::text);
  v_clinic := CASE
    WHEN p_entity = 'clinica' THEN p_id
    ELSE nullif(coalesce(v_row->>'clinica_id', v_row->>'clinic_id'), '')::uuid
  END;

  INSERT INTO public.audit_logs (action, entity_type, entity_id, entity_label, clinic_id, reason, snapshot)
  VALUES ('delete', p_entity, p_id::text, v_label, v_clinic, trim(p_reason), v_row);

  RETURN v_row;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.delete_with_audit(text, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
