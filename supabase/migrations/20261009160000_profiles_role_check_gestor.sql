-- =====================================================================
-- Permite o tipo de acesso Gestor (supervisor_plataforma) em profiles.role.
-- Só altera a regra de valores permitidos; não mexe em RLS nem em dados.
-- Substitui, para este fim, a migration antiga 20260924190000_supervisor_plataforma.sql
-- (que depende de funções/tabelas inexistentes no banco atual).
-- =====================================================================

-- Prévia: valores de role que existem hoje (todos precisam estar na lista abaixo)
-- SELECT role, count(*) FROM public.profiles GROUP BY role;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (
    role IS NULL
    OR role IN (
      'admin',
      'supervisor_plataforma',
      'clinica_admin',
      'responsavel_clinica',
      'terapeuta',
      'familiar',
      'therapist'
    )
  );

NOTIFY pgrst, 'reload schema';
