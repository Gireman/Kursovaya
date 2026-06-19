import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import Inventory from './pages/admin/Inventory';
import Users from './pages/admin/Users';
import Orders from './pages/admin/Orders';
import Repairs from './pages/admin/Repairs';
import Dashboard from './pages/admin/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="repairs" element={<Repairs />} />
          <Route path="orders" element={<Orders />} />
          <Route path="users" element={<Users />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin/inventory" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
