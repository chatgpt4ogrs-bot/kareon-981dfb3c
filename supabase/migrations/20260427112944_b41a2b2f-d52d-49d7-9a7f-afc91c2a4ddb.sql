-- Pacientes: remover policies do admin master
DROP POLICY IF EXISTS "Admin master views all patients" ON public.pacientes;
DROP POLICY IF EXISTS "Admin master updates any patient" ON public.pacientes;
DROP POLICY IF EXISTS "Admin master deletes any patient" ON public.pacientes;

-- Sessões: remover policies do admin master
DROP POLICY IF EXISTS "Admin master views all sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Admin master manages all sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Admin master deletes sessoes" ON public.sessoes;

-- Objetivos: remover policies do admin master
DROP POLICY IF EXISTS "Admin master views all objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Admin master manages all objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Admin master deletes objetivos" ON public.objetivos;