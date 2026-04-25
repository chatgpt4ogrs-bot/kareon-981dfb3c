ALTER TABLE public.eventos ADD COLUMN terapeuta_id UUID;
CREATE INDEX idx_eventos_terapeuta ON public.eventos(terapeuta_id);