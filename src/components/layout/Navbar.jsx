import { FiLogIn, FiLogOut, FiMenu, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { nomePorEmail } from '../../utils/texto';

function Navbar({ onMenu }) {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();

  async function handleAuth() {
    if (!user) {
      navigate('/login');
      return;
    }

    await logout();
    navigate('/login', { replace: true });
  }

  const nomeUsuario = profile?.nome || nomePorEmail(user?.email);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          className="topbar__menu"
          type="button"
          onClick={onMenu}
          aria-label="Abrir menu"
        >
          <FiMenu />
        </button>
        <img src="/Logo_Pedrasplast.png" alt="Pedrasplast" className="topbar__logo" />
      </div>

      <div className="topbar__right">
        {user && (
          <div className="topbar__user">
            <span className="topbar__avatar" aria-hidden="true">
              <FiUser />
            </span>
            <span className="topbar__user-name">{nomeUsuario}</span>
          </div>
        )}

        <button
          type="button"
          className="topbar__auth"
          onClick={handleAuth}
          aria-label={user ? 'Sair do sistema' : 'Entrar no sistema'}
        >
          {user ? <FiLogOut /> : <FiLogIn />}
        </button>
      </div>
    </header>
  );
}

export default Navbar;
