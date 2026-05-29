import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "create" | "delete";

interface CreatePayload {
  action: "create";
  nome: string;
  email: string;
  password: string;
  cargo?: string;
  roles: string[];
  clinica_id?: string; // admin master pode informar; clinica_admin é forçado para a própria
  status?: "ativo" | "inativo";
  must_change_password?: boolean;
}

interface DeletePayload {
  action: "delete";
  profile_id: string;
}

const ALLOWED_ROLES = new Set([
  "admin",
  "clinica_admin",
  "responsavel_clinica",
  "terapeuta",
  "familiar",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);
    const callerId = userData.user.id;

    // Carrega perfil do chamador (via service role para evitar RLS surpresas)
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("id, clinic_id, status, role")
      .eq("id", callerId)
      .maybeSingle();

    const roles = callerProfile?.role ? [callerProfile.role] : [];
    const isAdminMaster = roles.includes("admin");
    const isClinicAdmin = roles.includes("clinica_admin");
    if (!isAdminMaster && !isClinicAdmin) {
      return json({ error: "Sem permissão" }, 403);
    }

    const body = (await req.json()) as CreatePayload | DeletePayload;

    if (body.action === "create") {
      const { nome, email, password, cargo, roles: newRoles } = body;
      const status = body.status === "inativo" ? "inativo" : "ativo";
      const mustChange = body.must_change_password !== false; // default true
      if (!nome || !email || !password) return json({ error: "Dados obrigatórios faltando" }, 400);

      // Determina clínica destino
      let clinicaId: string | null = null;
      if (isAdminMaster) {
        clinicaId = body.clinica_id ?? callerProfile?.clinic_id ?? null;
      } else {
        if (!callerProfile?.clinic_id) return json({ error: "Sem clínica vinculada" }, 400);
        clinicaId = callerProfile.clinic_id;
      }

      // Valida roles
      const cleanRoles = (newRoles ?? []).filter((r) => ALLOWED_ROLES.has(r));
      if (!isAdminMaster && cleanRoles.includes("admin")) {
        return json({ error: "Não é permitido atribuir admin master" }, 403);
      }

      // Cria usuário no auth (auto confirmado)
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      });
      if (createErr || !created.user) return json({ error: createErr?.message ?? "Falha ao criar" }, 400);

      const newUserId = created.user.id;

      // Atualiza profile (criado pelo trigger handle_new_user)
      const { error: profErr } = await admin
        .from("profiles")
        .update({
          name: nome,
          clinic_id: clinicaId,
          role: cleanRoles[0] || cargo || null,
          status,
          must_change_password: mustChange,
        })
        .eq("id", newUserId);
      if (profErr) {
        await admin.auth.admin.deleteUser(newUserId);
        return json({ error: profErr.message }, 400);
      }

      return json({ success: true, user_id: newUserId });
    }

    if (body.action === "delete") {
      const { profile_id } = body;
      if (!profile_id) return json({ error: "profile_id obrigatório" }, 400);

      const { data: target, error: tErr } = await admin
        .from("profiles")
        .select("id, clinic_id, role")
        .eq("id", profile_id)
        .maybeSingle();
      if (tErr || !target) return json({ error: "Usuário não encontrado" }, 404);

      if (target.id === callerId) return json({ error: "Não é possível excluir a si mesmo" }, 400);

      if (!isAdminMaster) {
        if (!callerProfile?.clinic_id || target.clinic_id !== callerProfile.clinic_id) {
          return json({ error: "Sem permissão para excluir este usuário" }, 403);
        }
        // Bloqueia excluir admin master
        if (target.role === "admin") {
          return json({ error: "Não é possível excluir admin master" }, 403);
        }
      }

      // Remove profile e auth user
      await admin.from("profiles").delete().eq("id", profile_id);
      const { error: delErr } = await admin.auth.admin.deleteUser(target.id);
      if (delErr) return json({ error: delErr.message }, 400);

      return json({ success: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Erro interno" }, 500);
  }
});