import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return useQuery({
    queryKey: ["clinic-profiles"],
    queryFn: async () => {
      // Real DB columns: id, name, email, role, status, clinic_id
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, status, clinic_id")
        .order("name");
      if (error) throw error;

      // Map real DB column names → app interface
      return (profiles || []).map((p: any) => ({
        id: p.id,
        user_id: p.id, // id IS the auth user UUID
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
