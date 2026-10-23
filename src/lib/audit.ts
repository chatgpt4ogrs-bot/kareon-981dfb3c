import { api } from "@/lib/api";

/** Motivo mínimo exigido em toda exclusão auditada. */
export const MIN_REASON_LENGTH = 3;

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  clinica: "Clínica",
  paciente: "Paciente",
  evento: "Evento",
  camera: "Câmera",
  objetivo: "Objetivo",
  perfil: "Perfil",
  usuario: "Usuário",
  produto_estoque: "Produto (estoque)",
  atendimento: "Atendimento",
};

/** Exclusão com motivo via API (auditoria no servidor). */
export async function deleteWithAudit(
  entityType: string,
  entityId: string,
  reason: string
): Promise<void> {
  const pathMap: Record<string, string> = {
    paciente: `/pacientes/${entityId}`,
    evento: `/eventos/${entityId}`,
    clinica: `/clinics/${entityId}`,
    atendimento: `/atendimentos/${entityId}`,
    produto_estoque: `/estoque/${entityId}`,
    objetivo: `/objetivos/${entityId}`,
  };
  const path = pathMap[entityType];
  if (!path) {
    throw new Error(`Tipo de registro não suportado: ${entityType}`);
  }
  await api(path, { method: "DELETE", json: { reason } });
}

/** Compatível com a chamada antiga usada no Estoque. */
export async function logDeletion(args: {
  entityType: string;
  entityId: string;
  entityLabel?: string;
  reason: string;
  snapshot?: unknown;
  clinicId?: string | null;
}): Promise<void> {
  await deleteWithAudit(args.entityType, args.entityId, args.reason);
}
