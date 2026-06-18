import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import Inventory from './pages/admin/Inventory';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div className="text-on-surface-variant p-8 text-center">Дашборд — в разработке</div>} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="repairs" element={<div className="text-on-surface-variant p-8 text-center">Ремонты — в разработке</div>} />
          <Route path="orders" element={<div className="text-on-surface-variant p-8 text-center">Заказы — в разработке</div>} />
          <Route path="users" element={<div className="text-on-surface-variant p-8 text-center">Клиенты и сотрудники — в разработке</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/admin/inventory" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
