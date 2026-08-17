import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Read .env file
const envFile = readFileSync(".env", "utf-8");
const urlMatch = envFile.match(/VITE_SUPABASE_URL="(.*?)"/);
const keyMatch = envFile.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*?)"/);

if (!urlMatch || !keyMatch) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabaseUrl = urlMatch[1];
const supabaseKey = keyMatch[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // First, we need to authenticate as admin@kareon.com
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "admin@kareon.com",
    password: "KareonAdmin2026!" // We know this from the migration script
  });

  if (authError) {
    console.error("Auth error:", authError);
    return;
  }

  console.log("Logged in as admin@kareon.com");

  // Now invoke the edge function
  const { data, error } = await supabase.functions.invoke("manage-clinic-user", {
    body: {
      action: "create",
      nome: "usuario teste",
      email: "chatgpt4.ogrs@gmail.com",
      password: "123456",
      cargo: "admin clinica",
      roles: ["clinica_admin"],
      status: "ativo",
      must_change_password: true,
      clinica_id: "none"
    }
  });

  console.log("Edge Function Response Data:", data);
  if (error) {
    console.error("Edge Function Error:", error);
    
    // If it's a FunctionsHttpError, it might have context
    console.log("Error details:", JSON.stringify(error, null, 2));
    
    // Let's try direct fetch to see the actual body
    try {
        const { data: sessionData } = await supabase.auth.getSession();
        const res = await fetch(`${supabaseUrl}/functions/v1/manage-clinic-user`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionData.session?.access_token}`
            },
            body: JSON.stringify({
              action: "create",
              nome: "usuario teste",
              email: "chatgpt4.ogrs@gmail.com",
              password: "123456",
              cargo: "admin clinica",
              roles: ["clinica_admin"],
              status: "ativo",
              must_change_password: true,
              clinica_id: "none"
            })
        });
        const text = await res.text();
        console.log("Direct fetch response status:", res.status);
        console.log("Direct fetch response body:", text);
    } catch (e) {
        console.error("Direct fetch failed", e);
    }
  }
}

test();
