import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Paciente } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeFichaPodologia } from "@/lib/ficha-podologia";
import { toDateOnly } from "@/lib/dates";

function rowToPaciente(row: any): Paciente {
  return {
    id: row.id,
    nome: row.nome || "",
    dataNascimento: toDateOnly(row.data_nascimento),
    diagnostico: row.diagnostico || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    responsavel: {
      nome: row.responsavel_nome || "",
      telefone: row.responsavel_telefone || "",
      email: row.responsavel_email || "",
      parentesco: row.responsavel_parentesco || "",
    },
    status: row.status || "ativo",
    terapeutaId: row.terapeuta_id || undefined,
    criadoEm: row.created_at || "",
    cpf: row.cpf || undefined,
    telefone: row.telefone || row.responsavel_telefone || undefined,
    email: row.email || row.responsavel_email || undefined,
    alergias: row.alergias || undefined,
    alertas_clinicos: row.alertas_clinicos || undefined,
    observacoes: row.observacoes || undefined,
    endereco_rua: row.endereco_rua || undefined,
    fichaPodologia: row.ficha_podologia
      ? normalizeFichaPodologia(row.ficha_podologia)
      : undefined,
  };
}

async function resolveClinicaId(preferred?: string | null): Promise<string> {
  if (preferred) return preferred;
  throw new Error(
    "Nenhuma clínica ativa. Entre em um tenant (Admin) ou vincule o usuário a uma clínica antes de cadastrar pacientes."
  );
}

export function usePacientes() {
  const { clinicScope, hasRole, profile, activeTenantId } = useAuth();
  const isFamiliar = hasRole("familiar");
  const unitId = profile?.clinica_id || activeTenantId || null;
  return useQuery({
    queryKey: ["pacientes", clinicScope, unitId, isFamiliar ? profile?.id : null],
    queryFn: async () => {
      const rows = await api<any[]>("/pacientes");
      return rows.map(rowToPaciente);
    },
    enabled: isFamiliar
      ? true
      : clinicScope === null
        ? !!unitId
        : (clinicScope?.length ?? 0) > 0,
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
  const { profile, activeTenantId } = useAuth();

  return useMutation({
    mutationFn: async (p: Paciente & { existingId?: string; clinica_id?: string }) => {
      const clinicaId = await resolveClinicaId(
        p.clinica_id || profile?.clinica_id || activeTenantId
      );

      const row = {
        nome: p.nome,
        data_nascimento: p.dataNascimento || null,
        diagnostico: p.diagnostico || "",
        tags: p.tags || [],
        responsavel_nome: p.responsavel.nome,
        responsavel_telefone: p.responsavel.telefone || p.telefone || null,
        responsavel_email: p.responsavel.email || p.email || null,
        responsavel_parentesco: p.responsavel.parentesco,
        status: p.status,
        clinica_id: clinicaId,
        terapeuta_id: p.terapeutaId || null,
        cpf: p.cpf || null,
        telefone: p.telefone || p.responsavel.telefone || null,
        email: p.email || p.responsavel.email || null,
        observacoes: p.observacoes || null,
        alergias: p.alergias || null,
        alertas_clinicos: p.alertas_clinicos || null,
        endereco_rua: p.endereco_rua || null,
        ficha_podologia: p.fichaPodologia || null,
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

export type ImportPacientesProgress = {
  total: number;
  done: number;
  created: number;
  skipped: number;
  errors: { nome: string; message: string }[];
};

/** Importa em lote payloads já mapeados da planilha (evita duplicar por nome+nascimento). */
export function useImportPacientes() {
  const qc = useQueryClient();
  const { profile, activeTenantId } = useAuth();

  return useMutation({
    mutationFn: async ({
      rows,
      onProgress,
    }: {
      rows: import("@/lib/import-pacientes-xlsx").PacienteImportPayload[];
      onProgress?: (p: ImportPacientesProgress) => void;
    }) => {
      const clinicaId = await resolveClinicaId(profile?.clinica_id || activeTenantId);
      const existing = await api<any[]>("/pacientes");
      const keyOf = (nome: string, nasc: string | null | undefined) =>
        `${(nome || "").trim().toLowerCase()}|${nasc || ""}`;
      const known = new Set(
        existing.map((r) =>
          keyOf(r.nome, r.data_nascimento ? String(r.data_nascimento).slice(0, 10) : "")
        )
      );

      const progress: ImportPacientesProgress = {
        total: rows.length,
        done: 0,
        created: 0,
        skipped: 0,
        errors: [],
      };
      onProgress?.({ ...progress });

      for (const row of rows) {
        const key = keyOf(row.nome, row.data_nascimento);
        if (known.has(key)) {
          progress.skipped += 1;
          progress.done += 1;
          onProgress?.({ ...progress, errors: [...progress.errors] });
          continue;
        }
        try {
          await api("/pacientes", {
            method: "POST",
            json: {
              ...row,
              clinica_id: clinicaId,
            },
          });
          known.add(key);
          progress.created += 1;
        } catch (err: any) {
          progress.errors.push({
            nome: row.nome,
            message: err?.message || "Falha ao cadastrar",
          });
        }
        progress.done += 1;
        onProgress?.({ ...progress, errors: [...progress.errors] });
      }

      return progress;
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
