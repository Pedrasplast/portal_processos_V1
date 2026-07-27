import { supabase } from '../lib/supabase';

export async function listarPerfis() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, email, regra, criado_em')
    .order('nome', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data || [];
}
