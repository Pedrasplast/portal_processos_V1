import { useCallback, useEffect, useState } from 'react';

import AppLayout from '../../components/layout/AppLayout';
import { useDocumentos } from '../../hooks/useDocumentos';
import { useMensagem } from '../../hooks/useMensagem';
import { listarSolicitacoes, STATUS_ACESSO } from '../../services/solicitacoesService';
import AccessRequestsPanel from './components/AccessRequestsPanel';
import AdminTabs from './components/AdminTabs';
import DocumentsPanel from './components/DocumentsPanel';
import UsersPanel from './components/UsersPanel';
import './Admin.css';

function Admin() {
  const [tab, setTab] = useState('documentos');
  const [pendentes, setPendentes] = useState(0);
  const { documentos, loading, erro, recarregar } = useDocumentos();
  const { mensagem, mostrarMensagem } = useMensagem();

  const atualizarPendentes = useCallback(async () => {
    try {
      const solicitacoes = await listarSolicitacoes();
      setPendentes(
        solicitacoes.filter((item) => item.status === STATUS_ACESSO.PENDENTE).length,
      );
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void atualizarPendentes();
    const interval = setInterval(() => void atualizarPendentes(), 5000);
    return () => clearInterval(interval);
  }, [atualizarPendentes]);

  return (
    <AppLayout>
      <header className="page-header">
        <h2>Painel Administrativo</h2>
        <p>Gerenciamento de documentos, usuários e liberações de acesso.</p>
      </header>

      <AdminTabs tab={tab} onChange={setTab} pendingCount={pendentes} />

      {mensagem.texto && <div className={`alert ${mensagem.tipo}`}>{mensagem.texto}</div>}

      {tab === 'documentos' && (
        <DocumentsPanel
          documentos={documentos}
          loading={loading}
          erro={erro}
          onReload={recarregar}
          notify={mostrarMensagem}
        />
      )}

      {tab === 'usuarios' && <UsersPanel notify={mostrarMensagem} />}

      {tab === 'solicitacoes' && (
        <AccessRequestsPanel
          notify={mostrarMensagem}
          onPendingCountChange={setPendentes}
        />
      )}
    </AppLayout>
  );
}

export default Admin;
