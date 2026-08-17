import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)?$/);
  if (match) {
    const key = match[1].trim();
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
    envVars[key] = value;
  }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_PUBLISHABLE_KEY);

async function main() {
  console.log("=== Verificando colunas da tabela clinics ===\n");

  // Test 1: Try selecting specific columns
  const { data, error } = await supabase
    .from('clinics')
    .select('id, nome, cnpj, telefone, email, endereco, status')
    .limit(1);

  if (error) {
    console.log("❌ ERRO ao selecionar colunas:", error.message);
    console.log("\n>>> As colunas ainda NÃO existem ou o schema cache precisa ser recarregado.");
    console.log(">>> Execute no Supabase SQL Editor:");
    console.log(">>>   NOTIFY pgrst, 'reload schema';");
  } else {
    console.log("✅ Todas as colunas existem! Dados:", data);
  }

  // Test 2: Try inserting a test clinic
  console.log("\n=== Testando inserção de clínica ===\n");
  const { data: inserted, error: insertErr } = await supabase
    .from('clinics')
    .insert({ nome: '__TEST_CLINIC__', cnpj: '00.000.000/0001-00', telefone: '0000', email: 'test@test.com', endereco: 'Rua Teste' })
    .select()
    .single();

  if (insertErr) {
    console.log("❌ ERRO ao inserir:", insertErr.message);
  } else {
    console.log("✅ Clínica inserida com sucesso:", inserted);
    // Clean up
    await supabase.from('clinics').delete().eq('id', inserted.id);
    console.log("🧹 Clínica de teste removida.");
  }
}

main();
