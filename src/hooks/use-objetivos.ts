import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      let query = supabase.from("objetivos").select("*").order("created_at", { ascending: false });
      if (pacienteId) query = query.eq("paciente_id", pacienteId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(rowToObjetivo);
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
        status: o.status,
        progresso: o.progresso,
      };

      // Check if exists
      const { data: existing } = await supabase
        .from("objetivos")
        .select("id")
        .eq("id", o.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("objetivos").update(row).eq("id", o.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("objetivos").insert({ ...row, id: o.id });
        if (error) throw error;
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("objetivos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objetivos"] });
    },
  });
}
