import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sessao } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

function rowToSessao(row: any): Sessao {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    dataHora: row.data_hora,
    objetivoIds: row.objetivo_ids || [],
    atividades: row.atividades_lista || [],
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
      let query = supabase.from("sessoes").select("*").order("data_hora", { ascending: false });
      if (pacienteId) query = query.eq("paciente_id", pacienteId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(rowToSessao);
    },
  });
}

export function useSaveSessao() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (s: Sessao) => {
      const row = {
        paciente_id: s.pacienteId,
        data_hora: s.dataHora,
        objetivo_ids: s.objetivoIds,
        atividades_lista: s.atividades,
        comportamentos: s.comportamentos,
        engajamento: s.engajamento,
        progresso_observado: s.progressoObservado,
        observacoes: s.observacoes,
        terapeuta_id: profile?.id || null,
      };
      const { error } = await supabase.from("sessoes").insert(row);
      if (error) throw error;
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
      const { data, error } = await supabase
        .from("sessoes")
        .select("*")
        .eq("paciente_id", pacienteId)
        .order("data_hora", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToSessao(data) : null;
    },
    enabled: !!pacienteId,
  });
}
