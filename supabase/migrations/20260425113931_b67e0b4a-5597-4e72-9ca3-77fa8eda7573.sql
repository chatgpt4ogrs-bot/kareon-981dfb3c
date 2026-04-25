-- Tabela de eventos da agenda
CREATE TABLE public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL,
  criado_por UUID NOT NULL, -- profile_id do criador
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE,
  categoria TEXT NOT NULL DEFAULT 'sessao',
  cor TEXT NOT NULL DEFAULT '#4A90E2',
  paciente_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_eventos_clinica ON public.eventos(clinica_id);
CREATE INDEX idx_eventos_data ON public.eventos(data_inicio);
CREATE INDEX idx_eventos_paciente ON public.eventos(paciente_id);
CREATE INDEX idx_eventos_criador ON public.eventos(criado_por);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_eventos_updated_at
BEFORE UPDATE ON public.eventos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Admin master: tudo
CREATE POLICY "Admin master views all eventos"
ON public.eventos FOR SELECT TO authenticated
USING (is_admin_master());

CREATE POLICY "Admin master inserts eventos"
ON public.eventos FOR INSERT TO authenticated
WITH CHECK (is_admin_master());

CREATE POLICY "Admin master updates eventos"
ON public.eventos FOR UPDATE TO authenticated
USING (is_admin_master());

CREATE POLICY "Admin master deletes eventos"
ON public.eventos FOR DELETE TO authenticated
USING (is_admin_master());

-- Staff/gestores da clínica: tudo da própria clínica
CREATE POLICY "Clinic managers view clinic eventos"
ON public.eventos FOR SELECT TO authenticated
USING (clinica_id = get_user_clinica_id() AND is_clinica_staff());

CREATE POLICY "Clinic managers update clinic eventos"
ON public.eventos FOR UPDATE TO authenticated
USING (clinica_id = get_user_clinica_id() AND can_manage_clinica());

CREATE POLICY "Clinic managers delete clinic eventos"
ON public.eventos FOR DELETE TO authenticated
USING (clinica_id = get_user_clinica_id() AND can_manage_clinica());

-- Staff/terapeutas criam eventos na própria clínica
CREATE POLICY "Staff creates eventos"
ON public.eventos FOR INSERT TO authenticated
WITH CHECK (
  clinica_id = get_user_clinica_id()
  AND (is_clinica_staff() OR has_role(auth.uid(), 'terapeuta'::app_role))
);

-- Terapeuta: vê e edita os próprios eventos
CREATE POLICY "Terapeuta views own eventos"
ON public.eventos FOR SELECT TO authenticated
USING (
  clinica_id = get_user_clinica_id()
  AND criado_por = get_user_profile_id()
  AND has_role(auth.uid(), 'terapeuta'::app_role)
);

CREATE POLICY "Terapeuta updates own eventos"
ON public.eventos FOR UPDATE TO authenticated
USING (
  clinica_id = get_user_clinica_id()
  AND criado_por = get_user_profile_id()
  AND has_role(auth.uid(), 'terapeuta'::app_role)
);

CREATE POLICY "Terapeuta deletes own eventos"
ON public.eventos FOR DELETE TO authenticated
USING (
  clinica_id = get_user_clinica_id()
  AND criado_por = get_user_profile_id()
  AND has_role(auth.uid(), 'terapeuta'::app_role)
);

-- Familiar: vê eventos vinculados a pacientes que acompanha
CREATE POLICY "Familiar views linked eventos"
ON public.eventos FOR SELECT TO authenticated
USING (
  paciente_id IN (
    SELECT paciente_id FROM paciente_usuarios
    WHERE profile_id = get_user_profile_id()
  )
  AND has_role(auth.uid(), 'familiar'::app_role)
);