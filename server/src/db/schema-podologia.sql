-- Ficha clínica específica de podologia (anamnese / hábitos / condições)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ficha_podologia JSONB DEFAULT '{}'::jsonb;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_pacientes_ficha_podologia
  ON pacientes USING GIN (ficha_podologia);
