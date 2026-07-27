import { useCallback, useEffect, useState } from 'react';
import { FiRefreshCw, FiUsers } from 'react-icons/fi';

import { listarPerfis } from '../../../services/perfisService';

function formatarData(valor) {
  if (!valor) return '—';

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function UsersPanel({ notify }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);

    try {
      setUsuarios(await listarPerfis());
    } catch (error) {
      notify('erro', `Erro ao carregar usuários: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <section className="admin-card">
      <div className="admin-card__header admin-card__header--actions">
        <div>
          <h3><FiUsers /> Usuários Cadastrados</h3>
          <p>
            Esta lista é criada automaticamente quando uma pessoa usa a opção
            “Criar conta” na tela de login.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={carregar}
          disabled={loading}
        >
          <FiRefreshCw /> {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Cadastrado em</th>
            </tr>
          </thead>
          <tbody>
            {loading && usuarios.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-state">Carregando usuários...</td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-state">Nenhum usuário cadastrado.</td>
              </tr>
            ) : (
              usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td><strong>{usuario.nome || 'Usuário'}</strong></td>
                  <td>{usuario.email || '—'}</td>
                  <td>
                    <span className={`status-badge status-badge--${usuario.regra === 'admin' ? 'aprovado' : 'pendente'}`}>
                      {usuario.regra === 'admin' ? 'ADMIN' : 'USUÁRIO'}
                    </span>
                  </td>
                  <td>{formatarData(usuario.criado_em)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default UsersPanel;
