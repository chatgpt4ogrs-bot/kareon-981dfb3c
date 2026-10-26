import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export interface Terapeuta {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
}

export function useTerapeutas() {
  const { clinicScope, activeTenantId, profile } = useAuth();
  const unitId = profile?.clinica_id || activeTenantId || undefined;

  return useQuery({
    queryKey: ["terapeutas", clinicScope, unitId],
    queryFn: async () => {
      // Sem clínica ativa não mistura usuários de todos os tenants
      if (clinicScope === null && !unitId) return [];
      if (clinicScope && clinicScope.length === 0) return [];
      const data = await api<any[]>("/profiles");
      const allowed =
        clinicScope !== null
          ? new Set(clinicScope)
          : unitId
          ? new Set([unitId])
          : null;
      return data
        .filter((p: any) => {
          if (!allowed) return false;
          const cid = p.clinic_id || p.clinica_id;
          return cid && allowed.has(cid);
        })
        .map((p: any) => ({
          id: p.id,
          nome: p.nome || p.name,
          email: p.email,
          cargo: p.role || p.cargo,
        })) as Terapeuta[];
    },
  });
}
