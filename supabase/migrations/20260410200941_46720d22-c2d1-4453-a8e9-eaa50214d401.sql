
-- Clinicas
CREATE TABLE public.clinicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT DEFAULT 'terapeuta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Pacientes
CREATE TABLE public.pacientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  data_nascimento DATE,
  responsavel TEXT,
  telefone TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- Objetivos terapêuticos
CREATE TABLE public.objetivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'nao_iniciado',
  progresso INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.objetivos ENABLE ROW LEVEL SECURITY;

-- Sessões
CREATE TABLE public.sessoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  terapeuta_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT now(),
  objetivo_sessao TEXT,
  atividades TEXT,
  comportamento TEXT[] DEFAULT '{}',
  engajamento TEXT DEFAULT 'medio',
  progresso TEXT DEFAULT 'estavel',
  observacoes TEXT,
  objetivos_trabalhados UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;

-- Helper: get user's clinica_id
CREATE OR REPLACE FUNCTION public.get_user_clinica_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinica_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Helper: update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers updated_at
CREATE TRIGGER update_clinicas_updated_at BEFORE UPDATE ON public.clinicas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pacientes_updated_at BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_objetivos_updated_at BEFORE UPDATE ON public.objetivos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessoes_updated_at BEFORE UPDATE ON public.sessoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: clinicas
CREATE POLICY "Users can view their clinic" ON public.clinicas FOR SELECT TO authenticated USING (id = public.get_user_clinica_id());
CREATE POLICY "Users can update their clinic" ON public.clinicas FOR UPDATE TO authenticated USING (id = public.get_user_clinica_id());

-- RLS: profiles
CREATE POLICY "Users can view profiles in their clinic" ON public.profiles FOR SELECT TO authenticated USING (clinica_id = public.get_user_clinica_id() OR user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS: pacientes
CREATE POLICY "Users can view patients in their clinic" ON public.pacientes FOR SELECT TO authenticated USING (clinica_id = public.get_user_clinica_id());
CREATE POLICY "Users can create patients in their clinic" ON public.pacientes FOR INSERT TO authenticated WITH CHECK (clinica_id = public.get_user_clinica_id());
CREATE POLICY "Users can update patients in their clinic" ON public.pacientes FOR UPDATE TO authenticated USING (clinica_id = public.get_user_clinica_id());
CREATE POLICY "Users can delete patients in their clinic" ON public.pacientes FOR DELETE TO authenticated USING (clinica_id = public.get_user_clinica_id());

-- RLS: objetivos (via paciente's clinica)
CREATE POLICY "Users can view objetivos" ON public.objetivos FOR SELECT TO authenticated USING (paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()));
CREATE POLICY "Users can create objetivos" ON public.objetivos FOR INSERT TO authenticated WITH CHECK (paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()));
CREATE POLICY "Users can update objetivos" ON public.objetivos FOR UPDATE TO authenticated USING (paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()));
CREATE POLICY "Users can delete objetivos" ON public.objetivos FOR DELETE TO authenticated USING (paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()));

-- RLS: sessoes (via paciente's clinica)
CREATE POLICY "Users can view sessoes" ON public.sessoes FOR SELECT TO authenticated USING (paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()));
CREATE POLICY "Users can create sessoes" ON public.sessoes FOR INSERT TO authenticated WITH CHECK (paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()));
CREATE POLICY "Users can update sessoes" ON public.sessoes FOR UPDATE TO authenticated USING (paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()));
CREATE POLICY "Users can delete sessoes" ON public.sessoes FOR DELETE TO authenticated USING (paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = public.get_user_clinica_id()));
