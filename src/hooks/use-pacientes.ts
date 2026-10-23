import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
    terapeutaId: row.terapeuta_id || undefined,
    criadoEm: row.created_at,
  };
}

async function resolveClinicaId(preferred?: string | null): Promise<string> {
  if (preferred) return preferred;
  const clinics = await api<{ id: string }[]>("/clinics");
  if (!clinics.length) {
    throw new Error(
      "Nenhuma clínica cadastrada. Crie uma clínica no painel administrativo antes de cadastrar pacientes."
    );
  }
  return clinics[0].id;
}

export function usePacientes() {
  const { clinicScope, hasRole, profile } = useAuth();
  const isFamiliar = hasRole("familiar");
  return useQuery({
    queryKey: ["pacientes", clinicScope, isFamiliar ? profile?.id : null],
    queryFn: async () => {
      const rows = await api<any[]>("/pacientes");
      return rows.map(rowToPaciente);
    },
  });
}

export function usePaciente(id: string | undefined) {
  const validId = id && id !== "novo" ? id : undefined;
  return useQuery({
    queryKey: ["pacientes", validId],
    queryFn: async () => {
      if (!validId) return null;
      const row = await api<any>(`/pacientes/${validId}`);
      return rowToPaciente(row);
    },
    enabled: !!validId,
  });
}

export function useSavePaciente() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (p: Paciente & { existingId?: string; clinica_id?: string }) => {
      const clinicaId = await resolveClinicaId(p.clinica_id || profile?.clinica_id);

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
        const data = await api<any>(`/pacientes/${p.existingId}`, { method: "PUT", json: row });
        return rowToPaciente(data);
      }
      const data = await api<any>("/pacientes", { method: "POST", json: row });
      return rowToPaciente(data);
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
      await api(`/pacientes/${id}`, { method: "DELETE", json: { reason } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pacientes"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
