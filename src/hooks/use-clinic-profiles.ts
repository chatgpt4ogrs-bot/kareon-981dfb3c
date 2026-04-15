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

/** Fetch profiles with their roles for the user's clinic */
export function useClinicProfiles() {
  return useQuery({
    queryKey: ["clinic-profiles"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, nome, email, cargo, status, clinica_id")
        .order("nome");
      if (error) throw error;

      // Fetch roles for these profiles
      const userIds = (profiles || []).map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap: Record<string, string[]> = {};
      (roles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      return (profiles || []).map((p) => ({
        ...p,
        roles: roleMap[p.user_id] || [],
      }));
    },
  });
}
