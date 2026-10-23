import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Atendimento {
  id: string;
  clinica_id: string;
  paciente_id: string;
  profissional_id: string | null;
  data_hora: string;
  status: string;
  tipo: string;
  paciente_nome?: string;
  profissional_nome?: string;
  convenio_nome?: string;
  procedimento_nome?: string;
  queixa_principal?: string | null;
  anamnese?: string | null;
  exame_fisico?: string | null;
  sinais_vitais?: Record<string, unknown>;
  diagnostico_cid?: string | null;
  diagnostico_descricao?: string | null;
  conduta?: string | null;
  evolucao?: string | null;
  prescricao?: string | null;
  exames_solicitados?: string | null;
  atestado?: string | null;
  observacoes?: string | null;
  convenio_id?: string | null;
  procedimento_id?: string | null;
}

export function useAtendimentos(filters?: {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (filters?.status) qs.set("status", filters.status);
  if (filters?.q) qs.set("q", filters.q);
  if (filters?.from) qs.set("from", filters.from);
  if (filters?.to) qs.set("to", filters.to);
  const query = qs.toString();

  return useQuery({
    queryKey: ["atendimentos", filters],
    queryFn: () => api<Atendimento[]>(`/atendimentos${query ? `?${query}` : ""}`),
  });
}

export function useAtendimento(id: string | undefined) {
  return useQuery({
    queryKey: ["atendimentos", id],
    queryFn: () => api<Atendimento>(`/atendimentos/${id}`),
    enabled: !!id,
  });
}

export function useSaveAtendimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Atendimento> & { id?: string }) => {
      if (payload.id) {
        return api<Atendimento>(`/atendimentos/${payload.id}`, {
          method: "PUT",
          json: payload,
        });
      }
      return api<Atendimento>("/atendimentos", { method: "POST", json: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atendimentos"] }),
  });
}

export function useDeleteAtendimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api(`/atendimentos/${id}`, { method: "DELETE", json: { reason } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atendimentos"] }),
  });
}
