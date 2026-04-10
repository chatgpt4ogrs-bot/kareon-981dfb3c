import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Paciente } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

function rowToPaciente(row: any): Paciente {
  return {
    id: row.id,
    nome: row.nome,
    dataNascimento: row.data_nascimento || "",
    diagnostico: row.diagnostico || "",
    tags: row.tags || [],
    responsavel: {
      nome: row.responsavel_nome || "",
      telefone: row.responsavel_telefone || "",
      email: row.responsavel_email || "",
      parentesco: row.responsavel_parentesco || "",
    },
    status: row.status || "ativo",
    criadoEm: row.created_at,
  };
}

export function usePacientes() {
  return useQuery({
    queryKey: ["pacientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(rowToPaciente);
    },
  });
}

export function usePaciente(id: string | undefined) {
  return useQuery({
    queryKey: ["pacientes", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return rowToPaciente(data);
    },
    enabled: !!id,
  });
}

export function useSavePaciente() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (p: Paciente & { existingId?: string }) => {
      const clinicaId = profile?.clinica_id;
      if (!clinicaId) throw new Error("Sem clínica vinculada");

      const row = {
        nome: p.nome,
        data_nascimento: p.dataNascimento || null,
        diagnostico: p.diagnostico || "",
        tags: p.tags || [],
        responsavel_nome: p.responsavel.nome,
        responsavel_telefone: p.responsavel.telefone,
        responsavel_email: p.responsavel.email,
        responsavel_parentesco: p.responsavel.parentesco,
        status: p.status,
        clinica_id: clinicaId,
      };

      if (p.existingId) {
        const { data, error } = await supabase
          .from("pacientes")
          .update(row)
          .eq("id", p.existingId)
          .select()
          .single();
        if (error) throw error;
        return rowToPaciente(data);
      } else {
        const { data, error } = await supabase
          .from("pacientes")
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        return rowToPaciente(data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pacientes"] });
    },
  });
}

export function useDeletePaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pacientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pacientes"] });
    },
  });
}
