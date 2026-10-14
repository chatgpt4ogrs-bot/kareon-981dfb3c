import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ClinicProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cargo: string | null;
  status: string;
  clinica_id: string | null;
}

/** Fetch profiles for the user's clinic. Maps real DB columns to app interface. */
export function useClinicProfiles() {
  const { clinicScope, canManageUsers } = useAuth();
  return useQuery({
    queryKey: ["clinic-profiles", clinicScope],
    queryFn: async () => {
      if (clinicScope && clinicScope.length === 0) return [];

      if (canManageUsers) {
        try {
          const { data, error } = await supabase.functions.invoke("manage-clinic-user", {
            body: { action: "list" },
          });
          if (!error && data?.profiles) {
            return data.profiles.map((p: any) => ({
              id: p.id,
              user_id: p.id,
              nome: p.name || p.nome || p.email,
              email: p.email,
              cargo: p.role || p.cargo,
              status: p.status,
              clinica_id: p.clinic_id || p.clinica_id,
              roles: p.role ? [p.role] : [],
            }));
          }
        } catch (e) {
          console.warn("Edge function list profiles failed, falling back:", e);
        }
      }

      let q = (supabase.from("profiles") as any)
        .select("id, name, email, role, status, clinic_id")
        .order("name");

      if (clinicScope) {
        q = q.in("clinic_id", clinicScope);
      }

      const { data: profiles, error } = await q;
      if (error) throw error;

      return (profiles || []).map((p: any) => ({
        id: p.id,
        user_id: p.id,
        nome: p.name,
        email: p.email,
        cargo: p.role,
        status: p.status,
        clinica_id: p.clinic_id,
        roles: p.role ? [p.role] : [],
      }));
    },
  });
}
