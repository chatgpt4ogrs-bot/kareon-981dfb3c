import { api } from "@/lib/api";

/**
 * Substitui a Edge Function manage-clinic-user pela API local.
 */
export async function invokeManageUser(body: Record<string, unknown>) {
  const action = String(body.action || "");

  if (action === "list") {
    // Painel admin global: sem X-Clinic-Id o backend devolve todos (scope null)
    const profiles = await api<any[]>("/profiles");
    return { profiles };
  }

  if (action === "list_pending") {
    return api<{ pending: any[] }>("/profiles/pending");
  }

  if (action === "approve") {
    const id = body.user_id || body.id || body.profile_id;
    const profile = await api(`/profiles/${id}/approve`, {
      method: "POST",
      json: {
        roles: body.roles,
        role: Array.isArray(body.roles) ? body.roles[0] : body.role,
        perfil_id: body.perfil_id,
        clinica_id: body.clinica_id,
        clinic_id: body.clinica_id,
        clinica_ids: body.clinica_ids,
        permissions: body.permissions,
      },
    });
    return { profile };
  }

  if (action === "reject") {
    const id = body.user_id || body.id || body.profile_id;
    await api(`/profiles/${id}/reject`, {
      method: "POST",
      json: { reason: body.reason || "Cadastro recusado" },
    });
    return { ok: true };
  }

  if (action === "create") {
    const profile = await api("/profiles", {
      method: "POST",
      json: {
        nome: body.nome || body.name,
        email: body.email,
        password: body.password,
        role: body.role || body.cargo || (Array.isArray(body.roles) ? body.roles[0] : undefined),
        roles: body.roles,
        clinic_id: body.clinic_id || body.clinica_id,
        clinica_ids: body.clinica_ids,
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
        role: body.role || body.cargo || (Array.isArray(body.roles) ? body.roles[0] : undefined),
        roles: body.roles,
        clinic_id: body.clinic_id ?? body.clinica_id,
        clinica_id: body.clinica_id ?? body.clinic_id,
        clinica_ids: body.clinica_ids,
        status: body.status,
        telefone: body.telefone,
        permissions: body.permissions,
        perfil_id: body.perfil_id,
        must_change_password: body.must_change_password,
        password: body.password,
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
