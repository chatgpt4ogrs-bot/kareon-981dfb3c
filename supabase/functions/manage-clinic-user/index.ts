import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = new Set([
  "admin",
  "supervisor_plataforma",
  "clinica_admin",
  "responsavel_clinica",
  "terapeuta",
  "familiar",
]);

/** Roles que admin de clínica pode atribuir */
const CLINIC_ADMIN_ASSIGNABLE = new Set([
  "clinica_admin",
  "responsavel_clinica",
  "terapeuta",
  "familiar",
]);

const HIDDEN_FROM_CLINIC = new Set(["admin", "supervisor_plataforma"]);

/** Manter em sincronia com APP_TABS / ROLE_DEFAULT_TABS em src/lib/permissions.ts */
const ALL_TABS = ["pacientes", "agenda", "estoque", "cameras", "clinica_usuarios", "clinica_detalhes"];
const ROLE_DEFAULT_TABS: Record<string, string[]> = {
  admin: ALL_TABS,
  supervisor_plataforma: ["pacientes", "agenda", "estoque", "cameras", "clinica_usuarios"],
  clinica_admin: ALL_TABS,
  responsavel_clinica: ["pacientes", "agenda", "estoque", "cameras"],
  terapeuta: ["pacientes", "agenda", "estoque"],
  familiar: ["cameras"],
};

function sanitizeTabs(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return ALL_TABS.filter((t) => value.includes(t));
}

function effectiveTabs(role: string, permissions: unknown): string[] {
  if (role === "admin") return ALL_TABS;
  return sanitizeTabs(permissions) ?? ROLE_DEFAULT_TABS[role] ?? [];
}

/** Mesma regra do modo visita (resolveAccessFlags no AuthContext): nem ativo nem inativo = aguardando aprovação. */
const DECIDED_STATUSES = new Set(["ativo", "active", "inativo", "inactive"]);
const isPendingStatus = (status: unknown) => !DECIDED_STATUSES.has(String(status ?? "").toLowerCase());

/** Manter igual a EXPECTED_FN_VERSION em src/lib/manage-user.ts */
const FN_VERSION = "2026-10-09.familiar-sem-vinculo";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify({ ...data, fn_version: FN_VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeRole(role: unknown): string {
  return String(role || "").toLowerCase().trim();
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

    // "*" para não quebrar caso a coluna permissions ainda não exista
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", callerId)
      .maybeSingle();

    const callerRole = normalizeRole(callerProfile?.role);
    const isAdminMaster = callerRole === "admin";
    const callerTabs = effectiveTabs(callerRole, callerProfile?.permissions);

    // Admin Master ou quem tem a aba "Usuários da clínica" liberada
    if (!isAdminMaster && !callerTabs.includes("clinica_usuarios")) {
      return json({ error: "Sem permissão para gerenciar usuários" }, 403);
    }

    // Clínicas que o chamador gerencia: Gestor = as vinculadas; demais = a própria
    const isGestor = callerRole === "supervisor_plataforma";
    let callerClinicIds: string[] = [];
    if (!isAdminMaster) {
      if (isGestor) {
        const { data: links } = await admin
          .from("gestor_clinicas")
          .select("clinic_id")
          .eq("profile_id", callerId);
        callerClinicIds = (links ?? []).map((l: { clinic_id: string }) => l.clinic_id);
      } else if (callerProfile?.clinic_id) {
        callerClinicIds = [callerProfile.clinic_id];
      }
      if (callerClinicIds.length === 0) {
        return json({ error: "Sua conta não está vinculada a uma clínica. Entre em contato com o suporte" }, 400);
      }
    }
    const inCallerScope = (clinicId: unknown) =>
      isAdminMaster || (typeof clinicId === "string" && callerClinicIds.includes(clinicId));

    const body = await req.json();

    /** Clínicas do Gestor (somente Admin Master define): valida que existem. */
    const resolveGestorClinicIds = async (): Promise<{ ids?: string[]; error?: string }> => {
      if (!Array.isArray(body.clinica_ids)) return {};
      const ids = [...new Set(body.clinica_ids.filter((id: unknown) => typeof id === "string"))] as string[];
      if (ids.length === 0) return { error: "Vincule o gestor a pelo menos uma clínica" };
      const { data, error } = await admin.from("clinics").select("id").in("id", ids);
      if (error) return { error: error.message };
      if ((data ?? []).length !== ids.length) return { error: "Clínica não encontrada" };
      return { ids };
    };

    const saveGestorClinics = async (profileId: string, ids: string[]) => {
      const { error: delErr } = await admin.from("gestor_clinicas").delete().eq("profile_id", profileId);
      if (delErr) return delErr.message;
      if (ids.length === 0) return null;
      const { error: insErr } = await admin
        .from("gestor_clinicas")
        .insert(ids.map((clinic_id) => ({ profile_id: profileId, clinic_id })));
      return insErr ? insErr.message : null;
    };

    /** Valida as abas pedidas: ninguém (exceto Admin Master) libera aba que não possui. */
    const resolveRequestedTabs = (): { tabs?: string[] | null; error?: string } => {
      if (body.permissions === undefined) return {};
      const tabs = sanitizeTabs(body.permissions);
      if (tabs === null) return { tabs: null };
      if (!isAdminMaster && tabs.some((t) => !callerTabs.includes(t))) {
        return { error: "Você não pode liberar abas que não possui. Para liberar, entre em contato com o suporte" };
      }
      return { tabs };
    };

    /** Perfil escolhido (perfis_acesso): o tipo de acesso dele vira o role gravado. */
    const resolvePerfil = async (): Promise<
      { perfil?: { id: string; base_role: string; abas: string[] }; error?: string }
    > => {
      if (typeof body.perfil_id !== "string" || !body.perfil_id) return {};
      const { data, error } = await admin
        .from("perfis_acesso")
        .select("id, base_role, abas")
        .eq("id", body.perfil_id)
        .maybeSingle();
      if (error || !data) return { error: "Perfil não encontrado" };
      return { perfil: { id: data.id, base_role: normalizeRole(data.base_role), abas: sanitizeTabs(data.abas) ?? [] } };
    };

    /**
     * Familiar: pacientes são opcionais no cadastro (sem vínculo ele não vê nenhum paciente).
     * Se enviados, precisam ser da clínica do familiar (Admin Master sem clínica herda a dos pacientes).
     */
    const resolveFamiliarPacientes = async (
      clinicaId: string | null,
    ): Promise<{ ids?: string[]; clinicaId?: string | null; error?: string; status?: number }> => {
      const ids = Array.isArray(body.paciente_ids)
        ? [...new Set(body.paciente_ids.filter((id: unknown) => typeof id === "string"))] as string[]
        : [];
      if (ids.length === 0) return { ids: [], clinicaId };
      const { data: pacs, error: pacErr } = await admin
        .from("pacientes")
        .select("id, clinica_id")
        .in("id", ids);
      if (pacErr) return { error: pacErr.message, status: 400 };
      if (!pacs || pacs.length !== ids.length) return { error: "Paciente não encontrado", status: 400 };
      const pacClinics = new Set(pacs.map((p) => p.clinica_id));
      let finalClinic = clinicaId;
      if (!finalClinic && isAdminMaster && pacClinics.size === 1) {
        finalClinic = [...pacClinics][0] as string | null;
      }
      if (pacs.some((p) => p.clinica_id !== finalClinic)) {
        return { error: "Os pacientes precisam ser da mesma clínica do familiar", status: 403 };
      }
      return { ids, clinicaId: finalClinic };
    };

    if (body.action === "list") {
      let q = admin.from("profiles").select("*").order("name");

      if (body.role_filter) {
        q = q.eq("role", normalizeRole(body.role_filter));
      }

      if (!isAdminMaster) {
        q = q.in("clinic_id", callerClinicIds);
      }

      const { data: profilesList, error: pErr } = await q;
      if (pErr) return json({ error: pErr.message }, 400);

      let result: Record<string, unknown>[] = profilesList || [];

      // Admin Master: anexa as clínicas de cada Gestor
      if (isAdminMaster) {
        const { data: links } = await admin.from("gestor_clinicas").select("profile_id, clinic_id");
        const byProfile = new Map<string, string[]>();
        for (const l of links ?? []) {
          byProfile.set(l.profile_id, [...(byProfile.get(l.profile_id) ?? []), l.clinic_id]);
        }
        result = result.map((p) => ({ ...p, gestor_clinic_ids: byProfile.get(p.id as string) ?? [] }));
      }

      // Clínica nunca vê Admin Master nem Supervisor de Plataforma
      if (!isAdminMaster) {
        result = result.filter((p) => !HIDDEN_FROM_CLINIC.has(normalizeRole(p.role)));
      } else if (!body.include_hidden && !body.role_filter) {
        // Sem include_hidden, a lista do Admin Master oculta os Gestores (supervisor_plataforma)
        result = result.filter((p) => normalizeRole(p.role) !== "supervisor_plataforma");
      }

      return json({ success: true, profiles: result });
    }

    // ---------- Cadastros aguardando aprovação (modo visita) — somente Admin Master ----------
    // Inclui logins sem linha em profiles: o gatilho handle_new_user não grava perfil sem role.
    if (body.action === "list_pending") {
      if (!isAdminMaster) return json({ error: "Sem permissão para ver cadastros pendentes" }, 403);

      const { data: allProfiles, error: pErr } = await admin.from("profiles").select("*");
      if (pErr) return json({ error: pErr.message }, 400);
      const profileById = new Map((allProfiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p]));

      const pending: Record<string, unknown>[] = [];
      const perPage = 1000;
      for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) return json({ error: error.message }, 400);
        for (const u of data.users) {
          const p = profileById.get(u.id) as Record<string, any> | undefined;
          if (p && !isPendingStatus(p.status)) continue;
          if (p && HIDDEN_FROM_CLINIC.has(normalizeRole(p.role))) continue;
          const meta = (u.user_metadata ?? {}) as Record<string, any>;
          pending.push({
            id: u.id,
            name: p?.name || meta.name || meta.full_name || meta.nome || (u.email ?? "").split("@")[0],
            email: u.email ?? p?.email ?? "",
            telefone: p?.telefone ?? meta.telefone ?? null,
            role: p?.role ?? null,
            perfil_id: p?.perfil_id ?? null,
            clinic_id: p?.clinic_id ?? null,
            provider: (u.app_metadata as Record<string, any> | undefined)?.provider ?? "email",
            email_confirmed: !!u.email_confirmed_at,
            created_at: u.created_at,
            has_profile: !!p,
          });
        }
        if (data.users.length < perPage) break;
      }
      pending.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return json({ success: true, pending });
    }

    if (body.action === "approve") {
      if (!isAdminMaster) return json({ error: "Somente o suporte aprova novos cadastros" }, 403);
      const userId = typeof body.user_id === "string" ? body.user_id : "";
      if (!userId) return json({ error: "user_id obrigatório" }, 400);

      const { data: authTarget, error: aErr } = await admin.auth.admin.getUserById(userId);
      if (aErr || !authTarget?.user) return json({ error: "Usuário não encontrado" }, 404);
      const { data: existing } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (existing && !isPendingStatus(existing.status)) {
        return json({ error: "Este cadastro já foi aprovado" }, 400);
      }

      const perfilRes = await resolvePerfil();
      if (perfilRes.error) return json({ error: perfilRes.error }, 400);
      const perfil = perfilRes.perfil;
      const role = (perfil ? [perfil.base_role] : (body.roles ?? []))
        .map(normalizeRole)
        .find((r: string) => ALLOWED_ROLES.has(r)) as string | undefined;
      if (!role) return json({ error: "Selecione um perfil válido para o usuário" }, 400);

      let clinicaId: string | null = typeof body.clinica_id === "string" && body.clinica_id ? body.clinica_id : null;
      let gestorClinicIds: string[] = [];
      if (role === "supervisor_plataforma") {
        clinicaId = null;
        const gc = await resolveGestorClinicIds();
        if (gc.error) return json({ error: gc.error }, 400);
        if (!gc.ids) return json({ error: "Vincule o gestor a pelo menos uma clínica" }, 400);
        gestorClinicIds = gc.ids;
      }

      let pacienteIds: string[] = [];
      if (role === "familiar") {
        const fam = await resolveFamiliarPacientes(clinicaId);
        if (fam.error) return json({ error: fam.error }, fam.status ?? 400);
        pacienteIds = fam.ids!;
        clinicaId = fam.clinicaId ?? null;
      }

      if (role !== "admin" && role !== "supervisor_plataforma" && !clinicaId) {
        return json({ error: "Escolha a clínica do usuário" }, 400);
      }

      const requested = resolveRequestedTabs();
      if (requested.error) return json({ error: requested.error }, 403);

      const meta = (authTarget.user.user_metadata ?? {}) as Record<string, any>;
      const email = authTarget.user.email ?? existing?.email ?? "";
      const row: Record<string, unknown> = {
        id: userId,
        email,
        name: existing?.name || meta.name || meta.full_name || meta.nome || email.split("@")[0],
        clinic_id: clinicaId,
        role,
        status: "ativo",
        // A pessoa escolheu a própria senha no cadastro
        must_change_password: false,
      };
      if (perfil) row.perfil_id = perfil.id;
      if (role !== "admin") {
        row.permissions = requested.tabs ?? (perfil ? perfil.abas : (ROLE_DEFAULT_TABS[role] ?? []));
      }

      const { error: upErr } = await admin.from("profiles").upsert(row, { onConflict: "id" });
      if (upErr) return json({ error: upErr.message }, 400);

      const revert = async () => {
        await admin.from("profiles").update({ status: "pendente" }).eq("id", userId);
      };

      if (gestorClinicIds.length > 0) {
        const linkErr = await saveGestorClinics(userId, gestorClinicIds);
        if (linkErr) {
          await revert();
          return json({ error: `Falha ao vincular as clínicas do gestor: ${linkErr}` }, 400);
        }
      }

      if (pacienteIds.length > 0) {
        const { error: linkErr } = await admin.from("paciente_usuarios").insert(
          pacienteIds.map((paciente_id) => ({ paciente_id, profile_id: userId, tipo: "familiar" })),
        );
        if (linkErr) {
          await revert();
          return json({ error: `Falha ao vincular pacientes: ${linkErr.message}` }, 400);
        }
      }

      return json({ success: true });
    }

    if (body.action === "reject") {
      if (!isAdminMaster) return json({ error: "Somente o suporte recusa cadastros" }, 403);
      const userId = typeof body.user_id === "string" ? body.user_id : "";
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!userId) return json({ error: "user_id obrigatório" }, 400);
      if (reason.length < 3) return json({ error: "Informe o motivo da recusa" }, 400);
      if (userId === callerId) return json({ error: "Não é possível recusar a si mesmo" }, 400);

      const { data: authTarget, error: aErr } = await admin.auth.admin.getUserById(userId);
      if (aErr || !authTarget?.user) return json({ error: "Usuário não encontrado" }, 404);
      const { data: existing } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (existing && !isPendingStatus(existing.status)) {
        return json({ error: "Este cadastro já foi aprovado. Use Excluir na lista de usuários" }, 400);
      }

      const meta = (authTarget.user.user_metadata ?? {}) as Record<string, any>;
      const label = existing?.name || meta.name || meta.full_name || meta.nome || authTarget.user.email || userId;
      const snapshot = existing ?? {
        id: userId,
        email: authTarget.user.email,
        name: label,
        provider: (authTarget.user.app_metadata as Record<string, any> | undefined)?.provider ?? "email",
        created_at: authTarget.user.created_at,
      };

      const { data: auditRow, error: auditErr } = await admin
        .from("audit_logs")
        .insert({
          action: "delete",
          entity_type: "usuario",
          entity_id: userId,
          entity_label: `${label} (cadastro recusado)`,
          clinic_id: null,
          reason,
          snapshot,
          actor_id: callerId,
          actor_name: callerProfile?.name ?? null,
          actor_email: callerProfile?.email ?? userData.user.email ?? null,
          actor_role: callerRole || null,
        })
        .select("id")
        .single();
      if (auditErr) return json({ error: `Não foi possível registrar a auditoria: ${auditErr.message}` }, 400);

      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) {
        await admin.from("audit_logs").delete().eq("id", auditRow.id);
        return json({ error: delErr.message }, 400);
      }
      await admin.from("profiles").delete().eq("id", userId);
      return json({ success: true });
    }

    if (body.action === "create") {
      const { nome, email, password, roles: newRoles } = body;
      const status = body.status === "inativo" ? "inativo" : "ativo";
      const mustChange = body.must_change_password !== false;
      if (!nome || !email || !password) return json({ error: "Dados obrigatórios faltando" }, 400);

      let clinicaId: string | null = null;
      if (isAdminMaster) {
        clinicaId = body.clinica_id ?? null;
      } else if (inCallerScope(body.clinica_id)) {
        clinicaId = body.clinica_id;
      } else if (callerClinicIds.length === 1) {
        clinicaId = callerClinicIds[0];
      } else {
        return json({ error: "Escolha a clínica do usuário" }, 400);
      }

      const perfilRes = await resolvePerfil();
      if (perfilRes.error) return json({ error: perfilRes.error }, 400);
      const perfil = perfilRes.perfil;

      const cleanRoles = (perfil ? [perfil.base_role] : (newRoles ?? []))
        .map(normalizeRole)
        .filter((r: string) => ALLOWED_ROLES.has(r));

      if (!isAdminMaster) {
        if (cleanRoles.some((r: string) => !CLINIC_ADMIN_ASSIGNABLE.has(r))) {
          return json({ error: "Papel não permitido para admin da clínica" }, 403);
        }
      }

      const assignedRole: string | null = cleanRoles[0] || null;
      if (!assignedRole) return json({ error: "Selecione um perfil válido para o usuário" }, 400);
      if (!isAdminMaster && (assignedRole === "admin" || assignedRole === "supervisor_plataforma")) {
        return json({ error: "Não é permitido atribuir este papel" }, 403);
      }

      // Gestor não pertence a uma clínica só: as clínicas dele ficam em gestor_clinicas
      let gestorClinicIds: string[] = [];
      if (assignedRole === "supervisor_plataforma") {
        clinicaId = null;
        const gc = await resolveGestorClinicIds();
        if (gc.error) return json({ error: gc.error }, 400);
        if (!gc.ids) return json({ error: "Vincule o gestor a pelo menos uma clínica" }, 400);
        gestorClinicIds = gc.ids;
      }

      const requested = resolveRequestedTabs();
      if (requested.error) return json({ error: requested.error }, 403);

      // Familiar: vínculo obrigatório com pacientes da mesma clínica
      let pacienteIds: string[] = [];
      if (assignedRole === "familiar") {
        const fam = await resolveFamiliarPacientes(clinicaId);
        if (fam.error) return json({ error: fam.error }, fam.status ?? 400);
        pacienteIds = fam.ids!;
        clinicaId = fam.clinicaId ?? null;
      }

      // E-mail de usuário excluído: remove perfil órfão (sem login) que ainda tenha esse e-mail
      const normalizedEmail = String(email).trim().toLowerCase();
      const { data: sameEmail } = await admin
        .from("profiles")
        .select("id")
        .ilike("email", normalizedEmail);
      for (const p of sameEmail ?? []) {
        const { data: authUser } = await admin.auth.admin.getUserById(p.id);
        if (!authUser?.user) {
          await admin.from("profiles").delete().eq("id", p.id);
        }
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, name: nome },
      });
      if (createErr || !created.user) return json({ error: createErr?.message ?? "Falha ao criar" }, 400);

      const newUserId = created.user.id;

      const newProfile: Record<string, unknown> = {
        id: newUserId,
        email: created.user.email ?? normalizedEmail,
        name: nome,
        clinic_id: clinicaId,
        role: assignedRole,
        status,
        must_change_password: mustChange,
      };
      if (perfil) newProfile.perfil_id = perfil.id;
      const templateTabs = perfil ? perfil.abas : (ROLE_DEFAULT_TABS[assignedRole ?? ""] ?? []);
      if (requested.tabs !== undefined && assignedRole !== "admin") {
        newProfile.permissions = requested.tabs;
      } else if (!isAdminMaster) {
        newProfile.permissions = templateTabs.filter((t) => callerTabs.includes(t));
      }

      // upsert: o gatilho handle_new_user pode não ter criado o perfil (role é obrigatório no banco)
      const { error: profErr } = await admin
        .from("profiles")
        .upsert(newProfile, { onConflict: "id" });

      if (profErr) {
        await admin.auth.admin.deleteUser(newUserId);
        return json({ error: profErr.message }, 400);
      }

      if (gestorClinicIds.length > 0) {
        const linkErr = await saveGestorClinics(newUserId, gestorClinicIds);
        if (linkErr) {
          await admin.from("profiles").delete().eq("id", newUserId);
          await admin.auth.admin.deleteUser(newUserId);
          return json({ error: `Falha ao vincular as clínicas do gestor: ${linkErr}` }, 400);
        }
      }

      if (pacienteIds.length > 0) {
        const { error: linkErr } = await admin.from("paciente_usuarios").insert(
          pacienteIds.map((paciente_id) => ({ paciente_id, profile_id: newUserId, tipo: "familiar" })),
        );
        if (linkErr) {
          await admin.from("profiles").delete().eq("id", newUserId);
          await admin.auth.admin.deleteUser(newUserId);
          return json({ error: `Falha ao vincular pacientes: ${linkErr.message}` }, 400);
        }
      }

      return json({ success: true, user_id: newUserId });
    }

    if (body.action === "delete") {
      const { profile_id } = body;
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!profile_id) return json({ error: "profile_id obrigatório" }, 400);
      if (reason.length < 3) return json({ error: "Informe o motivo da exclusão" }, 400);

      const { data: target, error: tErr } = await admin
        .from("profiles")
        .select("*")
        .eq("id", profile_id)
        .maybeSingle();
      if (tErr || !target) return json({ error: "Usuário não encontrado" }, 404);

      if (target.id === callerId) return json({ error: "Não é possível excluir a si mesmo" }, 400);

      if (!isAdminMaster) {
        if (!inCallerScope(target.clinic_id)) {
          return json({ error: "Sem permissão para excluir este usuário" }, 403);
        }
        if (normalizeRole(target.role) === "admin" || normalizeRole(target.role) === "supervisor_plataforma") {
          return json({ error: "Não é possível excluir este usuário" }, 403);
        }
      }

      // Auditoria antes de excluir: sem registro, sem exclusão
      const { data: auditRow, error: auditErr } = await admin
        .from("audit_logs")
        .insert({
          action: "delete",
          entity_type: "usuario",
          entity_id: target.id,
          entity_label: target.name || target.email || target.id,
          clinic_id: target.clinic_id ?? null,
          reason,
          snapshot: target,
          actor_id: callerId,
          actor_name: callerProfile?.name ?? null,
          actor_email: callerProfile?.email ?? userData.user.email ?? null,
          actor_role: callerRole || null,
        })
        .select("id")
        .single();
      if (auditErr) return json({ error: `Não foi possível registrar a auditoria: ${auditErr.message}` }, 400);

      const { error: authDelErr } = await admin.auth.admin.deleteUser(target.id);
      if (authDelErr) {
        await admin.from("audit_logs").delete().eq("id", auditRow.id);
        return json({ error: authDelErr.message }, 400);
      }
      await admin.from("profiles").delete().eq("id", profile_id);

      return json({ success: true });
    }

    if (body.action === "update") {
      const { profile_id, nome, password, roles: newRoles, status, must_change_password } = body;
      if (!profile_id) return json({ error: "profile_id obrigatório" }, 400);

      const { data: target, error: tErr } = await admin
        .from("profiles")
        .select("*")
        .eq("id", profile_id)
        .maybeSingle();
      if (tErr || !target) return json({ error: "Usuário não encontrado" }, 404);

      if (!isAdminMaster) {
        if (!inCallerScope(target.clinic_id)) {
          return json({ error: "Sem permissão para editar este usuário" }, 403);
        }
        if (normalizeRole(target.role) === "admin" || normalizeRole(target.role) === "supervisor_plataforma") {
          return json({ error: "Não é possível editar este usuário" }, 403);
        }
      }

      const perfilRes = await resolvePerfil();
      if (perfilRes.error) return json({ error: perfilRes.error }, 400);
      const perfil = perfilRes.perfil;

      const rolesInput: unknown[] | undefined = perfil ? [perfil.base_role] : newRoles;
      const cleanRoles = rolesInput
        ? rolesInput.map(normalizeRole).filter((r: string) => ALLOWED_ROLES.has(r))
        : undefined;
      if (cleanRoles !== undefined && cleanRoles.length === 0) {
        return json({ error: "Selecione um perfil válido para o usuário" }, 400);
      }

      if (!isAdminMaster && cleanRoles) {
        if (cleanRoles.some((r: string) => !CLINIC_ADMIN_ASSIGNABLE.has(r))) {
          return json({ error: "Papel não permitido para admin da clínica" }, 403);
        }
      }
      if (!isAdminMaster && cleanRoles?.some((r: string) => HIDDEN_FROM_CLINIC.has(r))) {
        return json({ error: "Não é permitido atribuir este papel" }, 403);
      }

      const requested = resolveRequestedTabs();
      if (requested.error) return json({ error: requested.error }, 403);

      // Clínicas do Gestor: só o Admin Master altera
      const finalRole = cleanRoles?.[0] ?? normalizeRole(target.role);
      let gestorClinicIds: string[] | undefined;
      if (finalRole === "supervisor_plataforma" && body.clinica_ids !== undefined) {
        if (!isAdminMaster) return json({ error: "Somente o suporte altera as clínicas do gestor. Entre em contato com o suporte" }, 403);
        const gc = await resolveGestorClinicIds();
        if (gc.error) return json({ error: gc.error }, 400);
        gestorClinicIds = gc.ids;
      }

      if (password || nome) {
        const updateData: Record<string, unknown> = {};
        if (password) updateData.password = password;
        if (nome) updateData.user_metadata = { nome, name: nome };

        const { error: authErr } = await admin.auth.admin.updateUserById(profile_id, updateData);
        if (authErr) return json({ error: authErr.message }, 400);
      }

      const profileUpdate: Record<string, unknown> = {};
      if (nome !== undefined) profileUpdate.name = nome;
      if (cleanRoles !== undefined) profileUpdate.role = cleanRoles[0];
      if (perfil) {
        profileUpdate.perfil_id = perfil.id;
      } else if (cleanRoles !== undefined && target.perfil_id && normalizeRole(target.role) !== cleanRoles[0]) {
        // Mudou o tipo sem escolher um perfil: volta a exibir o pré-cadastrado do tipo
        profileUpdate.perfil_id = null;
      }
      if (requested.tabs !== undefined) {
        profileUpdate.permissions = requested.tabs;
      } else if (!isAdminMaster && cleanRoles !== undefined) {
        const templateTabs = perfil ? perfil.abas : (ROLE_DEFAULT_TABS[cleanRoles[0] ?? ""] ?? []);
        profileUpdate.permissions = templateTabs.filter((t) => callerTabs.includes(t));
      }
      if (body.telefone !== undefined) profileUpdate.telefone = body.telefone;
      // Clínica do usuário: Admin Master troca livremente; Gestor só entre as clínicas dele
      if (body.clinica_id !== undefined) {
        if (isAdminMaster) {
          profileUpdate.clinic_id = body.clinica_id === "none" ? null : body.clinica_id;
        } else if (isGestor && inCallerScope(body.clinica_id)) {
          profileUpdate.clinic_id = body.clinica_id;
        }
      }
      if (finalRole === "supervisor_plataforma") profileUpdate.clinic_id = null;
      if (status !== undefined) profileUpdate.status = status;
      if (must_change_password !== undefined) profileUpdate.must_change_password = must_change_password;

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profErr } = await admin.from("profiles").update(profileUpdate).eq("id", profile_id);
        if (profErr) return json({ error: profErr.message }, 400);
      }

      if (gestorClinicIds) {
        const linkErr = await saveGestorClinics(profile_id, gestorClinicIds);
        if (linkErr) return json({ error: `Falha ao salvar as clínicas do gestor: ${linkErr}` }, 400);
      } else if (finalRole !== "supervisor_plataforma" && normalizeRole(target.role) === "supervisor_plataforma") {
        // Deixou de ser Gestor: remove os vínculos de clínicas
        await saveGestorClinics(profile_id, []);
      }

      return json({ success: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Erro interno" }, 500);
  }
});
