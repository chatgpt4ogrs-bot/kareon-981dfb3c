-- Kareon — schema PostgreSQL (sem Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clínicas
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  status TEXT NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usuários (auth local)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfis
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'terapeuta'
    CHECK (role IN (
      'admin',
      'supervisor_plataforma',
      'clinica_admin',
      'responsavel_clinica',
      'terapeuta',
      'familiar'
    )),
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  telefone TEXT,
  avatar_url TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  permissions TEXT[],
  perfil_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS perfis_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  base_role TEXT NOT NULL,
  abas TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_perfil_id_fkey
    FOREIGN KEY (perfil_id) REFERENCES perfis_acesso(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS gestor_clinicas (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, clinic_id)
);

-- Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  data_nascimento DATE,
  diagnostico TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  responsavel_nome TEXT,
  responsavel_telefone TEXT,
  responsavel_email TEXT,
  responsavel_parentesco TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  terapeuta_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cpf TEXT,
  convenio TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paciente_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'familiar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paciente_id, profile_id, tipo)
);

CREATE TABLE IF NOT EXISTS objetivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  titulo TEXT,
  descricao TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'nao_iniciado',
  progresso INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  terapeuta_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  objetivo_ids UUID[] DEFAULT '{}',
  atividades TEXT[] DEFAULT '{}',
  comportamentos TEXT[] DEFAULT '{}',
  engajamento TEXT DEFAULT 'medio',
  progresso_observado TEXT DEFAULT 'manteve',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agenda
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado',
  tipo TEXT DEFAULT 'consulta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evento_terapeutas (
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (evento_id, profile_id)
);

-- Câmeras
CREATE TABLE IF NOT EXISTS cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camera_usuarios (
  camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (camera_id, profile_id)
);

-- Estoque
CREATE TABLE IF NOT EXISTS estoque_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT,
  unidade TEXT,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC NOT NULL DEFAULT 0,
  custo NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL DEFAULT 'delete',
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_label TEXT,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  reason TEXT,
  snapshot JSONB,
  actor_id UUID,
  actor_name TEXT,
  actor_email TEXT,
  actor_role TEXT
);

-- Convênios e procedimentos (atendimento)
CREATE TABLE IF NOT EXISTS convenios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  valor NUMERIC DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Atendimentos (estilo OnlineClinic)
CREATE TABLE IF NOT EXISTS atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  evento_id UUID REFERENCES eventos(id) ON DELETE SET NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('agendado', 'em_andamento', 'finalizado', 'cancelado', 'faltou')),
  tipo TEXT NOT NULL DEFAULT 'presencial'
    CHECK (tipo IN ('presencial', 'teleconsulta', 'retorno')),
  convenio_id UUID REFERENCES convenios(id) ON DELETE SET NULL,
  procedimento_id UUID REFERENCES procedimentos(id) ON DELETE SET NULL,
  -- Prontuário (abas)
  queixa_principal TEXT,
  anamnese TEXT,
  exame_fisico TEXT,
  sinais_vitais JSONB DEFAULT '{}',
  diagnostico_cid TEXT,
  diagnostico_descricao TEXT,
  conduta TEXT,
  evolucao TEXT,
  prescricao TEXT,
  exames_solicitados TEXT,
  atestado TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_clinic ON profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica ON pacientes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_clinica ON atendimentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_paciente ON atendimentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_data ON atendimentos(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_clinica ON eventos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_eventos_inicio ON eventos(inicio);

-- Perfis de acesso padrão
INSERT INTO perfis_acesso (id, nome, descricao, base_role, abas, is_system, ordem)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Admin Master', 'Acesso total à plataforma', 'admin',
   ARRAY['pacientes','agenda','estoque','cameras','clinica_detalhes','clinica_usuarios','atendimento'], true, 1),
  ('a0000000-0000-4000-8000-000000000002', 'Gestor', 'Dono de clínicas vinculadas', 'supervisor_plataforma',
   ARRAY['pacientes','agenda','estoque','cameras','clinica_usuarios','atendimento'], true, 2),
  ('a0000000-0000-4000-8000-000000000003', 'Admin Clínica', 'Administra a própria clínica', 'clinica_admin',
   ARRAY['pacientes','agenda','estoque','cameras','clinica_detalhes','clinica_usuarios','atendimento'], true, 3),
  ('a0000000-0000-4000-8000-000000000004', 'Responsável', 'Gestão operacional', 'responsavel_clinica',
   ARRAY['pacientes','agenda','estoque','cameras','atendimento'], true, 4),
  ('a0000000-0000-4000-8000-000000000005', 'Terapeuta', 'Atende pacientes', 'terapeuta',
   ARRAY['pacientes','agenda','estoque','atendimento'], true, 5),
  ('a0000000-0000-4000-8000-000000000006', 'Familiar', 'Acesso limitado a pacientes vinculados', 'familiar',
   ARRAY['cameras'], true, 6)
ON CONFLICT (id) DO NOTHING;
