import { FiArrowRight, FiFolder, FiSettings } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../hooks/useAuth';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <AppLayout>
      <section className="home-hero">
        <div>
          <span className="home-hero__eyebrow">Portal de Processos</span>
          <h1>Repositório de Processos Organizacionais</h1>
          <p>Consulte POPs, Fluxogramas e Mapas Visuais em um único ambiente.</p>
        </div>
      </section>

      <section className="home-grid">
        <button type="button" className="home-card" onClick={() => navigate('/pops')}>
          <span className="home-card__icon home-card__icon--blue">
            <FiFolder />
          </span>
          <strong>Repositório</strong>
          <p>Consulte e baixe os documentos organizados por setor e numeração.</p>
          <span className="home-card__link">Acessar <FiArrowRight /></span>
        </button>

        {isAdmin && (
          <button type="button" className="home-card" onClick={() => navigate('/admin')}>
            <span className="home-card__icon">
              <FiSettings />
            </span>
            <strong>Painel Administrativo</strong>
            <p>Gerencie documentos, usuários autorizados e solicitações de acesso.</p>
            <span className="home-card__link">Gerenciar <FiArrowRight /></span>
          </button>
        )}
      </section>
    </AppLayout>
  );
}

export default Home;
