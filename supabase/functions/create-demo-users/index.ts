import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const clinicaId = "6ae8b9ed-9b39-4da4-b0e6-bf24c2119586";

  const users = [
    { email: "admin.clinica@demo.kareon.com", password: "Demo@2026", nome: "Ana Oliveira", role: "clinica_admin", cargo: "Administradora" },
    { email: "responsavel@demo.kareon.com", password: "Demo@2026", nome: "Carlos Souza", role: "responsavel_clinica", cargo: "Responsável" },
    { email: "terapeuta@demo.kareon.com", password: "Demo@2026", nome: "Mariana Lima", role: "terapeuta", cargo: "Terapeuta Ocupacional" },
    { email: "familiar@demo.kareon.com", password: "Demo@2026", nome: "Roberto Santos", role: "familiar", cargo: "Familiar" },
  ];

  const results = [];

  for (const u of users) {
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { nome: u.nome },
    });

    if (authError) {
      results.push({ email: u.email, error: authError.message });
      continue;
    }

    const userId = authData.user.id;

    // Update profile with clinica and status ativo
    await supabaseAdmin
      .from("profiles")
      .update({ clinica_id: clinicaId, cargo: u.cargo, status: "ativo" })
      .eq("user_id", userId);

    // Assign role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: u.role });

    results.push({ email: u.email, nome: u.nome, role: u.role, success: true });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
