import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export function useEventos() {
  return useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .order("data_inicio", { ascending: true });
      if (error) throw error;
      const eventos = (data || []) as Evento[];

      const ids = eventos.map((e) => e.id);
      if (ids.length === 0) return eventos;

      const { data: links, error: linkErr } = await supabase
        .from("evento_terapeutas")
        .select("evento_id, terapeuta_id")
        .in("evento_id", ids);
      if (linkErr) throw linkErr;

      const map = new Map<string, string[]>();
      (links || []).forEach((l: any) => {
        const arr = map.get(l.evento_id) || [];
        arr.push(l.terapeuta_id);
        map.set(l.evento_id, arr);
      });

      return eventos.map((e) => ({
        ...e,
        terapeuta_ids: map.get(e.id) || (e.terapeuta_id ? [e.terapeuta_id] : []),
      }));
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
      const primario = terapeutaIds[0] ?? null;
      let eventoId: string;
      if (input.id) {
        const { error } = await supabase
          .from("eventos")
          .update({
            titulo: input.titulo,
            descricao: input.descricao ?? "",
            data_inicio: input.data_inicio,
            data_fim: input.data_fim ?? null,
            categoria: input.categoria,
            cor: input.cor,
            paciente_id: input.paciente_id ?? null,
            terapeuta_id: primario,
          })
          .eq("id", input.id);
        if (error) throw error;
        eventoId = input.id;
      } else {
        const { data, error } = await supabase
        .from("eventos")
        .insert({
          clinica_id: profile.clinica_id,
          criado_por: profile.id,
          titulo: input.titulo,
          descricao: input.descricao ?? "",
          data_inicio: input.data_inicio,
          data_fim: input.data_fim ?? null,
          categoria: input.categoria,
          cor: input.cor,
          paciente_id: input.paciente_id ?? null,
          terapeuta_id: primario,
        })
        .select("id")
        .single();
        if (error) throw error;
        eventoId = data.id as string;
      }

      // Sincroniza terapeutas vinculados
      const { error: delErr } = await supabase
        .from("evento_terapeutas")
        .delete()
        .eq("evento_id", eventoId);
      if (delErr) throw delErr;

      if (terapeutaIds.length > 0) {
        const rows = terapeutaIds.map((tid) => ({
          evento_id: eventoId,
          terapeuta_id: tid,
        }));
        const { error: insErr } = await supabase.from("evento_terapeutas").insert(rows);
        if (insErr) throw insErr;
      }

      return eventoId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventos"] });
    },
  });
}

export function useDeleteEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventos"] });
    },
  });
}