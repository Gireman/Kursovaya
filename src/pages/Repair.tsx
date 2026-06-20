interface Feature {
  icon: string;
  title: string;
  text: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'check_circle',
    title: 'Бесплатная диагностика',
    text: 'При последующем ремонте в нашем сервисном центре.',
  },
  {
    icon: 'build',
    title: 'Квалифицированный ремонт',
    text: 'Используем только оригинальные запчасти и проверенные аналоги.',
  },
  {
    icon: 'lan',
    title: 'Монтаж сетей',
    text: 'Проектирование и прокладка локальных вычислительных сетей любой сложности.',
  },
];

const STORES = ['ТЦ «Электроника», 2 этаж', 'Пр-т Мира, д. 15 (вход со двора)'];

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-start space-x-sm">
        <div className="bg-primary-container p-xs rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-white">{feature.icon}</span>
        </div>
        <div>
          <h3 className="text-body-lg font-bold text-on-surface mb-base">{feature.title}</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">{feature.text}</p>
        </div>
      </div>
    </div>
  );
}

function InfoColumn() {
  return (
    <div className="lg:col-span-5 flex flex-col space-y-md">
      <div>
        <h1 className="font-display-lg text-display-lg text-primary mb-sm">
          Диагностика <span className="block">и ремонт</span>
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Оставьте заявку, и наши специалисты оперативно решат вашу проблему.
        </p>
      </div>
      <div className="space-y-md">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </div>
    </div>
  );
}

function ContactColumn() {
  return (
    <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] p-lg border border-outline-variant">
      <div className="flex flex-col h-full">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">Как заказать ремонт</h2>
        <div className="space-y-md flex-grow">
          <p className="text-body-lg text-on-surface-variant">
            Для получения услуг по ремонту и обслуживанию техники, пожалуйста, посетите наш сервисный центр
            или любой из розничных магазинов нашей сети.
          </p>

          <div className="bg-surface-container-low p-md rounded-lg border border-outline-variant">
            <h3 className="text-body-md font-bold text-on-surface mb-xs">Наш центральный офис</h3>
            <p className="text-body-md text-on-surface-variant mb-xs flex items-center">
              <span className="material-symbols-outlined text-primary mr-xs">location_on</span>
              ул. Техническая, д. 42, Москва
            </p>
            <p className="text-body-md text-on-surface-variant mb-xs flex items-center">
              <span className="material-symbols-outlined text-primary mr-xs">call</span>
              +7 (495) 000-00-00
            </p>
            <p className="text-body-md text-on-surface-variant flex items-center">
              <span className="material-symbols-outlined text-primary mr-xs">schedule</span>
              Ежедневно: 10:00 — 21:00
            </p>
          </div>

          <div className="space-y-sm">
            <h3 className="text-body-md font-bold text-on-surface">Наши магазины</h3>
            <ul className="space-y-xs">
              {STORES.map((store) => (
                <li key={store} className="flex items-center text-body-md text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary mr-xs">store</span>
                  {store}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-lg p-md border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center bg-surface-container">
            <div className="text-center">
              <span className="material-symbols-outlined text-primary text-display-lg mb-xs">map</span>
              <p className="text-label-md text-on-surface-variant">Интерактивная карта магазинов</p>
            </div>
          </div>
        </div>

        <div className="mt-lg">
          <p className="text-body-md font-bold text-primary">
            Ждем вас! Мы всегда готовы помочь с любой технической проблемой.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Repair() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
      <InfoColumn />
      <ContactColumn />
    </div>
  );
}
