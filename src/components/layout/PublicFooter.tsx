const FOOTER_COLUMNS = [
  {
    title: 'Магазин',
    links: ['Процессоры', 'Видеокарты', 'Готовые сборки', 'Ноутбуки'],
  },
  {
    title: 'Сервис',
    links: ['Ремонт ПК', 'Диагностика', 'Гарантия', 'Доставка и оплата'],
  },
  {
    title: 'Компания',
    links: ['О нас', 'Контакты', 'Отзывы', 'Вакансии'],
  },
];

export function PublicFooter() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant mt-auto">
      <div className="max-w-container-max mx-auto px-lg w-full py-xl grid grid-cols-2 md:grid-cols-4 gap-md">
        {/* Бренд */}
        <div className="col-span-2 md:col-span-1 flex flex-col gap-sm">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined">memory</span>
            </div>
            <span className="text-xl font-bold text-on-background">VERTEX</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Профессиональный ремонт и мощные решения для вашего ПК.
          </p>
        </div>

        {/* Колонки ссылок */}
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title} className="flex flex-col gap-xs">
            <span className="font-label-md text-label-md font-bold text-on-surface">{col.title}</span>
            {col.links.map((link) => (
              <a
                key={link}
                href="#"
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-outline-variant">
        <div className="max-w-container-max mx-auto px-lg w-full py-md flex flex-col sm:flex-row gap-xs items-center justify-between">
          <span className="font-label-md text-label-md text-on-surface-variant">
            © 2026 VERTEX. Все права защищены.
          </span>
          <div className="flex items-center gap-md text-on-surface-variant">
            <a href="#" className="hover:text-primary transition-colors" aria-label="Телефон">
              <span className="material-symbols-outlined">call</span>
            </a>
            <a href="#" className="hover:text-primary transition-colors" aria-label="Почта">
              <span className="material-symbols-outlined">mail</span>
            </a>
            <a href="#" className="hover:text-primary transition-colors" aria-label="Адрес">
              <span className="material-symbols-outlined">location_on</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
