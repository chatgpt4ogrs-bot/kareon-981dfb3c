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
    const DEMO_PASSWORD = "admin159";

    // Check if admin user exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email === DEMO_EMAIL);

    let userId: string;
    if (existing) {
      // Update password if needed
      await admin.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD });
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

    // Get or create clinic & profile
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
        .insert({ nome: "Clínica Kareon" })
        .select()
        .single();
      clinicaId = clinica!.id;
      await admin
        .from("profiles")
        .update({ clinica_id: clinicaId, nome: "Admin Kareon", cargo: "admin" })
        .eq("user_id", userId);
    }

    // Assign admin role
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" }
    );

    return new Response(
      JSON.stringify({ message: "Admin user ready", userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
