
-- Table: paciente_usuarios (N:N link between pacientes and profiles)
CREATE TABLE public.paciente_usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('terapeuta', 'familiar')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paciente_id, profile_id)
);

ALTER TABLE public.paciente_usuarios ENABLE ROW LEVEL SECURITY;

-- Admin master: full access
CREATE POLICY "Admin master views all paciente_usuarios"
  ON public.paciente_usuarios FOR SELECT TO authenticated
  USING (is_admin_master());

CREATE POLICY "Admin master inserts paciente_usuarios"
  ON public.paciente_usuarios FOR INSERT TO authenticated
  WITH CHECK (is_admin_master());

CREATE POLICY "Admin master updates paciente_usuarios"
  ON public.paciente_usuarios FOR UPDATE TO authenticated
  USING (is_admin_master());

CREATE POLICY "Admin master deletes paciente_usuarios"
  ON public.paciente_usuarios FOR DELETE TO authenticated
  USING (is_admin_master());

-- Clinic staff (admin/responsavel): manage clinic bindings
CREATE POLICY "Clinic staff views paciente_usuarios"
  ON public.paciente_usuarios FOR SELECT TO authenticated
  USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
    AND is_clinica_staff()
  );

CREATE POLICY "Clinic staff inserts paciente_usuarios"
  ON public.paciente_usuarios FOR INSERT TO authenticated
  WITH CHECK (
    paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
    AND is_clinica_staff()
  );

CREATE POLICY "Clinic staff deletes paciente_usuarios"
  ON public.paciente_usuarios FOR DELETE TO authenticated
  USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE clinica_id = get_user_clinica_id())
    AND is_clinica_staff()
  );

-- Terapeutas see their own bindings
CREATE POLICY "Terapeuta views own paciente_usuarios"
  ON public.paciente_usuarios FOR SELECT TO authenticated
  USING (
    profile_id = get_user_profile_id()
    AND has_role(auth.uid(), 'terapeuta')
  );

-- Familiares see their own bindings
CREATE POLICY "Familiar views own paciente_usuarios"
  ON public.paciente_usuarios FOR SELECT TO authenticated
  USING (
    profile_id = get_user_profile_id()
    AND has_role(auth.uid(), 'familiar')
  );

-- ============================================================
-- Table: camera_usuarios (link cameras to familiares)
CREATE TABLE public.camera_usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (camera_id, profile_id)
);

ALTER TABLE public.camera_usuarios ENABLE ROW LEVEL SECURITY;

-- Admin master: full access
CREATE POLICY "Admin master views all camera_usuarios"
  ON public.camera_usuarios FOR SELECT TO authenticated
  USING (is_admin_master());

CREATE POLICY "Admin master inserts camera_usuarios"
  ON public.camera_usuarios FOR INSERT TO authenticated
  WITH CHECK (is_admin_master());

CREATE POLICY "Admin master deletes camera_usuarios"
  ON public.camera_usuarios FOR DELETE TO authenticated
  USING (is_admin_master());

-- Clinic admin: manage camera bindings for their clinic
CREATE POLICY "Clinic admin views camera_usuarios"
  ON public.camera_usuarios FOR SELECT TO authenticated
  USING (
    camera_id IN (SELECT id FROM public.cameras WHERE clinica_id = get_user_clinica_id())
    AND can_manage_clinica()
  );

CREATE POLICY "Clinic admin inserts camera_usuarios"
  ON public.camera_usuarios FOR INSERT TO authenticated
  WITH CHECK (
    camera_id IN (SELECT id FROM public.cameras WHERE clinica_id = get_user_clinica_id())
    AND can_manage_clinica()
  );

CREATE POLICY "Clinic admin deletes camera_usuarios"
  ON public.camera_usuarios FOR DELETE TO authenticated
  USING (
    camera_id IN (SELECT id FROM public.cameras WHERE clinica_id = get_user_clinica_id())
    AND can_manage_clinica()
  );

-- Familiares see their own camera bindings
CREATE POLICY "Familiar views own camera_usuarios"
  ON public.camera_usuarios FOR SELECT TO authenticated
  USING (
    profile_id = get_user_profile_id()
    AND has_role(auth.uid(), 'familiar')
  );

-- ============================================================
-- Add RLS policy: familiares can view pacientes linked to them
CREATE POLICY "Familiar views linked patients"
  ON public.pacientes FOR SELECT TO authenticated
  USING (
    id IN (SELECT paciente_id FROM public.paciente_usuarios WHERE profile_id = get_user_profile_id())
    AND has_role(auth.uid(), 'familiar')
  );

-- Add RLS policy: familiares can view cameras linked to them
CREATE POLICY "Familiar views linked cameras"
  ON public.cameras FOR SELECT TO authenticated
  USING (
    id IN (SELECT camera_id FROM public.camera_usuarios WHERE profile_id = get_user_profile_id())
    AND has_role(auth.uid(), 'familiar')
  );

-- Add RLS policy: familiares can view sessoes of linked patients
CREATE POLICY "Familiar views linked sessoes"
  ON public.sessoes FOR SELECT TO authenticated
  USING (
    paciente_id IN (SELECT paciente_id FROM public.paciente_usuarios WHERE profile_id = get_user_profile_id())
    AND has_role(auth.uid(), 'familiar')
  );

-- Add RLS policy: familiares can view objetivos of linked patients
CREATE POLICY "Familiar views linked objetivos"
  ON public.objetivos FOR SELECT TO authenticated
  USING (
    paciente_id IN (SELECT paciente_id FROM public.paciente_usuarios WHERE profile_id = get_user_profile_id())
    AND has_role(auth.uid(), 'familiar')
  );

-- Add indexes for performance
CREATE INDEX idx_paciente_usuarios_paciente ON public.paciente_usuarios(paciente_id);
CREATE INDEX idx_paciente_usuarios_profile ON public.paciente_usuarios(profile_id);
CREATE INDEX idx_camera_usuarios_camera ON public.camera_usuarios(camera_id);
CREATE INDEX idx_camera_usuarios_profile ON public.camera_usuarios(profile_id);
