-- Tabela de junção: vários terapeutas por evento
CREATE TABLE public.evento_terapeutas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  terapeuta_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (evento_id, terapeuta_id)
);

CREATE INDEX idx_evento_terapeutas_evento ON public.evento_terapeutas(evento_id);
CREATE INDEX idx_evento_terapeutas_terapeuta ON public.evento_terapeutas(terapeuta_id);

-- Migrar vínculos atuais
INSERT INTO public.evento_terapeutas (evento_id, terapeuta_id)
SELECT id, terapeuta_id FROM public.eventos
WHERE terapeuta_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.evento_terapeutas ENABLE ROW LEVEL SECURITY;

-- Admin master
CREATE POLICY "Admin master views all evento_terapeutas"
ON public.evento_terapeutas FOR SELECT TO authenticated
USING (is_admin_master());

CREATE POLICY "Admin master inserts evento_terapeutas"
ON public.evento_terapeutas FOR INSERT TO authenticated
WITH CHECK (is_admin_master());

CREATE POLICY "Admin master deletes evento_terapeutas"
ON public.evento_terapeutas FOR DELETE TO authenticated
USING (is_admin_master());

-- SELECT: quem vê o evento vê seus vínculos
CREATE POLICY "View evento_terapeutas if can view evento"
ON public.evento_terapeutas FOR SELECT TO authenticated
USING (
  evento_id IN (
    SELECT id FROM public.eventos
    WHERE
      (clinica_id = get_user_clinica_id() AND is_clinica_staff())
      OR (clinica_id = get_user_clinica_id() AND criado_por = get_user_profile_id() AND has_role(auth.uid(), 'terapeuta'::app_role))
      OR (paciente_id IN (SELECT paciente_id FROM paciente_usuarios WHERE profile_id = get_user_profile_id()) AND has_role(auth.uid(), 'familiar'::app_role))
  )
);

-- INSERT: staff da clínica ou criador (terapeuta) do evento
CREATE POLICY "Staff/owner inserts evento_terapeutas"
ON public.evento_terapeutas FOR INSERT TO authenticated
WITH CHECK (
  evento_id IN (
    SELECT id FROM public.eventos
    WHERE clinica_id = get_user_clinica_id()
      AND (
        is_clinica_staff()
        OR (criado_por = get_user_profile_id() AND has_role(auth.uid(), 'terapeuta'::app_role))
      )
  )
);

-- DELETE: staff da clínica ou criador (terapeuta) do evento
CREATE POLICY "Staff/owner deletes evento_terapeutas"
ON public.evento_terapeutas FOR DELETE TO authenticated
USING (
  evento_id IN (
    SELECT id FROM public.eventos
    WHERE clinica_id = get_user_clinica_id()
      AND (
        is_clinica_staff()
        OR (criado_por = get_user_profile_id() AND has_role(auth.uid(), 'terapeuta'::app_role))
      )
  )
);