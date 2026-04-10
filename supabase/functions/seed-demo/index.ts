import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const DEMO_EMAIL = "admin@kareon.com";
    const DEMO_PASSWORD = "206141";

    // Check if demo user exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === DEMO_EMAIL);

    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const { data: newUser, error: signupErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { nome: "Admin Kareon" },
      });
      if (signupErr) throw signupErr;
      userId = newUser.user.id;
    }

    // Get or create clinic
    const { data: profileData } = await admin
      .from("profiles")
      .select("id, clinica_id")
      .eq("user_id", userId)
      .single();

    let clinicaId = profileData?.clinica_id;
    const profileId = profileData?.id;

    if (!clinicaId) {
      const { data: clinica } = await admin
        .from("clinicas")
        .insert({ nome: "Clínica Kareon Demo" })
        .select()
        .single();
      clinicaId = clinica!.id;
      await admin
        .from("profiles")
        .update({ clinica_id: clinicaId, nome: "Admin Kareon" })
        .eq("user_id", userId);

      // Assign admin role
      await admin.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" }
      );
    }

    // Check if data already seeded
    const { count } = await admin
      .from("pacientes")
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinicaId);

    if (count && count > 0) {
      return new Response(JSON.stringify({ message: "Demo data already seeded", userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Seed patients
    const pacientes = [
      { nome: "Lucas Silva", data_nascimento: "2019-03-15", diagnostico: "TEA - Transtorno do Espectro Autista", tags: ["TEA", "Integração sensorial", "Regulação emocional"], responsavel_nome: "Ana Silva", responsavel_telefone: "(11) 99999-1234", responsavel_email: "ana.silva@email.com", responsavel_parentesco: "mae", clinica_id: clinicaId, status: "ativo" },
      { nome: "Maria Oliveira", data_nascimento: "2020-07-22", diagnostico: "Atraso no desenvolvimento motor", tags: ["Atraso motor", "Coordenação motora"], responsavel_nome: "Carlos Oliveira", responsavel_telefone: "(11) 98888-5678", responsavel_email: "carlos.oliveira@email.com", responsavel_parentesco: "pai", clinica_id: clinicaId, status: "ativo" },
      { nome: "Pedro Santos", data_nascimento: "2018-11-08", diagnostico: "TDAH com dificuldade de coordenação motora", tags: ["TDAH", "Coordenação motora", "Dificuldade de aprendizagem"], responsavel_nome: "Juliana Santos", responsavel_telefone: "(11) 97777-9012", responsavel_email: "juliana.santos@email.com", responsavel_parentesco: "mae", clinica_id: clinicaId, status: "ativo" },
      { nome: "Sofia Costa", data_nascimento: "2021-01-30", diagnostico: "Síndrome de Down", tags: ["Síndrome de Down", "AVD", "Coordenação motora"], responsavel_nome: "Roberto Costa", responsavel_telefone: "(11) 96666-3456", responsavel_email: "roberto.costa@email.com", responsavel_parentesco: "pai", clinica_id: clinicaId, status: "ativo" },
    ];

    const { data: insertedPacientes } = await admin
      .from("pacientes")
      .insert(pacientes)
      .select();

    if (!insertedPacientes) throw new Error("Failed to insert pacientes");

    const pIds = insertedPacientes.map((p: any) => p.id);

    // Seed objectives
    const objetivos = [
      { paciente_id: pIds[0], titulo: "Melhorar regulação sensorial durante atividades", status: "em_andamento", progresso: 45 },
      { paciente_id: pIds[0], titulo: "Tolerar texturas variadas no tato", status: "em_andamento", progresso: 30 },
      { paciente_id: pIds[0], titulo: "Manter contato visual por 10 segundos", status: "concluido", progresso: 100 },
      { paciente_id: pIds[1], titulo: "Desenvolver preensão palmar funcional", status: "em_andamento", progresso: 60 },
      { paciente_id: pIds[1], titulo: "Realizar grafismo com controle", status: "nao_iniciado", progresso: 0 },
      { paciente_id: pIds[2], titulo: "Manter atenção em atividade por 15 minutos", status: "em_andamento", progresso: 55 },
      { paciente_id: pIds[2], titulo: "Melhorar coordenação bilateral", status: "em_andamento", progresso: 40 },
      { paciente_id: pIds[3], titulo: "Realizar atividades de vida diária com supervisão mínima", status: "em_andamento", progresso: 25 },
    ];

    const { data: insertedObjetivos } = await admin.from("objetivos").insert(objetivos).select();
    if (!insertedObjetivos) throw new Error("Failed to insert objetivos");
    const oIds = insertedObjetivos.map((o: any) => o.id);

    // Seed sessions
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
    const daysAhead = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

    const sessoes = [
      { paciente_id: pIds[0], data_hora: daysAgo(2), objetivo_ids: [oIds[0], oIds[1]], atividades_lista: ["Integração sensorial", "Estimulação tátil", "Brincadeira dirigida"], comportamentos: ["Colaborativo", "Ansioso"], engajamento: "medio", progresso_observado: "progresso_leve", observacoes: "Aceitou texturas novas com menos resistência.", terapeuta_id: profileId },
      { paciente_id: pIds[0], data_hora: daysAgo(9), objetivo_ids: [oIds[0]], atividades_lista: ["Integração sensorial", "Regulação emocional", "Brincadeira livre"], comportamentos: ["Agitado", "Motivado"], engajamento: "alto", progresso_observado: "progresso_significativo", observacoes: "Excelente resposta às atividades de balanço.", terapeuta_id: profileId },
      { paciente_id: pIds[0], data_hora: daysAgo(16), objetivo_ids: [oIds[0], oIds[2]], atividades_lista: ["Integração sensorial", "Estimulação tátil"], comportamentos: ["Resistente", "Ansioso"], engajamento: "baixo", progresso_observado: "manteve", observacoes: "Dia difícil, paciente chegou agitado.", terapeuta_id: profileId },
      { paciente_id: pIds[1], data_hora: daysAgo(1), objetivo_ids: [oIds[3]], atividades_lista: ["Coordenação motora fina", "Grafismo", "Recorte e colagem"], comportamentos: ["Colaborativo", "Motivado"], engajamento: "alto", progresso_observado: "progresso_significativo", observacoes: "Conseguiu segurar tesoura adaptada.", terapeuta_id: profileId },
      { paciente_id: pIds[1], data_hora: daysAgo(8), objetivo_ids: [oIds[3]], atividades_lista: ["Coordenação motora fina", "Recorte e colagem"], comportamentos: ["Colaborativo", "Calmo"], engajamento: "medio", progresso_observado: "progresso_leve", observacoes: "Preensão melhorando progressivamente.", terapeuta_id: profileId },
      { paciente_id: pIds[2], data_hora: daysAgo(3), objetivo_ids: [oIds[5], oIds[6]], atividades_lista: ["Planejamento motor", "Coordenação motora grossa", "Brincadeira dirigida"], comportamentos: ["Agitado", "Disperso"], engajamento: "medio", progresso_observado: "manteve", observacoes: "Dificuldade para manter foco.", terapeuta_id: profileId },
      { paciente_id: pIds[2], data_hora: daysAgo(10), objetivo_ids: [oIds[5]], atividades_lista: ["Planejamento motor", "Regulação emocional"], comportamentos: ["Colaborativo", "Focado"], engajamento: "alto", progresso_observado: "progresso_significativo", observacoes: "Manteve atenção por 12 minutos.", terapeuta_id: profileId },
      { paciente_id: pIds[3], data_hora: daysAgo(4), objetivo_ids: [oIds[7]], atividades_lista: ["AVD (atividades de vida diária)", "Coordenação motora fina"], comportamentos: ["Colaborativo", "Calmo", "Motivado"], engajamento: "alto", progresso_observado: "progresso_leve", observacoes: "Praticou vestir-se com ajuda mínima.", terapeuta_id: profileId },
      // Future sessions
      { paciente_id: pIds[0], data_hora: daysAhead(1), objetivo_ids: [oIds[0]], atividades_lista: [], comportamentos: [], engajamento: "medio", progresso_observado: "manteve", observacoes: "", terapeuta_id: profileId },
      { paciente_id: pIds[1], data_hora: daysAhead(1), objetivo_ids: [oIds[3]], atividades_lista: [], comportamentos: [], engajamento: "medio", progresso_observado: "manteve", observacoes: "", terapeuta_id: profileId },
      { paciente_id: pIds[2], data_hora: daysAhead(2), objetivo_ids: [oIds[5]], atividades_lista: [], comportamentos: [], engajamento: "medio", progresso_observado: "manteve", observacoes: "", terapeuta_id: profileId },
      { paciente_id: pIds[3], data_hora: daysAhead(3), objetivo_ids: [oIds[7]], atividades_lista: [], comportamentos: [], engajamento: "medio", progresso_observado: "manteve", observacoes: "", terapeuta_id: profileId },
    ];

    await admin.from("sessoes").insert(sessoes);

    return new Response(
      JSON.stringify({ message: "Demo data seeded successfully", userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
