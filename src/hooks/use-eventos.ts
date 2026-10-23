import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export type EventoCategoria = "sessao" | "avaliacao" | "reuniao" | "pessoal";

export interface Evento {
  id: string;
  clinica_id: string;
  criado_por: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string | null;
  categoria: EventoCategoria;
  cor: string;
  paciente_id: string | null;
  terapeuta_id: string | null;
  terapeuta_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface EventoInput {
  id?: string;
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim?: string | null;
  categoria: EventoCategoria;
  cor: string;
  paciente_id?: string | null;
  terapeuta_id?: string | null;
  terapeuta_ids?: string[];
}

export const CATEGORIAS: { value: EventoCategoria; label: string; cor: string }[] = [
  { value: "sessao", label: "Sessão", cor: "#4A90E2" },
  { value: "avaliacao", label: "Avaliação", cor: "#10B981" },
  { value: "reuniao", label: "Reunião", cor: "#F59E0B" },
  { value: "pessoal", label: "Pessoal", cor: "#8B5CF6" },
];

export function getCategoriaInfo(value: string) {
  return CATEGORIAS.find((c) => c.value === value) ?? CATEGORIAS[0];
}

function mapRow(row: any): Evento {
  const ids = Array.isArray(row.terapeuta_ids) ? row.terapeuta_ids : [];
  return {
    id: row.id,
    clinica_id: row.clinica_id,
    criado_por: row.criado_por || "",
    titulo: row.titulo,
    descricao: row.descricao || "",
    data_inicio: row.inicio || row.data_inicio,
    data_fim: row.fim || row.data_fim || null,
    categoria: (row.tipo || row.categoria || "sessao") as EventoCategoria,
    cor: row.cor || getCategoriaInfo(row.tipo || row.categoria || "sessao").cor,
    paciente_id: row.paciente_id,
    terapeuta_id: ids[0] || row.terapeuta_id || null,
    terapeuta_ids: ids,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function useEventos() {
  const { clinicScope } = useAuth();
  return useQuery({
    queryKey: ["eventos", clinicScope],
    queryFn: async () => {
      const rows = await api<any[]>("/eventos");
      return rows.map(mapRow);
    },
  });
}

export function useSaveEvento() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: EventoInput) => {
      if (!profile?.clinica_id || !profile?.id) {
        throw new Error("Perfil sem clínica vinculada");
      }
      const terapeutaIds = (input.terapeuta_ids ?? []).filter(Boolean);
      const payload = {
        clinica_id: profile.clinica_id,
        titulo: input.titulo,
        descricao: input.descricao ?? "",
        inicio: input.data_inicio,
        fim: input.data_fim || input.data_inicio,
        tipo: input.categoria,
        paciente_id: input.paciente_id ?? null,
        terapeuta_ids: terapeutaIds,
        status: "agendado",
      };

      if (input.id) {
        await api(`/eventos/${input.id}`, { method: "PUT", json: payload });
        return input.id;
      }
      const created = await api<{ id: string }>("/eventos", { method: "POST", json: payload });
      return created.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventos"] });
    },
  });
}

export function useDeleteEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api(`/eventos/${id}`, { method: "DELETE", json: { reason } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventos"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
