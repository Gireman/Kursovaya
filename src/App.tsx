import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { CartProvider } from './cart/CartContext';
import { ROLE_EMPLOYEE, ROLE_CLIENT } from './api/auth';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Repair from './pages/Repair';
import Cart from './pages/Cart';
import Auth from './pages/Auth';
import Account from './pages/Account';
import Inventory from './pages/admin/Inventory';
import Users from './pages/admin/Users';
import Orders from './pages/admin/Orders';
import Repairs from './pages/admin/Repairs';
import Dashboard from './pages/admin/Dashboard';

function FullScreenLoader() {
  return (
    <div className="bg-background min-h-screen flex items-center justify-center text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      Загрузка...
    </div>
  );
}

// Доступ только сотрудникам (роль 2). Аноним → на вход, клиент → на витрину.
function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== ROLE_EMPLOYEE) return <Navigate to="/" replace />;
  return <AdminLayout />;
}

// Доступ только клиентам (роль 1). Аноним → на вход, сотрудник → в админ-панель.
function RequireClient({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== ROLE_CLIENT) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

// Не-админские страницы: сотрудника всегда уводим в админ-панель.
function NonAdminOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user?.role === ROLE_EMPLOYEE) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
        <Routes>
          <Route
            path="/"
            element={
              <NonAdminOnly>
                <PublicLayout />
              </NonAdminOnly>
            }
          >
            <Route index element={<Home />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="repair" element={<Repair />} />
            <Route path="cart" element={<Cart />} />
          </Route>
          <Route
            path="/auth"
            element={
              <NonAdminOnly>
                <Auth />
              </NonAdminOnly>
            }
          />
          <Route
            path="/account"
            element={
              <RequireClient>
                <Account />
              </RequireClient>
            }
          />
          <Route path="/admin" element={<RequireAdmin />}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="repairs" element={<Repairs />} />
            <Route path="orders" element={<Orders />} />
            <Route path="users" element={<Users />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
