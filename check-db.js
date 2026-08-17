import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file manually
const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1].trim();
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking profiles and clinics...");
  const { data: clinics, error: cErr } = await supabase.from('clinics').select('*');
  console.log("Clinics:", cErr ? cErr.message : clinics);

  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log("Profiles:", pErr ? pErr.message : profiles);
}

main();
