import { api } from "@/lib/api";

/**
 * Substitui a Edge Function manage-clinic-user pela API local.
 */
export async function invokeManageUser(body: Record<string, unknown>) {
  const action = String(body.action || "");

  if (action === "list") {
    const profiles = await api<any[]>("/profiles");
    return { profiles };
  }

  if (action === "create") {
    const profile = await api("/profiles", {
      method: "POST",
      json: {
        nome: body.nome || body.name,
        email: body.email,
        password: body.password,
        role: body.role || body.cargo,
        clinic_id: body.clinic_id || body.clinica_id,
        status: body.status || "ativo",
        telefone: body.telefone,
        permissions: body.permissions,
        perfil_id: body.perfil_id,
      },
    });
    return { profile };
  }

  if (action === "update") {
    const id = body.id || body.profile_id;
    const profile = await api(`/profiles/${id}`, {
      method: "PUT",
      json: {
        nome: body.nome || body.name,
        role: body.role || body.cargo,
        clinic_id: body.clinic_id || body.clinica_id,
        status: body.status,
        telefone: body.telefone,
        permissions: body.permissions,
        perfil_id: body.perfil_id,
        must_change_password: body.must_change_password,
      },
    });
    return { profile };
  }

  if (action === "delete") {
    await api(`/profiles/${body.id || body.profile_id}`, {
      method: "DELETE",
      json: { reason: body.reason || "Exclusão de usuário" },
    });
    return { ok: true };
  }

  throw new Error(`Ação não suportada: ${action}`);
}
