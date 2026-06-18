import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Дашборд', to: '/admin' },
  { label: 'Ремонты', to: '/admin/repairs' },
  { label: 'Заказы', to: '/admin/orders' },
  { label: 'Склад', to: '/admin/inventory' },
  { label: 'Клиенты и сотрудники', to: '/admin/users' },
];

export function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant mt-auto">
      <div className="max-w-[1280px] mx-auto px-lg py-xl grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="flex flex-col gap-sm">
          <span className="font-bold text-primary text-xl">VERTEX</span>
          <span className="text-label-md text-on-surface-variant">© 2026 VERTEX. Все права защищены.</span>
        </div>
        <div className="col-span-1 md:col-span-2 flex flex-wrap gap-md justify-start md:justify-end items-center">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-label-md text-on-surface-variant hover:text-secondary underline transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
