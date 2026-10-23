import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ProfessionalSpecialty {
  id: string;
  nome: string;
  area: string;
  principal: boolean;
}

export interface Professional {
  id: string;
  profile_id: string;
  specialty_id: string | null;
  specialty_nome?: string | null;
  specialty_area?: string | null;
  registro_profissional: string | null;
  conselho: string | null;
  titulo: string | null;
  bio: string | null;
  duracao_padrao_minutos: number | null;
  ativo: boolean;
  nome: string;
  email: string;
  telefone?: string | null;
  clinic_id?: string | null;
  role?: string;
  specialties: ProfessionalSpecialty[];
}

export function useProfessionals(filters?: { specialty_id?: string; area?: string }) {
  const qs = new URLSearchParams();
  if (filters?.specialty_id) qs.set("specialty_id", filters.specialty_id);
  if (filters?.area) qs.set("area", filters.area);
  const q = qs.toString();

  return useQuery({
    queryKey: ["professionals", filters],
    queryFn: () => api<Professional[]>(`/professionals${q ? `?${q}` : ""}`),
  });
}

export function useSaveProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<Professional> & {
        profile_id: string;
        specialty_ids?: string[];
        id?: string;
      }
    ) => {
      if (payload.id) {
        return api<Professional>(`/professionals/${payload.id}`, {
          method: "PUT",
          json: payload,
        });
      }
      return api<Professional>("/professionals", { method: "POST", json: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professionals"] });
    },
  });
}
