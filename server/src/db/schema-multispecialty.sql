-- ============================================================
-- Multi-especialidade: medicina, odontologia, psicologia, etc.
-- ============================================================

ALTER TABLE specialties ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'geral';
ALTER TABLE specialties ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE specialties ADD COLUMN IF NOT EXISTS descricao TEXT;

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS conselho TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS bio TEXT;

-- Um profissional pode ter várias especialidades
CREATE TABLE IF NOT EXISTS professional_specialties (
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  principal BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (professional_id, specialty_id)
);

CREATE INDEX IF NOT EXISTS idx_specialties_area ON specialties(area);
CREATE INDEX IF NOT EXISTS idx_specialties_nome ON specialties(nome);

-- Catálogo global de especialidades (organization_id NULL = sistema)
INSERT INTO specialties (id, organization_id, nome, area, codigo, ativo) VALUES
  ('b1000000-0000-4000-8000-000000000001', NULL, 'Clínica Geral', 'medicina', 'MED-CG', true),
  ('b1000000-0000-4000-8000-000000000002', NULL, 'Pediatria', 'medicina', 'MED-PED', true),
  ('b1000000-0000-4000-8000-000000000003', NULL, 'Cardiologia', 'medicina', 'MED-CARD', true),
  ('b1000000-0000-4000-8000-000000000004', NULL, 'Dermatologia', 'medicina', 'MED-DERM', true),
  ('b1000000-0000-4000-8000-000000000005', NULL, 'Ginecologia e Obstetrícia', 'medicina', 'MED-GO', true),
  ('b1000000-0000-4000-8000-000000000006', NULL, 'Ortopedia', 'medicina', 'MED-ORT', true),
  ('b1000000-0000-4000-8000-000000000007', NULL, 'Neurologia', 'medicina', 'MED-NEURO', true),
  ('b1000000-0000-4000-8000-000000000008', NULL, 'Endocrinologia', 'medicina', 'MED-ENDO', true),
  ('b1000000-0000-4000-8000-000000000009', NULL, 'Psiquiatria', 'medicina', 'MED-PSIQ', true),
  ('b1000000-0000-4000-8000-000000000010', NULL, 'Oftalmologia', 'medicina', 'MED-OFT', true),
  ('b1000000-0000-4000-8000-000000000011', NULL, 'Otorrinolaringologia', 'medicina', 'MED-OTO', true),
  ('b1000000-0000-4000-8000-000000000012', NULL, 'Urologia', 'medicina', 'MED-URO', true),
  ('b1000000-0000-4000-8000-000000000013', NULL, 'Gastroenterologia', 'medicina', 'MED-GASTRO', true),
  ('b1000000-0000-4000-8000-000000000014', NULL, 'Odontologia Geral', 'odontologia', 'ODO-GER', true),
  ('b1000000-0000-4000-8000-000000000015', NULL, 'Ortodontia', 'odontologia', 'ODO-ORT', true),
  ('b1000000-0000-4000-8000-000000000016', NULL, 'Endodontia', 'odontologia', 'ODO-ENDO', true),
  ('b1000000-0000-4000-8000-000000000017', NULL, 'Implantodontia', 'odontologia', 'ODO-IMP', true),
  ('b1000000-0000-4000-8000-000000000018', NULL, 'Periodontia', 'odontologia', 'ODO-PER', true),
  ('b1000000-0000-4000-8000-000000000019', NULL, 'Odontopediatria', 'odontologia', 'ODO-PED', true),
  ('b1000000-0000-4000-8000-000000000020', NULL, 'Psicologia Clínica', 'psicologia', 'PSI-CLI', true),
  ('b1000000-0000-4000-8000-000000000021', NULL, 'Psicopedagogia', 'psicologia', 'PSI-PED', true),
  ('b1000000-0000-4000-8000-000000000022', NULL, 'Neuropsicologia', 'psicologia', 'PSI-NEURO', true),
  ('b1000000-0000-4000-8000-000000000023', NULL, 'Terapia Cognitivo-Comportamental', 'psicologia', 'PSI-TCC', true),
  ('b1000000-0000-4000-8000-000000000024', NULL, 'Podologia', 'podologia', 'POD-GER', true),
  ('b1000000-0000-4000-8000-000000000025', NULL, 'Fisioterapia', 'reabilitacao', 'FISIO', true),
  ('b1000000-0000-4000-8000-000000000026', NULL, 'Fonoaudiologia', 'reabilitacao', 'FONO', true),
  ('b1000000-0000-4000-8000-000000000027', NULL, 'Terapia Ocupacional', 'reabilitacao', 'TO', true),
  ('b1000000-0000-4000-8000-000000000028', NULL, 'Nutrição', 'saude', 'NUTRI', true),
  ('b1000000-0000-4000-8000-000000000029', NULL, 'Enfermagem', 'saude', 'ENF', true),
  ('b1000000-0000-4000-8000-000000000030', NULL, 'Estética', 'estetica', 'EST', true),
  ('b1000000-0000-4000-8000-000000000031', NULL, 'Acupuntura', 'integrativa', 'ACU', true),
  ('b1000000-0000-4000-8000-000000000032', NULL, 'Quiropraxia', 'integrativa', 'QUIRO', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  area = EXCLUDED.area,
  codigo = EXCLUDED.codigo,
  ativo = true;

INSERT INTO app_meta (key, value)
VALUES ('schema_version', '{"version": 3, "name": "multi-specialty"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
