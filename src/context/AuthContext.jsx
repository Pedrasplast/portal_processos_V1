import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { ACESSO_STORAGE_KEY } from '../config/acesso';
import { supabase } from '../lib/supabase';
import {
  obterPerfil,
  obterSessionIdDoToken,
  sair as sairService,
} from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarSessaoInicial() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (ativo) setSession(data.session || null);
      } catch (error) {
        console.error('Erro ao recuperar sessão:', error);
        if (ativo) setSession(null);
      } finally {
        if (ativo) setSessionLoading(false);
      }
    }

    void carregarSessaoInicial();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      // O callback de Auth apenas atualiza o estado local. Consultas extras
      // ao Supabase ficam no efeito abaixo, evitando encadear chamadas de
      // rede dentro do listener de autenticação.
      setSession(novaSessao || null);
      setSessionLoading(false);
    });

    return () => {
      ativo = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarPerfil() {
      if (!session?.user?.id) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        const perfil = await obterPerfil(session.user.id);
        if (ativo) setProfile(perfil);
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        if (ativo) setProfile(null);
      } finally {
        if (ativo) setProfileLoading(false);
      }
    }

    void carregarPerfil();

    return () => {
      ativo = false;
    };
  }, [session?.user?.id]);

  const logout = useCallback(async () => {
    localStorage.removeItem(ACESSO_STORAGE_KEY);
    await sairService();
  }, []);

  const sessionId = useMemo(
    () => obterSessionIdDoToken(session?.access_token),
    [session?.access_token],
  );

  const loading = sessionLoading || profileLoading;

  const value = useMemo(
    () => ({
      session,
      sessionId,
      user: session?.user || null,
      profile,
      isAdmin: profile?.regra === 'admin',
      loading,
      logout,
    }),
    [session, sessionId, profile, loading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
