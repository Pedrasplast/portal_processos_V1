import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheck, FiRefreshCw, FiX } from 'react-icons/fi';

import { STATUS_ACESSO } from '../../../config/acesso';
import { listarPerfis } from '../../../services/perfisService';
import {
  atualizarStatus,
  listarSolicitacoes,
} from '../../../services/solicitacoesService';

const PESO_STATUS = {
  [STATUS_ACESSO.PENDENTE]: 0,
  [STATUS_ACESSO.APROVADO]: 1,
  [STATUS_ACESSO.NEGADO]: 2,
  [STATUS_ACESSO.CANCELADO]: 3,
};

function formatarData(valor) {
  if (!valor) return '—';

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function AccessRequestsPanel({ notify, onPendingCountChange }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);

    try {
      const [listaSolicitacoes, listaPerfis] = await Promise.all([
        listarSolicitacoes(),
        listarPerfis(),
      ]);

      setSolicitacoes(listaSolicitacoes);
      setPerfis(listaPerfis);
      onPendingCountChange(
        listaSolicitacoes.filter((item) => item.status === STATUS_ACESSO.PENDENTE).length,
      );
    } catch (error) {
      if (!silencioso) {
        notify('erro', `Erro ao carregar solicitações: ${error.message}`);
      }
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [notify, onPendingCountChange]);

  useEffect(() => {
    void carregar();
    const interval = setInterval(() => void carregar(true), 3000);
    return () => clearInterval(interval);
  }, [carregar]);

  const perfilPorId = useMemo(() => {
    const mapa = new Map();
    perfis.forEach((perfil) => mapa.set(perfil.id, perfil));
    return mapa;
  }, [perfis]);

  const ordenadas = useMemo(
    () =>
      [...solicitacoes].sort((a, b) => {
        const diferencaStatus = (PESO_STATUS[a.status] ?? 99) - (PESO_STATUS[b.status] ?? 99);
        if (diferencaStatus !== 0) return diferencaStatus;
        return new Date(b.criado_em || 0) - new Date(a.criado_em || 0);
      }),
    [solicitacoes],
  );

  async function decidir(id, status) {
    setProcessandoId(id);

    try {
      await atualizarStatus(id, status);
      notify(
        'sucesso',
        status === STATUS_ACESSO.APROVADO
          ? 'Acesso aprovado. Este usuário não precisará solicitar aprovação novamente.'
          : 'Solicitação negada.',
      );
      await carregar(true);
    } catch (error) {
      notify('erro', `Erro ao atualizar solicitação: ${error.message}`);
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-card__header admin-card__header--actions">
        <div>
          <h3>Solicitações de Acesso</h3>
          <p>
            Usuários ainda não aprovados geram uma solicitação de acesso.
            Depois de aprovada, a autorização permanece válida nos próximos logins.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => carregar()}
          disabled={loading}
        >
          <FiRefreshCw /> Atualizar
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table requests-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Solicitado em</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && solicitacoes.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">Carregando solicitações...</td>
              </tr>
            ) : ordenadas.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">Nenhuma solicitação encontrada.</td>
              </tr>
            ) : (
              ordenadas.map((solicitacao) => {
                const perfil = perfilPorId.get(solicitacao.user_id);
                const pendente = solicitacao.status === STATUS_ACESSO.PENDENTE;
                const processando = processandoId === solicitacao.id;

                return (
                  <tr key={solicitacao.id}>
                    <td><strong>{perfil?.nome || 'Usuário cadastrado'}</strong></td>
                    <td>{perfil?.email || solicitacao.email}</td>
                    <td>{formatarData(solicitacao.criado_em)}</td>
                    <td>
                      <span className={`status-badge status-badge--${String(solicitacao.status).toLowerCase()}`}>
                        {solicitacao.status}
                      </span>
                    </td>
                    <td>
                      {pendente ? (
                        <div className="request-actions">
                          <button
                            type="button"
                            className="btn btn-success"
                            disabled={processando}
                            onClick={() => decidir(solicitacao.id, STATUS_ACESSO.APROVADO)}
                          >
                            <FiCheck /> Aprovar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={processando}
                            onClick={() => decidir(solicitacao.id, STATUS_ACESSO.NEGADO)}
                          >
                            <FiX /> Negar
                          </button>
                        </div>
                      ) : (
                        <span className="request-finished">Finalizada</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AccessRequestsPanel;
