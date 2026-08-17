-- Adiciona colunas que existiam em 'clinicas' mas faltam em 'clinics'
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS endereco text;
