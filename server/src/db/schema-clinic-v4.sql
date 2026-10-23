-- ============================================================
-- Kareon Clinic OS v4 — financeiro, documentos, lista espera,
-- recorrência, escala, convênios/serviços enriquecidos
-- ============================================================

-- Serviços: já existe; garante colunas
ALTER TABLE services ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS requer_sala BOOLEAN DEFAULT true;

-- Convênios (insurance_plans) enriquecido
ALTER TABLE insurance_plans ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE insurance_plans ADD COLUMN IF NOT EXISTS registro_ans TEXT;
ALTER TABLE insurance_plans ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE insurance_plans ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Escala: já existe professional_schedules; índices
CREATE INDEX IF NOT EXISTS idx_prof_schedules_prof ON professional_schedules(professional_id);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_inicio ON schedule_blocks(inicio);

-- Lista de espera (fila para marcar consulta)
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  professional_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  prioridade INTEGER NOT NULL DEFAULT 0,
  preferencia_periodo TEXT DEFAULT 'qualquer',
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'agendada', 'cancelada', 'expirada')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_unit ON waitlist(unit_id, status);

-- Recorrência de agenda
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_group_id UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS valor NUMERIC(12,2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_appointments_recurrence ON appointments(recurrence_group_id);

-- Financeiro
CREATE TABLE IF NOT EXISTS financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'caixa' CHECK (tipo IN ('caixa', 'banco', 'outros')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  insurance_id UUID REFERENCES insurance_plans(id) ON DELETE SET NULL,
  numero TEXT,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_final NUMERIC(12,2) NOT NULL DEFAULT 0,
  tipo_pagamento TEXT NOT NULL DEFAULT 'particular'
    CHECK (tipo_pagamento IN ('particular', 'convenio', 'cortesia')),
  status TEXT NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'parcial', 'paga', 'cancelada', 'estornada')),
  vencimento DATE,
  competencia DATE DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_unit_status ON invoices(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
  valor NUMERIC(12,2) NOT NULL,
  forma TEXT NOT NULL DEFAULT 'dinheiro'
    CHECK (forma IN ('dinheiro', 'pix', 'debito', 'credito', 'transferencia', 'convenio', 'outros')),
  pago_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  recibo_numero TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_unit_date ON payments(unit_id, pago_em);

CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
  data_ref DATE NOT NULL,
  total_entradas NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_saidas NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo NUMERIC(12,2) NOT NULL DEFAULT 0,
  detalhes JSONB DEFAULT '{}',
  closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unit_id, data_ref, account_id)
);

-- Documentos clínicos (enriquece documents)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'emitido';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS numero TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_patient ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_tipo ON documents(tipo);

-- Templates padrão (sistema)
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  corpo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO document_templates (id, organization_id, tipo, nome, corpo) VALUES
  ('c1000000-0000-4000-8000-000000000001', NULL, 'atestado', 'Atestado médico',
   'Atesto para os devidos fins que o(a) paciente {{paciente_nome}}, portador(a) do documento {{paciente_doc}}, esteve sob meus cuidados profissionais em {{data}}, necessitando de afastamento de suas atividades por {{dias}} dia(s), a partir de {{data_inicio}}.\n\nCID: {{cid}}\n\n{{cidade}}, {{data_extenso}}.\n\n_________________________________\n{{profissional_nome}}\n{{conselho}} {{registro}}'),
  ('c1000000-0000-4000-8000-000000000002', NULL, 'receita', 'Receita simples',
   'Paciente: {{paciente_nome}}\nData: {{data}}\n\nPrescrição:\n{{prescricao}}\n\nOrientações: {{orientacoes}}\n\n_________________________________\n{{profissional_nome}}\n{{conselho}} {{registro}}'),
  ('c1000000-0000-4000-8000-000000000003', NULL, 'encaminhamento', 'Encaminhamento',
   'Encaminho o(a) paciente {{paciente_nome}} para avaliação em {{especialidade_destino}}.\n\nMotivo: {{motivo}}\nHipótese / Observações: {{observacoes}}\n\n{{cidade}}, {{data_extenso}}.\n\n_________________________________\n{{profissional_nome}}\n{{conselho}} {{registro}}'),
  ('c1000000-0000-4000-8000-000000000004', NULL, 'pedido_exame', 'Pedido de exame',
   'Solicito para o(a) paciente {{paciente_nome}} a realização do(s) seguinte(s) exame(s):\n\n{{exames}}\n\nIndicação clínica: {{indicacao}}\n\n{{cidade}}, {{data_extenso}}.\n\n_________________________________\n{{profissional_nome}}\n{{conselho}} {{registro}}')
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  corpo = EXCLUDED.corpo,
  ativo = true;

-- Notificações: já existe; índice
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id, lida);

-- Conflitos de agenda apenas dentro da mesma clínica (unit_id)
CREATE OR REPLACE FUNCTION prevent_appointment_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.professional_profile_id IS NOT NULL AND NEW.status NOT IN ('cancelado', 'faltou', 'ausente') THEN
    IF EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id IS DISTINCT FROM NEW.id
        AND a.unit_id = NEW.unit_id
        AND a.professional_profile_id = NEW.professional_profile_id
        AND a.status NOT IN ('cancelado', 'faltou', 'ausente')
        AND a.inicio < NEW.fim
        AND a.fim > NEW.inicio
    ) THEN
      RAISE EXCEPTION 'Conflito de horário para o profissional nesta clínica';
    END IF;
  END IF;
  IF NEW.room_id IS NOT NULL AND NEW.status NOT IN ('cancelado', 'faltou', 'ausente') THEN
    IF EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id IS DISTINCT FROM NEW.id
        AND a.unit_id = NEW.unit_id
        AND a.room_id = NEW.room_id
        AND a.status NOT IN ('cancelado', 'faltou', 'ausente')
        AND a.inicio < NEW.fim
        AND a.fim > NEW.inicio
    ) THEN
      RAISE EXCEPTION 'Conflito de horário para a sala nesta clínica';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '{"version": 4, "name": "finance-docs-ops"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
