import { createClient } from '@supabase/supabase-js';

const url = "https://dxvvscoiscujtkdeeszw.supabase.co";
const key = "sb_publishable_cKYgWQsGVCZaT3oTO7leWA_Atk2nz9y";

const supabase = createClient(url, key);

async function runTests() {
  console.log("Iniciando testes E2E do Backend/Supabase...");

  const tables = ['membros', 'categorias', 'rotulos', 'ideias', 'comentarios', 'cards', 'recursos'];
  
  for (const table of tables) {
    console.log(`Testando tabela: ${table}`);
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.error(`ERRO na tabela ${table}:`, error.message);
      process.exit(1);
    } else {
      console.log(`✅ Tabela ${table} validada com sucesso!`);
    }
  }

  console.log("Todos os testes de schema passaram!");
}

runTests();
