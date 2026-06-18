import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

const MANAGEMENT_ITEMS: NavItem[] = [
  { label: 'Дашборд', to: '/admin', icon: 'dashboard' },
  { label: 'Ремонты', to: '/admin/repairs', icon: 'build' },
  { label: 'Заказы', to: '/admin/orders', icon: 'shopping_bag' },
  { label: 'Склад', to: '/admin/inventory', icon: 'inventory_2' },
];

const USER_ITEMS: NavItem[] = [
  { label: 'Клиенты и Сотрудники', to: '/admin/users', icon: 'group' },
];

function NavItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/admin'}
      className={({ isActive }) =>
        `flex items-center gap-sm px-4 py-3 rounded-lg transition-colors text-label-md ${
          isActive
            ? 'bg-primary-container text-on-primary-container shadow-sm'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`material-symbols-outlined${isActive ? ' fill' : ''}`}>{item.icon}</span>
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col h-[calc(100vh-160px)] sticky top-24">
      <div className="bg-surface rounded-xl border border-outline-variant p-sm flex flex-col gap-xs flex-1 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-xs">
          <p className="px-4 py-2 text-label-sm font-bold text-on-surface-variant/50 uppercase tracking-widest">
            Управление
          </p>
          {MANAGEMENT_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-xs">
          <p className="px-4 py-2 text-label-sm font-bold text-on-surface-variant/50 uppercase tracking-widest">
            Пользователи
          </p>
          {USER_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-outline-variant flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold">
              ИИ
            </div>
            <div className="flex flex-col">
              <span className="text-label-md font-bold text-on-surface">Иван Иванов</span>
              <span className="text-label-sm text-on-surface-variant">Администратор</span>
            </div>
          </div>
          <button className="flex items-center gap-sm px-4 py-3 rounded-lg text-error hover:bg-error-container hover:text-on-error-container transition-colors text-label-md w-full">
            <span className="material-symbols-outlined">logout</span>
            Выйти
          </button>
        </div>
      </div>
    </aside>
  );
}
