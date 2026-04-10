
-- Add terapeuta_id to pacientes
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS terapeuta_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'terapeuta');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS for user_roles: users can read their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get current user's profile id
CREATE OR REPLACE FUNCTION public.get_user_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Drop existing pacientes policies
DROP POLICY IF EXISTS "Users can view patients in their clinic" ON public.pacientes;
DROP POLICY IF EXISTS "Users can create patients in their clinic" ON public.pacientes;
DROP POLICY IF EXISTS "Users can update patients in their clinic" ON public.pacientes;
DROP POLICY IF EXISTS "Users can delete patients in their clinic" ON public.pacientes;

-- New pacientes policies: admin sees all in clinic, terapeuta sees own + unassigned
CREATE POLICY "View patients" ON public.pacientes FOR SELECT TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR terapeuta_id = public.get_user_profile_id()
      OR terapeuta_id IS NULL
    )
  );

CREATE POLICY "Create patients" ON public.pacientes FOR INSERT TO authenticated
  WITH CHECK (clinica_id = public.get_user_clinica_id());

CREATE POLICY "Update patients" ON public.pacientes FOR UPDATE TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR terapeuta_id = public.get_user_profile_id()
      OR terapeuta_id IS NULL
    )
  );

CREATE POLICY "Delete patients" ON public.pacientes FOR DELETE TO authenticated
  USING (
    clinica_id = public.get_user_clinica_id()
    AND public.has_role(auth.uid(), 'admin')
  );

-- Drop existing sessoes policies
DROP POLICY IF EXISTS "Users can view sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Users can create sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Users can update sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Users can delete sessoes" ON public.sessoes;

-- Sessoes: follow patient visibility
CREATE POLICY "View sessoes" ON public.sessoes FOR SELECT TO authenticated
  USING (paciente_id IN (
    SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()
    AND (public.has_role(auth.uid(), 'admin') OR terapeuta_id = public.get_user_profile_id() OR terapeuta_id IS NULL)
  ));

CREATE POLICY "Create sessoes" ON public.sessoes FOR INSERT TO authenticated
  WITH CHECK (paciente_id IN (
    SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()
    AND (public.has_role(auth.uid(), 'admin') OR terapeuta_id = public.get_user_profile_id() OR terapeuta_id IS NULL)
  ));

CREATE POLICY "Update sessoes" ON public.sessoes FOR UPDATE TO authenticated
  USING (paciente_id IN (
    SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()
    AND (public.has_role(auth.uid(), 'admin') OR terapeuta_id = public.get_user_profile_id() OR terapeuta_id IS NULL)
  ));

CREATE POLICY "Delete sessoes" ON public.sessoes FOR DELETE TO authenticated
  USING (paciente_id IN (
    SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()
    AND public.has_role(auth.uid(), 'admin')
  ));

-- Drop existing objetivos policies
DROP POLICY IF EXISTS "Users can view objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Users can create objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Users can update objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Users can delete objetivos" ON public.objetivos;

-- Objetivos: follow patient visibility
CREATE POLICY "View objetivos" ON public.objetivos FOR SELECT TO authenticated
  USING (paciente_id IN (
    SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()
    AND (public.has_role(auth.uid(), 'admin') OR terapeuta_id = public.get_user_profile_id() OR terapeuta_id IS NULL)
  ));

CREATE POLICY "Create objetivos" ON public.objetivos FOR INSERT TO authenticated
  WITH CHECK (paciente_id IN (
    SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()
    AND (public.has_role(auth.uid(), 'admin') OR terapeuta_id = public.get_user_profile_id() OR terapeuta_id IS NULL)
  ));

CREATE POLICY "Update objetivos" ON public.objetivos FOR UPDATE TO authenticated
  USING (paciente_id IN (
    SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()
    AND (public.has_role(auth.uid(), 'admin') OR terapeuta_id = public.get_user_profile_id() OR terapeuta_id IS NULL)
  ));

CREATE POLICY "Delete objetivos" ON public.objetivos FOR DELETE TO authenticated
  USING (paciente_id IN (
    SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()
    AND public.has_role(auth.uid(), 'admin')
  ));
