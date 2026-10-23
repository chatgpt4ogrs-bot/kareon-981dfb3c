import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sessao } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

function rowToSessao(row: any): Sessao {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    dataHora: row.data_hora,
    objetivoIds: row.objetivo_ids || [],
    atividades: row.atividades || row.atividades_lista || [],
    comportamentos: row.comportamentos || [],
    engajamento: row.engajamento || "medio",
    progressoObservado: row.progresso_observado || "manteve",
    observacoes: row.observacoes || "",
    criadoEm: row.created_at,
  };
}

export function useSessoes(pacienteId?: string) {
  return useQuery({
    queryKey: ["sessoes", pacienteId],
    queryFn: async () => {
      const qs = pacienteId ? `?paciente_id=${pacienteId}` : "";
      const rows = await api<any[]>(`/sessoes${qs}`);
      return rows.map(rowToSessao);
    },
  });
}

export function useSaveSessao() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (s: Sessao) => {
      await api("/sessoes", {
        method: "POST",
        json: {
          paciente_id: s.pacienteId,
          data_hora: s.dataHora,
          objetivo_ids: s.objetivoIds,
          atividades: s.atividades,
          comportamentos: s.comportamentos,
          engajamento: s.engajamento,
          progresso_observado: s.progressoObservado,
          observacoes: s.observacoes,
          terapeuta_id: profile?.id || null,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessoes"] });
    },
  });
}

export function useUltimaSessao(pacienteId: string | undefined) {
  return useQuery({
    queryKey: ["ultimaSessao", pacienteId],
    queryFn: async () => {
      if (!pacienteId) return null;
      const rows = await api<any[]>(`/sessoes?paciente_id=${pacienteId}`);
      return rows[0] ? rowToSessao(rows[0]) : null;
    },
    enabled: !!pacienteId,
  });
}
