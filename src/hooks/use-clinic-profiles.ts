import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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

/** Fetch profiles for the user's clinic. */
export function useClinicProfiles() {
  const { clinicScope } = useAuth();
  return useQuery({
    queryKey: ["clinic-profiles", clinicScope],
    queryFn: async () => {
      if (clinicScope && clinicScope.length === 0) return [];
      const profiles = await api<any[]>("/profiles");
      return profiles.map((p: any) => ({
        id: p.id,
        user_id: p.user_id || p.id,
        nome: p.nome || p.name,
        email: p.email,
        cargo: p.role || p.cargo,
        status: p.status,
        clinica_id: p.clinic_id || p.clinica_id,
        roles: p.role || p.cargo ? [p.role || p.cargo] : [],
      }));
    },
  });
}
