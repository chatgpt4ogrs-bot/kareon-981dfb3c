import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ObjetivoTerapeutico } from "@/types";

function rowToObjetivo(row: any): ObjetivoTerapeutico {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    descricao: row.titulo || row.descricao || "",
    status: row.status || "nao_iniciado",
    progresso: row.progresso || 0,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

export function useObjetivos(pacienteId?: string) {
  return useQuery({
    queryKey: ["objetivos", pacienteId],
    queryFn: async () => {
      const qs = pacienteId ? `?paciente_id=${pacienteId}` : "";
      const rows = await api<any[]>(`/objetivos${qs}`);
      return rows.map(rowToObjetivo);
    },
  });
}

export function useSaveObjetivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (o: ObjetivoTerapeutico) => {
      const row = {
        paciente_id: o.pacienteId,
        titulo: o.descricao,
        descricao: o.descricao,
        status: o.status,
        progresso: o.progresso,
      };

      const list = await api<any[]>(`/objetivos?paciente_id=${o.pacienteId}`);
      const exists = list.some((r) => r.id === o.id);
      if (exists) {
        await api(`/objetivos/${o.id}`, { method: "PUT", json: row });
      } else {
        await api("/objetivos", { method: "POST", json: { ...row, id: o.id } });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objetivos"] });
    },
  });
}

export function useDeleteObjetivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api(`/objetivos/${id}`, { method: "DELETE", json: { reason } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objetivos"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
