import { supabase } from "@/integrations/supabase/client";

/** Tipos excluídos via RPC delete_with_audit (exclusão + auditoria na mesma transação). */
export type AuditedEntity = "clinica" | "paciente" | "evento" | "camera" | "objetivo" | "perfil";

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  clinica: "Clínica",
  paciente: "Paciente",
  evento: "Evento da agenda",
  camera: "Câmera",
  objetivo: "Objetivo",
  usuario: "Usuário",
  produto_estoque: "Produto do estoque",
  perfil: "Perfil de acesso",
};

export const MIN_REASON_LENGTH = 3;

export async function deleteWithAudit(entity: AuditedEntity, id: string, reason: string) {
  const { data, error } = await (supabase.rpc as any)("delete_with_audit", {
    p_entity: entity,
    p_id: id,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

/** Registro avulso, para exclusões que não passam por tabela do banco (ex.: estoque local). */
export async function logDeletion(input: {
  entityType: string;
  entityId: string;
  entityLabel: string;
  reason: string;
  snapshot: unknown;
  clinicId?: string | null;
}) {
  const { error } = await (supabase.from("audit_logs" as any) as any).insert({
    action: "delete",
    entity_type: input.entityType,
    entity_id: input.entityId,
    entity_label: input.entityLabel,
    reason: input.reason.trim(),
    snapshot: input.snapshot,
    clinic_id: input.clinicId ?? null,
  });
  if (error) throw new Error(`Não foi possível registrar a auditoria: ${error.message}`);
}
