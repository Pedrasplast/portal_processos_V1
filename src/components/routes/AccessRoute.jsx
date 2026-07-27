import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { obterAprovacaoPermanente } from '../../services/solicitacoesService';
import PageLoader from '../feedback/PageLoader';

function AccessRoute({ children }) {
  const {
    user,
    isAdmin,
    loading: authLoading,
  } = useAuth();

  const [status, setStatus] = useState('carregando');

  useEffect(() => {
    let ativo = true;

    async function validar() {
      if (authLoading) return;

      if (!user) {
        if (ativo) setStatus('bloqueado');
        return;
      }

      if (isAdmin) {
        if (ativo) setStatus('liberado');
        return;
      }

      if (ativo) setStatus('carregando');

      try {
        const aprovacao = await obterAprovacaoPermanente(user.id);

        if (!ativo) return;

        setStatus(aprovacao ? 'liberado' : 'bloqueado');
      } catch (error) {
        console.error('Erro ao validar autorização permanente:', error);
        if (ativo) setStatus('bloqueado');
      }
    }

    void validar();

    return () => {
      ativo = false;
    };
  }, [authLoading, user, isAdmin]);

  if (authLoading || status === 'carregando') {
    return <PageLoader texto="Verificando autorização..." />;
  }

  if (status !== 'liberado') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default AccessRoute;
