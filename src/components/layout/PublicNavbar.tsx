import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Каталог', to: '#' },
  { label: 'Готовые сборки', to: '#' },
  { label: 'Ремонт', to: '#' },
  { label: 'О нас', to: '#' },
];

export function PublicNavbar() {
  return (
    <header className="bg-surface border-b border-outline-variant sticky top-0 z-50">
      <div className="max-w-container-max mx-auto px-lg w-full h-16 flex items-center justify-between gap-md">
        {/* Логотип */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined font-bold">memory</span>
          </div>
          <span className="text-2xl tracking-tight font-bold text-on-background">VERTEX</span>
        </Link>

        {/* Навигация */}
        <nav className="hidden md:flex items-center gap-md">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.to}
              className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Поиск + действия */}
        <div className="flex items-center gap-sm">
          <div className="relative hidden lg:block">
            <input
              className="pl-10 pr-4 py-2 bg-surface-container rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface placeholder-on-surface-variant outline-none"
              placeholder="Поиск товаров..."
              type="text"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
          </div>
          <a
            href="#"
            className="text-on-surface-variant hover:text-primary transition-colors p-2 active:opacity-80"
            aria-label="Корзина"
          >
            <span className="material-symbols-outlined">shopping_cart</span>
          </a>
          <Link
            to="/auth"
            className="text-on-surface-variant hover:text-primary transition-colors p-2 active:opacity-80"
            aria-label="Личный кабинет"
          >
            <span className="material-symbols-outlined">person</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
