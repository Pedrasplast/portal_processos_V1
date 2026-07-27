import { supabase } from '../lib/supabase';

function decodificarPayloadJwt(token) {
  if (!token) return null;

  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');

    const bytes = Uint8Array.from(atob(base64), (caractere) => caractere.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (error) {
    console.error('Não foi possível ler o token da sessão:', error);
    return null;
  }
}

export function obterSessionIdDoToken(accessToken) {
  return decodificarPayloadJwt(accessToken)?.session_id || null;
}

export async function loginComSenha(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  });

  if (error) throw error;

  const sessionId = obterSessionIdDoToken(data.session?.access_token);
  if (!data.user || !data.session || !sessionId) {
    throw new Error('Não foi possível iniciar uma sessão válida. Tente novamente.');
  }

  return {
    user: data.user,
    session: data.session,
    sessionId,
  };
}

export async function sair() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function obterPerfil(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, email, regra, criado_em')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function cadastrarConta({ nome, email, senha }) {
  const emailTratado = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: emailTratado,
    password: senha,
    options: {
      data: {
        nome: nome.trim(),
      },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });

  if (error) throw error;

  return {
    user: data.user,
    session: data.session,
  };
}
