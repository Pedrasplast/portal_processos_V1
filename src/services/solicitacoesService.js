import { STATUS_ACESSO } from '../config/acesso';
import { supabase } from '../lib/supabase';

export { STATUS_ACESSO };

async function cancelarPendentesAnteriores(userId) {
  const { error } = await supabase
    .from('solicitacoes_acesso')
    .update({ status: STATUS_ACESSO.CANCELADO })
    .eq('user_id', userId)
    .eq('status', STATUS_ACESSO.PENDENTE);

  if (error) throw error;
}

export async function criarSolicitacao({ userId, email, sessionId }) {
  if (!userId || !email || !sessionId) {
    throw new Error('Dados da sessão incompletos para solicitar acesso.');
  }

  // Mantém somente uma solicitação pendente por usuário.
  await cancelarPendentesAnteriores(userId);

  const { data, error } = await supabase
    .from('solicitacoes_acesso')
    .insert([
      {
        user_id: userId,
        email: email.trim().toLowerCase(),
        session_id: sessionId,
        status: STATUS_ACESSO.PENDENTE,
      },
    ])
    .select('id, user_id, email, session_id, status, criado_em, aprovado_em')
    .single();

  if (error) throw error;
  return data;
}

export async function obterSolicitacao({ id, userId, sessionId }) {
  if (!id || !userId || !sessionId) return null;

  const { data, error } = await supabase
    .from('solicitacoes_acesso')
    .select('id, user_id, email, session_id, status, criado_em, aprovado_em')
    .eq('id', id)
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}


export async function obterAprovacaoPermanente(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('solicitacoes_acesso')
    .select('id, user_id, email, session_id, status, criado_em, aprovado_em')
    .eq('user_id', userId)
    .eq('status', STATUS_ACESSO.APROVADO)
    .order('aprovado_em', { ascending: false, nullsFirst: false })
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listarSolicitacoes() {
  const { data, error } = await supabase
    .from('solicitacoes_acesso')
    .select('id, user_id, email, session_id, status, criado_em, aprovado_em')
    .order('criado_em', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function atualizarStatus(id, status) {
  if (!Object.values(STATUS_ACESSO).includes(status)) {
    throw new Error('Status de acesso inválido.');
  }

  const { error } = await supabase
    .from('solicitacoes_acesso')
    .update({
      status,
      aprovado_em: status === STATUS_ACESSO.APROVADO ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function cancelarSolicitacao({ id, userId, sessionId }) {
  if (!id || !userId || !sessionId) return;

  const { error } = await supabase
    .from('solicitacoes_acesso')
    .update({ status: STATUS_ACESSO.CANCELADO })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .eq('status', STATUS_ACESSO.PENDENTE);

  if (error) throw error;
}
