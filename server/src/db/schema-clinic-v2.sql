-- ============================================================
-- Kareon Clinic OS — schema v2 (gestão completa de clínicas)
-- Idempotente: pode rodar após o schema base.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organização (multi-tenant raiz)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  status TEXT NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unidades (mapeadas também via clinics existentes)
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS horario_funcionamento JSONB DEFAULT '{}';

-- Salas / consultórios
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  tipo TEXT NOT NULL DEFAULT 'consultorio',
  capacidade INTEGER DEFAULT 1,
  equipamentos TEXT[] DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Especialidades
CREATE TABLE IF NOT EXISTS specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serviços / procedimentos da clínica
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  codigo TEXT,
  duracao_minutos INTEGER NOT NULL DEFAULT 30,
  valor NUMERIC(12,2) DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dados extras do profissional (profile = usuário)
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  registro_profissional TEXT,
  duracao_padrao_minutos INTEGER DEFAULT 30,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS professional_units (
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, unit_id)
);

CREATE TABLE IF NOT EXISTS professional_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  motivo TEXT,
  tipo TEXT NOT NULL DEFAULT 'bloqueio',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paciente enriquecido
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS sexo TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS endereco_rua TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS endereco_cidade TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS endereco_uf TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS endereco_cep TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS emergencia_nome TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS emergencia_telefone TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS emergencia_parentesco TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS convenio_plano TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS convenio_numero TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS alergias TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS alertas_clinicos TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_codigo ON pacientes(clinica_id, codigo) WHERE codigo IS NOT NULL;

CREATE TABLE IF NOT EXISTS insurance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agendamentos (núcleo operacional)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  professional_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'agendado'
    CHECK (status IN (
      'agendado',
      'aguardando_checkin',
      'aguardando_atendimento',
      'chamado',
      'em_atendimento',
      'finalizado',
      'ausente',
      'cancelado',
      'faltou'
    )),
  modalidade TEXT NOT NULL DEFAULT 'presencial'
    CHECK (modalidade IN ('presencial', 'teleconsulta', 'retorno', 'encaixe')),
  tipo_pagamento TEXT DEFAULT 'particular',
  convenio_id UUID REFERENCES insurance_plans(id) ON DELETE SET NULL,
  prioridade INTEGER NOT NULL DEFAULT 0,
  prioridade_justificativa TEXT,
  checkin_at TIMESTAMPTZ,
  chamado_at TIMESTAMPTZ,
  atendimento_inicio_at TIMESTAMPTZ,
  atendimento_fim_at TIMESTAMPTZ,
  cancel_reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_unit_inicio ON appointments(unit_id, inicio);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_profile_id, inicio);

CREATE TABLE IF NOT EXISTS appointment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fila / sala de espera (visão operacional; espelha appointment)
CREATE TABLE IF NOT EXISTS waiting_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  professional_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aguardando_atendimento',
  senha TEXT,
  prioridade INTEGER NOT NULL DEFAULT 0,
  posicao INTEGER,
  checkin_at TIMESTAMPTZ,
  chamado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waiting_unit_status ON waiting_queue(unit_id, status);

-- Encontros clínicos (prontuário vinculado ao agendamento)
CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  professional_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'em_andamento', 'finalizado')),
  motivo_consulta TEXT,
  queixa_principal TEXT,
  anamnese TEXT,
  historico_medico TEXT,
  historico_familiar TEXT,
  alergias TEXT,
  medicamentos_uso TEXT,
  sinais_vitais JSONB DEFAULT '{}',
  exame_fisico TEXT,
  avaliacao TEXT,
  hipoteses TEXT,
  diagnosticos TEXT,
  diagnostico_cid TEXT,
  conduta TEXT,
  plano_terapeutico TEXT,
  exames_solicitados TEXT,
  prescricoes TEXT,
  encaminhamentos TEXT,
  orientacoes TEXT,
  retorno_sugerido TEXT,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinical_addenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  file_path TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  corpo TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  tipo TEXT DEFAULT 'sistema',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Impede overlap simples de profissional (mesmo profile, horários cruzados, não cancelados)
CREATE OR REPLACE FUNCTION prevent_appointment_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.professional_profile_id IS NOT NULL AND NEW.status NOT IN ('cancelado', 'faltou', 'ausente') THEN
    IF EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id IS DISTINCT FROM NEW.id
        AND a.professional_profile_id = NEW.professional_profile_id
        AND a.status NOT IN ('cancelado', 'faltou', 'ausente')
        AND a.inicio < NEW.fim
        AND a.fim > NEW.inicio
    ) THEN
      RAISE EXCEPTION 'Conflito de horário para o profissional';
    END IF;
  END IF;
  IF NEW.room_id IS NOT NULL AND NEW.status NOT IN ('cancelado', 'faltou', 'ausente') THEN
    IF EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id IS DISTINCT FROM NEW.id
        AND a.room_id = NEW.room_id
        AND a.status NOT IN ('cancelado', 'faltou', 'ausente')
        AND a.inicio < NEW.fim
        AND a.fim > NEW.inicio
    ) THEN
      RAISE EXCEPTION 'Conflito de horário para a sala';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointment_conflict ON appointments;
CREATE TRIGGER trg_appointment_conflict
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION prevent_appointment_conflict();

-- Código automático de paciente
CREATE OR REPLACE FUNCTION assign_patient_code()
RETURNS TRIGGER AS $$
DECLARE
  seq INT;
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    SELECT COUNT(*) + 1 INTO seq FROM pacientes WHERE clinica_id = NEW.clinica_id;
    NEW.codigo := 'PAC-' || LPAD(seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_code ON pacientes;
CREATE TRIGGER trg_patient_code
  BEFORE INSERT ON pacientes
  FOR EACH ROW EXECUTE FUNCTION assign_patient_code();

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '{"version": 2, "name": "clinic-os"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
