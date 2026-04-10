
-- Pacientes: adicionar campos que faltam
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS diagnostico TEXT DEFAULT '';
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS responsavel_email TEXT DEFAULT '';
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS responsavel_parentesco TEXT DEFAULT '';
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo';

-- Rename responsavel to responsavel_nome for clarity
ALTER TABLE public.pacientes RENAME COLUMN responsavel TO responsavel_nome;
ALTER TABLE public.pacientes RENAME COLUMN telefone TO responsavel_telefone;

-- Objetivos: o campo 'titulo' será usado como alias para 'descricao' existente - apenas adicionar descricao_detalhe
-- Na verdade o app usa 'descricao' como título, está ok

-- Sessoes: ajustar para alinhar com interface
ALTER TABLE public.sessoes RENAME COLUMN data TO data_hora;
ALTER TABLE public.sessoes RENAME COLUMN comportamento TO comportamentos;
ALTER TABLE public.sessoes RENAME COLUMN progresso TO progresso_observado;
ALTER TABLE public.sessoes RENAME COLUMN objetivo_sessao TO objetivo_sessao_texto;
ALTER TABLE public.sessoes ADD COLUMN IF NOT EXISTS atividades_lista TEXT[] DEFAULT '{}';
ALTER TABLE public.sessoes ADD COLUMN IF NOT EXISTS objetivo_ids TEXT[] DEFAULT '{}';
-- Keep old atividades (TEXT) for notes, atividades_lista for the array of selected activities
