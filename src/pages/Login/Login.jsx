import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCheckCircle, FiClock, FiLogIn, FiXCircle } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

import { ACESSO_STORAGE_KEY, STATUS_ACESSO } from '../../config/acesso';
import { useAuth } from '../../hooks/useAuth';
import { loginComSenha, obterPerfil, sair } from '../../services/authService';
import {
  cancelarSolicitacao,
  criarSolicitacao,
  obterAprovacaoPermanente,
  obterSolicitacao,
} from '../../services/solicitacoesService';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const {
    user,
    sessionId,
    isAdmin,
    loading: authLoading,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState(
    localStorage.getItem(ACESSO_STORAGE_KEY) || '',
  );
  const [aguardando, setAguardando] = useState(false);
  const intervaloRef = useRef(null);

  const pararMonitoramento = useCallback(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  }, []);

  const limparSolicitacaoLocal = useCallback(() => {
    localStorage.removeItem(ACESSO_STORAGE_KEY);
    setSolicitacaoId('');
    setAguardando(false);
  }, []);

  const verificarSolicitacao = useCallback(
    async (id, usuarioId, sessaoId) => {
      try {
        const solicitacao = await obterSolicitacao({
          id,
          userId: usuarioId,
          sessionId: sessaoId,
        });

        if (!solicitacao) {
          pararMonitoramento();
          limparSolicitacaoLocal();
          return;
        }

        if (solicitacao.status === STATUS_ACESSO.APROVADO) {
          pararMonitoramento();
          localStorage.setItem(ACESSO_STORAGE_KEY, solicitacao.id);
          navigate('/', { replace: true });
          return;
        }

        if (
          solicitacao.status === STATUS_ACESSO.NEGADO ||
          solicitacao.status === STATUS_ACESSO.CANCELADO
        ) {
          pararMonitoramento();
          limparSolicitacaoLocal();
          await sair();
          setSenha('');
          setErro(
            solicitacao.status === STATUS_ACESSO.NEGADO
              ? 'O administrador negou sua solicitação de acesso.'
              : 'A solicitação foi cancelada.',
          );
        }
      } catch (error) {
        console.error('Erro ao verificar solicitação:', error);
      }
    },
    [limparSolicitacaoLocal, navigate, pararMonitoramento],
  );

  const iniciarMonitoramento = useCallback(
    (id, usuarioId, sessaoId) => {
      pararMonitoramento();
      void verificarSolicitacao(id, usuarioId, sessaoId);

      intervaloRef.current = setInterval(() => {
        void verificarSolicitacao(id, usuarioId, sessaoId);
      }, 2500);
    },
    [pararMonitoramento, verificarSolicitacao],
  );

  useEffect(() => {
    if (authLoading) return undefined;

    let ativo = true;

    async function restaurarAcesso() {
      if (isAdmin) {
        navigate('/admin', { replace: true });
        return;
      }

      if (!user) return;

      try {
        const aprovacao = await obterAprovacaoPermanente(user.id);

        if (!ativo) return;

        // Depois da primeira aprovação, o usuário permanece autorizado.
        if (aprovacao) {
          pararMonitoramento();
          limparSolicitacaoLocal();
          navigate('/', { replace: true });
          return;
        }

        // Enquanto ainda não foi aprovado, restaura apenas a solicitação
        // pendente da sessão atual para continuar monitorando a decisão.
        if (sessionId && solicitacaoId) {
          setAguardando(true);
          iniciarMonitoramento(solicitacaoId, user.id, sessionId);
        }
      } catch (error) {
        console.error('Erro ao restaurar autorização:', error);
      }
    }

    void restaurarAcesso();

    return () => {
      ativo = false;
    };
  }, [
    authLoading,
    user,
    sessionId,
    isAdmin,
    solicitacaoId,
    iniciarMonitoramento,
    limparSolicitacaoLocal,
    navigate,
    pararMonitoramento,
  ]);

  useEffect(() => () => pararMonitoramento(), [pararMonitoramento]);

  const handleLogin = useCallback(
    async (event) => {
      event.preventDefault();
      setErro('');
      setLoading(true);
      setAguardando(false);
      setSolicitacaoId('');
      pararMonitoramento();
      localStorage.removeItem(ACESSO_STORAGE_KEY);

      let usuarioAutenticado = false;

      try {
        const resultadoLogin = await loginComSenha(email, senha);
        usuarioAutenticado = true;

        const perfil = await obterPerfil(resultadoLogin.user.id);

        if (perfil?.regra === 'admin') {
          navigate('/admin', { replace: true });
          return;
        }

        // A aprovação é permanente. Se este usuário já teve uma solicitação
        // aprovada anteriormente, entra direto e não cria outro pedido.
        const aprovacaoExistente = await obterAprovacaoPermanente(
          resultadoLogin.user.id,
        );

        if (aprovacaoExistente) {
          limparSolicitacaoLocal();
          navigate('/', { replace: true });
          return;
        }

        // Somente usuários ainda não aprovados geram uma solicitação pendente.
        const solicitacao = await criarSolicitacao({
          userId: resultadoLogin.user.id,
          email: resultadoLogin.user.email || email,
          sessionId: resultadoLogin.sessionId,
        });

        localStorage.setItem(ACESSO_STORAGE_KEY, solicitacao.id);
        setSolicitacaoId(solicitacao.id);
        setAguardando(true);

        iniciarMonitoramento(
          solicitacao.id,
          resultadoLogin.user.id,
          resultadoLogin.sessionId,
        );
      } catch (error) {
        if (usuarioAutenticado) {
          localStorage.removeItem(ACESSO_STORAGE_KEY);
          try {
            await sair();
          } catch (logoutError) {
            console.error('Erro ao encerrar sessão após falha:', logoutError);
          }
        }

        console.error('Erro ao realizar login:', error);
        setErro(error?.message || 'E-mail ou senha inválidos.');
      } finally {
        setLoading(false);
      }
    },
    [
      email,
      senha,
      iniciarMonitoramento,
      limparSolicitacaoLocal,
      navigate,
      pararMonitoramento,
    ],
  );

  const handleCancelar = useCallback(async () => {
    pararMonitoramento();

    try {
      if (user && sessionId && solicitacaoId) {
        await cancelarSolicitacao({
          id: solicitacaoId,
          userId: user.id,
          sessionId,
        });
      }
    } catch (error) {
      console.error('Erro ao cancelar solicitação:', error);
    } finally {
      limparSolicitacaoLocal();
      setSenha('');
      try {
        await sair();
      } catch (error) {
        console.error('Erro ao sair:', error);
      }
    }
  }, [
    limparSolicitacaoLocal,
    pararMonitoramento,
    sessionId,
    solicitacaoId,
    user,
  ]);

  if (aguardando) {
    return (
      <div className="login-page">
        <section className="login-card login-card--waiting">
          <img src="/Logo_Pedrasplast.png" alt="Pedrasplast" className="login-logo" />
          <div className="waiting-icon">
            <FiClock />
          </div>
          <h1>Aguardando autorização</h1>
          <p>
            Seu login foi validado. Assim que o administrador aprovar esta solicitação,
            o acesso será liberado automaticamente.
          </p>
          <div className="waiting-status">
            <span className="waiting-spinner" />
            Solicitação pendente
          </div>
          <button
            type="button"
            className="btn btn-secondary login-full"
            onClick={handleCancelar}
          >
            <FiXCircle /> Cancelar solicitação
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <img src="/Logo_Pedrasplast.png" alt="Pedrasplast" className="login-logo" />
        <div className="login-heading-icon">
          <FiLogIn />
        </div>
        <h1>Acesso ao Portal</h1>
        <p>Entre com suas credenciais. A aprovação do administrador é necessária apenas no primeiro acesso.</p>

        {erro && <div className="login-error">{erro}</div>}

        <div className="form-group">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            className="form-control"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="seu-email@dominio.com"
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            className="form-control"
            type="password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary login-full" disabled={loading}>
          <FiCheckCircle />
          {loading ? 'Validando...' : 'Entrar'}
        </button>

        <div className="login-register">
          <span>Primeiro acesso?</span>
          <Link to="/cadastro">Criar conta</Link>
        </div>
      </form>
    </div>
  );
}

export default Login;
