import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import AccessRoute from './components/routes/AccessRoute';
import AdminRoute from './components/routes/AdminRoute';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Repository from './pages/Repository/Repository';
import Admin from './pages/Admin/Admin';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />

          <Route
            path="/"
            element={
              <AccessRoute>
                <Home />
              </AccessRoute>
            }
          />

          <Route
            path="/pops"
            element={
              <AccessRoute>
                <Repository />
              </AccessRoute>
            }
          />

          <Route path="/repositorio" element={<Navigate to="/pops" replace />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

          <Route path="/admin/pops" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
