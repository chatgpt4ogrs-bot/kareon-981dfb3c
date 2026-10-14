import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Paciente } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { deleteWithAudit } from "@/lib/audit";

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
    terapeutaId: row.terapeuta_id || undefined,
    criadoEm: row.created_at,
  };
}

/** IDs dos pacientes vinculados a um familiar (paciente_usuarios). */
async function fetchLinkedPacienteIds(profileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("paciente_usuarios")
    .select("paciente_id")
    .eq("profile_id", profileId)
    .eq("tipo", "familiar");
  if (error) throw error;
  return (data || []).map((v) => v.paciente_id);
}

export function usePacientes() {
  const { profile, clinicScope, hasRole } = useAuth();
  const isFamiliar = hasRole("familiar");
  return useQuery({
    queryKey: ["pacientes", clinicScope, isFamiliar ? profile?.id : null],
    queryFn: async () => {
      if (clinicScope && clinicScope.length === 0) return [];

      let q = supabase
        .from("pacientes")
        .select("*")
        .order("created_at", { ascending: false });

      if (isFamiliar) {
        const ids = await fetchLinkedPacienteIds(profile!.id);
        if (ids.length === 0) return [];
        q = q.in("id", ids);
      } else if (clinicScope) {
        q = q.in("clinica_id", clinicScope);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(rowToPaciente);
    },
  });
}

export function usePaciente(id: string | undefined) {
  const { profile, hasRole } = useAuth();
  const isFamiliar = hasRole("familiar");
  return useQuery({
    queryKey: ["pacientes", id, isFamiliar ? profile?.id : null],
    queryFn: async () => {
      if (!id) return null;
      if (isFamiliar) {
        const ids = profile ? await fetchLinkedPacienteIds(profile.id) : [];
        if (!ids.includes(id)) throw new Error("Paciente não vinculado à sua conta");
      }
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
        terapeuta_id: p.terapeutaId || null,
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
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await deleteWithAudit("paciente", id, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pacientes"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
