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
      return (data || []) as Evento[];
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
          })
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
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
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
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