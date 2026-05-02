
-- =====================================================================
-- STEP 1: Create private schema and move helper functions out of API
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS private;

-- Move helper functions to private schema (no longer exposed by PostgREST)
ALTER FUNCTION public.is_admin_master() SET SCHEMA private;
ALTER FUNCTION public.is_clinica_staff() SET SCHEMA private;
ALTER FUNCTION public.can_manage_clinica() SET SCHEMA private;
ALTER FUNCTION public.get_user_clinica_id() SET SCHEMA private;
ALTER FUNCTION public.get_user_profile_id() SET SCHEMA private;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;

-- Allow authenticated role to USE the schema and EXECUTE the functions
-- (needed because RLS policies invoke them in the user's session context)
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_master() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_clinica_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_clinica() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_clinica_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- =====================================================================
-- STEP 2: Recreate all RLS policies with schema-qualified function calls
-- =====================================================================

-- ----- camera_usuarios -----
DROP POLICY IF EXISTS "Admin master deletes camera_usuarios" ON public.camera_usuarios;
DROP POLICY IF EXISTS "Admin master inserts camera_usuarios" ON public.camera_usuarios;
DROP POLICY IF EXISTS "Admin master views all camera_usuarios" ON public.camera_usuarios;
DROP POLICY IF EXISTS "Clinic admin deletes camera_usuarios" ON public.camera_usuarios;
DROP POLICY IF EXISTS "Clinic admin inserts camera_usuarios" ON public.camera_usuarios;
DROP POLICY IF EXISTS "Clinic admin views camera_usuarios" ON public.camera_usuarios;
DROP POLICY IF EXISTS "Familiar views own camera_usuarios" ON public.camera_usuarios;

CREATE POLICY "Admin master deletes camera_usuarios" ON public.camera_usuarios FOR DELETE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master inserts camera_usuarios" ON public.camera_usuarios FOR INSERT TO authenticated WITH CHECK (private.is_admin_master());
CREATE POLICY "Admin master views all camera_usuarios" ON public.camera_usuarios FOR SELECT TO authenticated USING (private.is_admin_master());
CREATE POLICY "Clinic admin deletes camera_usuarios" ON public.camera_usuarios FOR DELETE TO authenticated USING ((camera_id IN (SELECT cameras.id FROM cameras WHERE cameras.clinica_id = private.get_user_clinica_id())) AND private.can_manage_clinica());
CREATE POLICY "Clinic admin inserts camera_usuarios" ON public.camera_usuarios FOR INSERT TO authenticated WITH CHECK ((camera_id IN (SELECT cameras.id FROM cameras WHERE cameras.clinica_id = private.get_user_clinica_id())) AND private.can_manage_clinica());
CREATE POLICY "Clinic admin views camera_usuarios" ON public.camera_usuarios FOR SELECT TO authenticated USING ((camera_id IN (SELECT cameras.id FROM cameras WHERE cameras.clinica_id = private.get_user_clinica_id())) AND private.can_manage_clinica());
CREATE POLICY "Familiar views own camera_usuarios" ON public.camera_usuarios FOR SELECT TO authenticated USING ((profile_id = private.get_user_profile_id()) AND private.has_role(auth.uid(), 'familiar'::public.app_role));

-- ----- cameras -----
DROP POLICY IF EXISTS "Admin master deletes cameras" ON public.cameras;
DROP POLICY IF EXISTS "Admin master inserts cameras" ON public.cameras;
DROP POLICY IF EXISTS "Admin master updates cameras" ON public.cameras;
DROP POLICY IF EXISTS "Admin master views all cameras" ON public.cameras;
DROP POLICY IF EXISTS "Clinic admin deletes cameras" ON public.cameras;
DROP POLICY IF EXISTS "Clinic admin inserts cameras" ON public.cameras;
DROP POLICY IF EXISTS "Clinic admin updates cameras" ON public.cameras;
DROP POLICY IF EXISTS "Clinic staff views cameras" ON public.cameras;
DROP POLICY IF EXISTS "Familiar views linked cameras" ON public.cameras;

CREATE POLICY "Admin master deletes cameras" ON public.cameras FOR DELETE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master inserts cameras" ON public.cameras FOR INSERT TO authenticated WITH CHECK (private.is_admin_master());
CREATE POLICY "Admin master updates cameras" ON public.cameras FOR UPDATE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master views all cameras" ON public.cameras FOR SELECT TO authenticated USING (private.is_admin_master());
CREATE POLICY "Clinic admin deletes cameras" ON public.cameras FOR DELETE TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND private.can_manage_clinica());
CREATE POLICY "Clinic admin inserts cameras" ON public.cameras FOR INSERT TO authenticated WITH CHECK ((clinica_id = private.get_user_clinica_id()) AND private.can_manage_clinica());
CREATE POLICY "Clinic admin updates cameras" ON public.cameras FOR UPDATE TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND private.can_manage_clinica());
CREATE POLICY "Clinic staff views cameras" ON public.cameras FOR SELECT TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND (private.is_clinica_staff() OR private.has_role(auth.uid(), 'terapeuta'::public.app_role)));
CREATE POLICY "Familiar views linked cameras" ON public.cameras FOR SELECT TO authenticated USING ((id IN (SELECT camera_usuarios.camera_id FROM camera_usuarios WHERE camera_usuarios.profile_id = private.get_user_profile_id())) AND private.has_role(auth.uid(), 'familiar'::public.app_role));

-- ----- clinicas -----
DROP POLICY IF EXISTS "Admin master can delete clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Admin master can insert clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Admin master can update any clinic" ON public.clinicas;
DROP POLICY IF EXISTS "Admin master views all clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Clinic managers can update their clinic" ON public.clinicas;
DROP POLICY IF EXISTS "Users view own clinic" ON public.clinicas;

CREATE POLICY "Admin master can delete clinics" ON public.clinicas FOR DELETE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master can insert clinics" ON public.clinicas FOR INSERT TO authenticated WITH CHECK (private.is_admin_master());
CREATE POLICY "Admin master can update any clinic" ON public.clinicas FOR UPDATE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master views all clinics" ON public.clinicas FOR SELECT TO authenticated USING (private.is_admin_master());
CREATE POLICY "Clinic managers can update their clinic" ON public.clinicas FOR UPDATE TO authenticated USING ((id = private.get_user_clinica_id()) AND private.can_manage_clinica());
CREATE POLICY "Users view own clinic" ON public.clinicas FOR SELECT TO authenticated USING (id = private.get_user_clinica_id());

-- ----- evento_terapeutas -----
DROP POLICY IF EXISTS "Admin master deletes evento_terapeutas" ON public.evento_terapeutas;
DROP POLICY IF EXISTS "Admin master inserts evento_terapeutas" ON public.evento_terapeutas;
DROP POLICY IF EXISTS "Admin master views all evento_terapeutas" ON public.evento_terapeutas;
DROP POLICY IF EXISTS "Staff/owner deletes evento_terapeutas" ON public.evento_terapeutas;
DROP POLICY IF EXISTS "Staff/owner inserts evento_terapeutas" ON public.evento_terapeutas;
DROP POLICY IF EXISTS "View evento_terapeutas if can view evento" ON public.evento_terapeutas;

CREATE POLICY "Admin master deletes evento_terapeutas" ON public.evento_terapeutas FOR DELETE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master inserts evento_terapeutas" ON public.evento_terapeutas FOR INSERT TO authenticated WITH CHECK (private.is_admin_master());
CREATE POLICY "Admin master views all evento_terapeutas" ON public.evento_terapeutas FOR SELECT TO authenticated USING (private.is_admin_master());
CREATE POLICY "Staff/owner deletes evento_terapeutas" ON public.evento_terapeutas FOR DELETE TO authenticated USING (evento_id IN (SELECT eventos.id FROM eventos WHERE (eventos.clinica_id = private.get_user_clinica_id()) AND (private.is_clinica_staff() OR ((eventos.criado_por = private.get_user_profile_id()) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role)))));
CREATE POLICY "Staff/owner inserts evento_terapeutas" ON public.evento_terapeutas FOR INSERT TO authenticated WITH CHECK (evento_id IN (SELECT eventos.id FROM eventos WHERE (eventos.clinica_id = private.get_user_clinica_id()) AND (private.is_clinica_staff() OR ((eventos.criado_por = private.get_user_profile_id()) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role)))));
CREATE POLICY "View evento_terapeutas if can view evento" ON public.evento_terapeutas FOR SELECT TO authenticated USING (evento_id IN (SELECT eventos.id FROM eventos WHERE ((eventos.clinica_id = private.get_user_clinica_id()) AND private.is_clinica_staff()) OR ((eventos.clinica_id = private.get_user_clinica_id()) AND (eventos.criado_por = private.get_user_profile_id()) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role)) OR ((eventos.paciente_id IN (SELECT paciente_usuarios.paciente_id FROM paciente_usuarios WHERE paciente_usuarios.profile_id = private.get_user_profile_id())) AND private.has_role(auth.uid(), 'familiar'::public.app_role))));

-- ----- eventos -----
DROP POLICY IF EXISTS "Admin master deletes eventos" ON public.eventos;
DROP POLICY IF EXISTS "Admin master inserts eventos" ON public.eventos;
DROP POLICY IF EXISTS "Admin master updates eventos" ON public.eventos;
DROP POLICY IF EXISTS "Admin master views all eventos" ON public.eventos;
DROP POLICY IF EXISTS "Clinic managers delete clinic eventos" ON public.eventos;
DROP POLICY IF EXISTS "Clinic managers update clinic eventos" ON public.eventos;
DROP POLICY IF EXISTS "Clinic managers view clinic eventos" ON public.eventos;
DROP POLICY IF EXISTS "Familiar views linked eventos" ON public.eventos;
DROP POLICY IF EXISTS "Staff creates eventos" ON public.eventos;
DROP POLICY IF EXISTS "Terapeuta deletes own eventos" ON public.eventos;
DROP POLICY IF EXISTS "Terapeuta updates own eventos" ON public.eventos;
DROP POLICY IF EXISTS "Terapeuta views own eventos" ON public.eventos;

CREATE POLICY "Admin master deletes eventos" ON public.eventos FOR DELETE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master inserts eventos" ON public.eventos FOR INSERT TO authenticated WITH CHECK (private.is_admin_master());
CREATE POLICY "Admin master updates eventos" ON public.eventos FOR UPDATE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master views all eventos" ON public.eventos FOR SELECT TO authenticated USING (private.is_admin_master());
CREATE POLICY "Clinic managers delete clinic eventos" ON public.eventos FOR DELETE TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND private.can_manage_clinica());
CREATE POLICY "Clinic managers update clinic eventos" ON public.eventos FOR UPDATE TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND private.can_manage_clinica());
CREATE POLICY "Clinic managers view clinic eventos" ON public.eventos FOR SELECT TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND private.is_clinica_staff());
CREATE POLICY "Familiar views linked eventos" ON public.eventos FOR SELECT TO authenticated USING ((paciente_id IN (SELECT paciente_usuarios.paciente_id FROM paciente_usuarios WHERE paciente_usuarios.profile_id = private.get_user_profile_id())) AND private.has_role(auth.uid(), 'familiar'::public.app_role));
CREATE POLICY "Staff creates eventos" ON public.eventos FOR INSERT TO authenticated WITH CHECK ((clinica_id = private.get_user_clinica_id()) AND (private.is_clinica_staff() OR private.has_role(auth.uid(), 'terapeuta'::public.app_role)));
CREATE POLICY "Terapeuta deletes own eventos" ON public.eventos FOR DELETE TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND (criado_por = private.get_user_profile_id()) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role));
CREATE POLICY "Terapeuta updates own eventos" ON public.eventos FOR UPDATE TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND (criado_por = private.get_user_profile_id()) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role));
CREATE POLICY "Terapeuta views own eventos" ON public.eventos FOR SELECT TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND (criado_por = private.get_user_profile_id()) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role));

-- ----- objetivos -----
DROP POLICY IF EXISTS "Clinic managers view clinic objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Familiar views linked objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Managers delete objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Managers update objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Staff creates objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Terapeuta updates own objetivos" ON public.objetivos;
DROP POLICY IF EXISTS "Terapeuta views own objetivos" ON public.objetivos;

CREATE POLICY "Clinic managers view clinic objetivos" ON public.objetivos FOR SELECT TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND private.can_manage_clinica());
CREATE POLICY "Familiar views linked objetivos" ON public.objetivos FOR SELECT TO authenticated USING ((paciente_id IN (SELECT paciente_usuarios.paciente_id FROM paciente_usuarios WHERE paciente_usuarios.profile_id = private.get_user_profile_id())) AND private.has_role(auth.uid(), 'familiar'::public.app_role));
CREATE POLICY "Managers delete objetivos" ON public.objetivos FOR DELETE TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND private.can_manage_clinica());
CREATE POLICY "Managers update objetivos" ON public.objetivos FOR UPDATE TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND private.can_manage_clinica());
CREATE POLICY "Staff creates objetivos" ON public.objetivos FOR INSERT TO authenticated WITH CHECK ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND (private.can_manage_clinica() OR private.has_role(auth.uid(), 'terapeuta'::public.app_role)));
CREATE POLICY "Terapeuta updates own objetivos" ON public.objetivos FOR UPDATE TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE (pacientes.clinica_id = private.get_user_clinica_id()) AND ((pacientes.terapeuta_id = private.get_user_profile_id()) OR (pacientes.terapeuta_id IS NULL)))) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role));
CREATE POLICY "Terapeuta views own objetivos" ON public.objetivos FOR SELECT TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE (pacientes.clinica_id = private.get_user_clinica_id()) AND ((pacientes.terapeuta_id = private.get_user_profile_id()) OR (pacientes.terapeuta_id IS NULL)))) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role));

-- ----- paciente_usuarios -----
DROP POLICY IF EXISTS "Admin master deletes paciente_usuarios" ON public.paciente_usuarios;
DROP POLICY IF EXISTS "Admin master inserts paciente_usuarios" ON public.paciente_usuarios;
DROP POLICY IF EXISTS "Admin master updates paciente_usuarios" ON public.paciente_usuarios;
DROP POLICY IF EXISTS "Admin master views all paciente_usuarios" ON public.paciente_usuarios;
DROP POLICY IF EXISTS "Clinic staff deletes paciente_usuarios" ON public.paciente_usuarios;
DROP POLICY IF EXISTS "Clinic staff inserts paciente_usuarios" ON public.paciente_usuarios;
DROP POLICY IF EXISTS "Clinic staff views paciente_usuarios" ON public.paciente_usuarios;
DROP POLICY IF EXISTS "Familiar views own paciente_usuarios" ON public.paciente_usuarios;
DROP POLICY IF EXISTS "Terapeuta views own paciente_usuarios" ON public.paciente_usuarios;

CREATE POLICY "Admin master deletes paciente_usuarios" ON public.paciente_usuarios FOR DELETE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master inserts paciente_usuarios" ON public.paciente_usuarios FOR INSERT TO authenticated WITH CHECK (private.is_admin_master());
CREATE POLICY "Admin master updates paciente_usuarios" ON public.paciente_usuarios FOR UPDATE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master views all paciente_usuarios" ON public.paciente_usuarios FOR SELECT TO authenticated USING (private.is_admin_master());
CREATE POLICY "Clinic staff deletes paciente_usuarios" ON public.paciente_usuarios FOR DELETE TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND private.is_clinica_staff());
CREATE POLICY "Clinic staff inserts paciente_usuarios" ON public.paciente_usuarios FOR INSERT TO authenticated WITH CHECK ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND private.is_clinica_staff());
CREATE POLICY "Clinic staff views paciente_usuarios" ON public.paciente_usuarios FOR SELECT TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND private.is_clinica_staff());
CREATE POLICY "Familiar views own paciente_usuarios" ON public.paciente_usuarios FOR SELECT TO authenticated USING ((profile_id = private.get_user_profile_id()) AND private.has_role(auth.uid(), 'familiar'::public.app_role));
CREATE POLICY "Terapeuta views own paciente_usuarios" ON public.paciente_usuarios FOR SELECT TO authenticated USING ((profile_id = private.get_user_profile_id()) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role));

-- ----- pacientes -----
DROP POLICY IF EXISTS "Clinic staff views clinic patients" ON public.pacientes;
DROP POLICY IF EXISTS "Familiar views linked patients" ON public.pacientes;
DROP POLICY IF EXISTS "Managers delete patients" ON public.pacientes;
DROP POLICY IF EXISTS "Managers update patients" ON public.pacientes;
DROP POLICY IF EXISTS "Staff creates patients" ON public.pacientes;
DROP POLICY IF EXISTS "Terapeuta updates own patients" ON public.pacientes;
DROP POLICY IF EXISTS "Terapeuta views own patients" ON public.pacientes;

CREATE POLICY "Clinic staff views clinic patients" ON public.pacientes FOR SELECT TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND private.is_clinica_staff());
CREATE POLICY "Familiar views linked patients" ON public.pacientes FOR SELECT TO authenticated USING ((id IN (SELECT paciente_usuarios.paciente_id FROM paciente_usuarios WHERE paciente_usuarios.profile_id = private.get_user_profile_id())) AND private.has_role(auth.uid(), 'familiar'::public.app_role));
CREATE POLICY "Managers delete patients" ON public.pacientes FOR DELETE TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND private.can_manage_clinica());
CREATE POLICY "Managers update patients" ON public.pacientes FOR UPDATE TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND private.can_manage_clinica());
CREATE POLICY "Staff creates patients" ON public.pacientes FOR INSERT TO authenticated WITH CHECK ((clinica_id = private.get_user_clinica_id()) AND (private.is_clinica_staff() OR private.has_role(auth.uid(), 'terapeuta'::public.app_role)));
CREATE POLICY "Terapeuta updates own patients" ON public.pacientes FOR UPDATE TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND ((terapeuta_id = private.get_user_profile_id()) OR (terapeuta_id IS NULL)) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role));
CREATE POLICY "Terapeuta views own patients" ON public.pacientes FOR SELECT TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND ((terapeuta_id = private.get_user_profile_id()) OR (terapeuta_id IS NULL)) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role));

-- ----- profiles -----
DROP POLICY IF EXISTS "Admin master updates any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin master views all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Clinica admin updates clinic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view clinic profiles" ON public.profiles;

CREATE POLICY "Admin master updates any profile" ON public.profiles FOR UPDATE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master views all profiles" ON public.profiles FOR SELECT TO authenticated USING (private.is_admin_master());
CREATE POLICY "Clinica admin updates clinic profiles" ON public.profiles FOR UPDATE TO authenticated USING ((clinica_id = private.get_user_clinica_id()) AND private.can_manage_clinica());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users view clinic profiles" ON public.profiles FOR SELECT TO authenticated USING ((clinica_id = private.get_user_clinica_id()) OR (user_id = auth.uid()));

-- ----- sessoes -----
DROP POLICY IF EXISTS "Clinic managers view clinic sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Familiar views linked sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Managers delete sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Managers update sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Staff creates sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Terapeuta updates own sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Terapeuta views own sessoes" ON public.sessoes;

CREATE POLICY "Clinic managers view clinic sessoes" ON public.sessoes FOR SELECT TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND private.can_manage_clinica());
CREATE POLICY "Familiar views linked sessoes" ON public.sessoes FOR SELECT TO authenticated USING ((paciente_id IN (SELECT paciente_usuarios.paciente_id FROM paciente_usuarios WHERE paciente_usuarios.profile_id = private.get_user_profile_id())) AND private.has_role(auth.uid(), 'familiar'::public.app_role));
CREATE POLICY "Managers delete sessoes" ON public.sessoes FOR DELETE TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND private.can_manage_clinica());
CREATE POLICY "Managers update sessoes" ON public.sessoes FOR UPDATE TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND private.can_manage_clinica());
CREATE POLICY "Staff creates sessoes" ON public.sessoes FOR INSERT TO authenticated WITH CHECK ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE pacientes.clinica_id = private.get_user_clinica_id())) AND (private.can_manage_clinica() OR private.has_role(auth.uid(), 'terapeuta'::public.app_role)));
CREATE POLICY "Terapeuta updates own sessoes" ON public.sessoes FOR UPDATE TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE (pacientes.clinica_id = private.get_user_clinica_id()) AND ((pacientes.terapeuta_id = private.get_user_profile_id()) OR (pacientes.terapeuta_id IS NULL)))) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role));
CREATE POLICY "Terapeuta views own sessoes" ON public.sessoes FOR SELECT TO authenticated USING ((paciente_id IN (SELECT pacientes.id FROM pacientes WHERE (pacientes.clinica_id = private.get_user_clinica_id()) AND ((pacientes.terapeuta_id = private.get_user_profile_id()) OR (pacientes.terapeuta_id IS NULL)))) AND private.has_role(auth.uid(), 'terapeuta'::public.app_role));

-- ----- user_roles -----
DROP POLICY IF EXISTS "Admin master deletes roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin master manages roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin master updates roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin master views all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Clinica admin manages clinic roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;

CREATE POLICY "Admin master deletes roles" ON public.user_roles FOR DELETE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master manages roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (private.is_admin_master());
CREATE POLICY "Admin master updates roles" ON public.user_roles FOR UPDATE TO authenticated USING (private.is_admin_master());
CREATE POLICY "Admin master views all roles" ON public.user_roles FOR SELECT TO authenticated USING (private.is_admin_master());
CREATE POLICY "Clinica admin manages clinic roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (private.can_manage_clinica() AND (role <> 'admin'::public.app_role) AND (user_id IN (SELECT p.user_id FROM profiles p WHERE p.clinica_id = private.get_user_clinica_id())));
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
