
-- Create cameras table
CREATE TABLE public.cameras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  localizacao TEXT,
  stream_url TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'hls' CHECK (tipo IN ('hls', 'mjpeg')),
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;

-- Admin master full access
CREATE POLICY "Admin master views all cameras" ON public.cameras FOR SELECT TO authenticated USING (is_admin_master());
CREATE POLICY "Admin master inserts cameras" ON public.cameras FOR INSERT TO authenticated WITH CHECK (is_admin_master());
CREATE POLICY "Admin master updates cameras" ON public.cameras FOR UPDATE TO authenticated USING (is_admin_master());
CREATE POLICY "Admin master deletes cameras" ON public.cameras FOR DELETE TO authenticated USING (is_admin_master());

-- Clinic staff can view their clinic cameras
CREATE POLICY "Clinic staff views cameras" ON public.cameras FOR SELECT TO authenticated
  USING (clinica_id = get_user_clinica_id() AND (is_clinica_staff() OR has_role(auth.uid(), 'terapeuta')));

-- Clinic admin can manage cameras
CREATE POLICY "Clinic admin inserts cameras" ON public.cameras FOR INSERT TO authenticated
  WITH CHECK (clinica_id = get_user_clinica_id() AND can_manage_clinica());
CREATE POLICY "Clinic admin updates cameras" ON public.cameras FOR UPDATE TO authenticated
  USING (clinica_id = get_user_clinica_id() AND can_manage_clinica());
CREATE POLICY "Clinic admin deletes cameras" ON public.cameras FOR DELETE TO authenticated
  USING (clinica_id = get_user_clinica_id() AND can_manage_clinica());

-- Timestamp trigger
CREATE TRIGGER update_cameras_updated_at BEFORE UPDATE ON public.cameras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
