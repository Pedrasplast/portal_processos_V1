import { FiFolder, FiHome, FiSettings, FiX } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';

function Sidebar({ open, onClose }) {
  const { isAdmin } = useAuth();

  const linkClass = ({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`;

  return (
    <>
      <div className={`sidebar-overlay${open ? ' open' : ''}`} onClick={onClose} />

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar__brand">
          <img src="/Logo_Pedrasplast.png" alt="Pedrasplast" className="sidebar__logo" />
          <button type="button" className="sidebar__close" onClick={onClose} aria-label="Fechar menu">
            <FiX />
          </button>
        </div>

        <nav className="sidebar__nav">
          <NavLink to="/" end className={linkClass} onClick={onClose}>
            <FiHome />
            <span>Início</span>
          </NavLink>

          <NavLink to="/pops" className={linkClass} onClick={onClose}>
            <FiFolder />
            <span>Repositório</span>
          </NavLink>

          {isAdmin && (
            <NavLink to="/admin" className={linkClass} onClick={onClose}>
              <FiSettings />
              <span>Painel Administrativo</span>
            </NavLink>
          )}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
