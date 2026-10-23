import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Encounter {
  id: string;
  appointment_id: string | null;
  patient_id: string;
  unit_id: string;
  professional_profile_id: string | null;
  status: string;
  motivo_consulta?: string | null;
  queixa_principal?: string | null;
  anamnese?: string | null;
  historico_medico?: string | null;
  historico_familiar?: string | null;
  alergias?: string | null;
  medicamentos_uso?: string | null;
  sinais_vitais?: Record<string, string>;
  exame_fisico?: string | null;
  avaliacao?: string | null;
  hipoteses?: string | null;
  diagnosticos?: string | null;
  diagnostico_cid?: string | null;
  conduta?: string | null;
  plano_terapeutico?: string | null;
  exames_solicitados?: string | null;
  prescricoes?: string | null;
  encaminhamentos?: string | null;
  orientacoes?: string | null;
  retorno_sugerido?: string | null;
  finalized_at?: string | null;
  created_at?: string;
  updated_at?: string;
  patient_nome?: string;
  professional_nome?: string;
  addenda?: { id: string; content: string; created_at: string }[];
}

export function useEncounters(patientId?: string) {
  const qs = patientId ? `?patient_id=${patientId}` : "";
  return useQuery({
    queryKey: ["encounters", patientId],
    queryFn: () => api<Encounter[]>(`/encounters${qs}`),
  });
}

export function useEncounter(id?: string) {
  return useQuery({
    queryKey: ["encounters", id],
    queryFn: () => api<Encounter>(`/encounters/${id}`),
    enabled: !!id,
  });
}

export function useSaveEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Encounter> & { id?: string }) => {
      if (payload.id) {
        return api<Encounter>(`/encounters/${payload.id}`, { method: "PUT", json: payload });
      }
      return api<Encounter>("/encounters", { method: "POST", json: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encounters"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["waiting"] });
    },
  });
}

export function useFinalizeEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<Encounter>(`/encounters/${id}/finalize`, { method: "POST", json: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encounters"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["waiting"] });
    },
  });
}
