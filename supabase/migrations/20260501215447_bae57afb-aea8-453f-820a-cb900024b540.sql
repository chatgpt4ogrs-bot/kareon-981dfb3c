ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS endereco text;