import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL;

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  console.error(
    'VITE_SUPABASE_URL não foi encontrada.',
  );
}

if (!supabaseKey) {
  console.error(
    'A chave pública do Supabase não foi encontrada.',
  );
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Configuração do Supabase ausente. Verifique as Environment Variables.',
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);