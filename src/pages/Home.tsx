import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../cart/CartContext';

function formatRub(value: number): string {
  return value.toLocaleString('ru-RU') + ' ₽';
}

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBys0ck2IZef9POzBkHjo3aWeuiP2r_2pIrEKFxIxJ1fev5AafC8kc2a9D_DqgrRGgLik3UUgQIJS6iVd5x6faUvl00HA2uw2F-hauiKJp_Pz3daBGGRj4wNuS7_wYsHCFR5XPlVrxQ8KHNsrKvuyuks2rHDMVxdpUmP_jePYL0Cp-cOvDdgql2CG1IkdIX_ioqHj8mTFDEnu06LxD1lpOQvUihFXlIVhL_RgnFj-cIhNGrSPe0wqBwQ7vioj0EJ0fLVmcGD7X2Ud4';

interface Category {
  label: string;
  icon: string;
}

const CATEGORIES: Category[] = [
  { label: 'Процессоры', icon: 'memory' },
  { label: 'Видеокарты', icon: 'developer_board' },
  { label: 'Готовые сборки', icon: 'computer' },
  { label: 'Ноутбуки', icon: 'laptop_mac' },
];

interface Product {
  id: number; // products.Id в БД
  name: string;
  price: number;
  rating: string;
  reviews: string;
  badge: string;
  image: string;
}

const PRODUCTS: Product[] = [
  {
    id: 11,
    name: 'Intel Core i9-14900K',
    price: 65990,
    rating: '4.9',
    reviews: '128 отзывов',
    badge: 'В наличии',
    image:
      'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQO1DqRVX94ToAhCE54A-3GlBIRbdYBSfzrVyceJg950MrA6uzpvYZjuLcoOp1e-oKwmYNDgC5bFESFdRw48BqeDWpOGVcIlBT-7X5ZbzjeqgJFqYZP2rZTMCodeuQZ088iF-7UsA&usqp=CAc',
  },
  {
    id: 12,
    name: 'NVIDIA GeForce RTX 4080 Super',
    price: 124500,
    rating: '5.0',
    reviews: '84 отзыва',
    badge: 'В наличии',
    image:
      'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcTeTDR2PIa7n-BZHWnzNvpjUn_ZysJW6npBr7kG1HCXaM3NoSbfdgeVF8UXG75ziuSWS8lT8mQXEqg7Ykbp_taQT_c5BZwaNI5EJMat9VZW&usqp=CAc',
  },
  {
    id: 13,
    name: "Сборка 'Cyber PRO' (i7/RTX4070)",
    price: 189000,
    rating: '4.8',
    reviews: '45 отзывов',
    badge: 'Сборка',
    image:
      'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRzFFUpJGD5M59brPe-CwFXvXCCw09jaJF2b_UACM9RoIFNF8_Je7wG9rSA_poqC7uU9ptnamXBOOhabsa2pM2I4LfjCZBi9ydRgqWg-zu4xXnPAAe6lUQly9OYVqhWSJDg8K-4J38Fug&usqp=CAc',
  },
  {
    id: 14,
    name: 'ASUS ROG Zephyrus G16',
    price: 215900,
    rating: '4.9',
    reviews: '32 отзыва',
    badge: 'Новинка',
    image:
      'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTWsDFELX0IWDyYea-3ollTmEakmpvS6dvV-DWcq3PkE8fAuF5pz6Cu_AV-KxRnxprg9RcDa-9x4eWTyqKr2xbtBXPLh7tF8_vCbN7Ze-Zs1NM8PVZx68BQSEKHNiv5r-60arY1Gw&usqp=CAc',
  },
];

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-surface-container-low border border-outline-variant">
      <div className="grid grid-cols-1 md:grid-cols-2 items-center">
        <div className="p-xl space-y-md z-10">
          <h1 className="font-display-lg text-display-lg text-on-surface">
            Профессиональный <span className="text-primary">ремонт</span> и{' '}
            <span className="text-primary">мощные решения</span> для вашего ПК
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            От быстрой диагностики до сборки игровых станций мечты. Официальная гарантия и оригинальные
            комплектующие.
          </p>
          <div className="flex flex-wrap gap-sm pt-sm">
            <a
              href="#"
              className="bg-primary text-on-primary px-lg h-12 rounded-lg font-label-md hover:shadow-md transition-all active:opacity-80 flex items-center justify-center hover:opacity-90"
            >
              Перейти в каталог
            </a>
            <Link
              to="/repair"
              className="border border-primary text-primary px-lg h-12 rounded-lg font-label-md hover:bg-primary/5 transition-all active:opacity-80 flex items-center justify-center"
            >
              Подробнее о ремонте
            </Link>
          </div>
        </div>
        <div className="relative h-full min-h-[400px]">
          <img
            alt="Professional computer service workspace"
            className="absolute inset-0 w-full h-full object-cover"
            src={HERO_IMAGE}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-container-low via-transparent to-transparent md:block hidden" />
        </div>
      </div>
    </section>
  );
}

function PopularCategories() {
  return (
    <section className="space-y-md">
      <h2 className="font-headline-lg text-headline-lg text-on-surface">Популярные категории</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
        {CATEGORIES.map((cat) => (
          <a
            key={cat.label}
            href="#"
            className="bg-surface rounded-xl p-md flex flex-col items-center justify-center gap-sm shadow-sm hover:shadow-md transition-shadow border border-outline-variant hover:border-primary group"
          >
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined text-4xl">{cat.icon}</span>
            </div>
            <span className="font-label-md text-label-md text-on-surface">{cat.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add({ id: product.id, name: product.name, price: product.price, image: product.image });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group">
      <div className="h-48 bg-surface-container-lowest relative overflow-hidden">
        <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
        <div className="absolute top-2 left-2 bg-secondary/20 text-secondary px-3 py-1 rounded-full font-label-sm text-label-sm shadow-sm">
          {product.badge}
        </div>
      </div>
      <div className="p-md flex flex-col flex-grow gap-xs">
        <div className="flex items-center text-secondary gap-1">
          <span className="material-symbols-outlined text-sm fill">star</span>
          <span className="font-label-md text-label-md">
            {product.rating} ({product.reviews})
          </span>
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface text-xl font-bold">{product.name}</h3>
        <div className="mt-auto pt-sm space-y-sm">
          <div className="font-headline-lg text-headline-lg text-primary font-bold">{formatRub(product.price)}</div>
          <button
            type="button"
            onClick={handleAdd}
            className={`w-full h-12 rounded-lg flex items-center justify-center gap-xs hover:shadow-md transition-all active:opacity-80 ${
              added ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary hover:opacity-90'
            }`}
          >
            <span className="material-symbols-outlined">{added ? 'check' : 'shopping_cart'}</span>
            <span className="font-label-md">{added ? 'Добавлено' : 'В корзину'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FeaturedProducts() {
  return (
    <section className="space-y-md">
      <h2 className="font-headline-lg text-headline-lg text-on-surface">Рекомендуемые товары</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <PopularCategories />
      <FeaturedProducts />
    </>
  );
}
