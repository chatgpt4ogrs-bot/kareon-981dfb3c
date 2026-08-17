-- Correção: adiciona a coluna 'nome' e demais colunas faltantes na tabela 'clinics'
-- Contexto: a tabela 'clinics' foi criada sem 'nome' (coluna obrigatória usada em todo o frontend)

-- Adiciona coluna 'nome' se não existir
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS nome text;

-- Garante que as outras colunas também existam (idempotente)
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Preenche 'nome' com valor padrão para registros existentes que estejam nulos
UPDATE public.clinics SET nome = 'Clínica sem nome' WHERE nome IS NULL;

-- Torna 'nome' NOT NULL após preencher os registros existentes
ALTER TABLE public.clinics ALTER COLUMN nome SET NOT NULL;

-- Notifica o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
