import { Navigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import PageLoader from '../feedback/PageLoader';

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <PageLoader texto="Verificando acesso administrativo..." />;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  return children;
}

export default AdminRoute;
