-- =====================================================================
-- Auditoria de exclusões
--
-- Toda exclusão pede um motivo e grava em public.audit_logs:
-- quem excluiu, quando, o quê (cópia completa do registro) e por quê.
-- Somente Admin Master lê; ninguém altera ou apaga registros de auditoria.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  action       text NOT NULL DEFAULT 'delete',
  entity_type  text NOT NULL,
  entity_id    text,
  entity_label text,
  clinic_id    uuid,
  reason       text NOT NULL CHECK (length(trim(reason)) >= 3),
  snapshot     jsonb,
  actor_id     uuid,
  actor_name   text,
  actor_email  text,
  actor_role   text
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Autor sempre vem da sessão (não pode ser forjado pelo cliente).
-- Sem auth.uid() (service_role / Edge Function), mantém os campos enviados.
CREATE OR REPLACE FUNCTION public.audit_logs_set_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $fn$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.actor_id := auth.uid();
    SELECT p.name, p.email, p.role
      INTO NEW.actor_name, NEW.actor_email, NEW.actor_role
    FROM public.profiles p
    WHERE p.id = auth.uid();
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_audit_logs_set_actor ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_set_actor
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_set_actor();

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

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.audit_is_admin_master());

DROP POLICY IF EXISTS "audit_logs_insert_own" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_own"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id IS NULL OR actor_id = auth.uid());

-- Sem policies de UPDATE/DELETE: registros de auditoria são imutáveis.

-- ---------------------------------------------------------------------
-- Exclusão + auditoria na mesma transação.
-- SECURITY INVOKER: o DELETE respeita as policies (RLS) de cada tabela.
-- ---------------------------------------------------------------------
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
