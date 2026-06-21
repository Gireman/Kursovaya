import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../cart/CartContext';
import { fetchInventory } from '../api/inventory';
import type { InventoryItem } from '../types';
import { getProductIcon, PRODUCT_IMAGES } from '../utils/productMeta';

const PAGE_SIZE = 12;

function formatRub(v: number) {
  return v.toLocaleString('ru-RU') + ' ₽';
}

function pluralReviews(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} отзывов`;
  if (mod10 === 1) return `${n} отзыв`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} отзыва`;
  return `${n} отзывов`;
}

function getProductMeta(id: string): { rating: string; reviews: number } {
  const n = parseInt(id, 10) || 0;
  const ratings = [4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 4.3, 4.4];
  const rating = ratings[n % ratings.length].toFixed(1);
  const reviews = 15 + ((n * 17 + n * 7) % 180);
  return { rating, reviews };
}

type SortKey = 'popular' | 'price_asc' | 'price_desc' | 'rating';

interface Filters {
  priceMin: string;
  priceMax: string;
  inStockOnly: boolean;
}

const EMPTY_FILTERS: Filters = { priceMin: '', priceMax: '', inStockOnly: false };

// ── Кнопка сброса фильтров ─────────────────────────────────────────────────────
function ResetFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-xs w-full px-sm py-2 rounded-lg border border-outline-variant text-label-md font-label-md text-on-surface-variant hover:border-error hover:bg-error/5 hover:text-error transition-colors duration-200"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>filter_alt_off</span>
      Сбросить фильтры
    </button>
  );
}

// ── Карточка товара ────────────────────────────────────────────────────────────
function ProductCard({ item }: { item: InventoryItem }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const inStock = item.quantity > 0;
  const icon = getProductIcon(item.name);
  const image = PRODUCT_IMAGES[Number(item.id)] ?? '';
  const { rating, reviews } = getProductMeta(item.id);

  function handleAdd() {
    add({ id: Number(item.id), name: item.name, price: item.cost, image });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-sm flex flex-col gap-sm hover:shadow-[0px_8px_24px_rgba(0,0,0,0.1)] transition-shadow duration-300 group">
      {/* Фото или иконка */}
      <div className="aspect-square bg-surface-container rounded-lg overflow-hidden relative flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt={item.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span
            className="material-symbols-outlined text-primary/40 group-hover:text-primary/60 group-hover:scale-110 transition-all duration-300 select-none"
            style={{ fontSize: 80 }}
          >
            {icon}
          </span>
        )}
        <div
          className={`absolute top-2 left-2 text-label-sm font-label-sm px-2 py-1 rounded-full font-semibold ${
            inStock ? 'bg-secondary/15 text-secondary' : 'bg-error/15 text-error'
          }`}
        >
          {inStock ? 'В наличии' : 'Нет в наличии'}
        </div>
      </div>

      {/* Информация */}
      <div className="flex flex-col flex-grow gap-xs">
        <div className="flex items-center gap-1 text-label-sm font-label-sm">
          <span
            className="material-symbols-outlined text-secondary"
            style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span className="font-bold text-secondary">{rating}</span>
          <span className="text-on-surface-variant">({pluralReviews(reviews)})</span>
        </div>

        <h2 className="text-body-lg font-semibold text-on-surface leading-tight line-clamp-2 flex-grow">
          {item.name}
        </h2>

        <div className="text-headline-md font-headline-md text-primary mt-auto">{formatRub(item.cost)}</div>

        <button
          type="button"
          disabled={!inStock}
          onClick={handleAdd}
          className={`w-full py-2 rounded-lg text-label-md font-label-md font-bold mt-1 flex items-center justify-center gap-2 transition-colors ${
            !inStock
              ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
              : added
              ? 'bg-secondary text-on-secondary'
              : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {!inStock ? 'remove_shopping_cart' : added ? 'check' : 'add_shopping_cart'}
          </span>
          {!inStock ? 'Недоступно' : added ? 'Добавлено' : 'В корзину'}
        </button>
      </div>
    </div>
  );
}

// ── Страница каталога ──────────────────────────────────────────────────────────
export default function Catalog() {
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<SortKey>('popular');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchInventory()
      .then(setAllItems)
      .catch(() => setError('Не удалось загрузить товары'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let items = [...allItems];

    if (filters.inStockOnly) items = items.filter((i) => i.quantity > 0);

    const min = Number(filters.priceMin);
    const max = Number(filters.priceMax);
    if (min > 0) items = items.filter((i) => i.cost >= min);
    if (max > 0) items = items.filter((i) => i.cost <= max);

    switch (sort) {
      case 'price_asc':  items.sort((a, b) => a.cost - b.cost); break;
      case 'price_desc': items.sort((a, b) => b.cost - a.cost); break;
      case 'rating':
        items.sort((a, b) => parseFloat(getProductMeta(b.id).rating) - parseFloat(getProductMeta(a.id).rating));
        break;
    }

    return items;
  }, [allItems, filters, sort]);

  useEffect(() => setPage(1), [filters, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = !!(filters.priceMin || filters.priceMax || filters.inStockOnly);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
  }

  return (
    <div className="flex flex-col md:flex-row gap-gutter">
      {/* Сайдбар фильтров */}
      <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-lg">
        {/* Цена */}
        <div className="bg-surface-container-lowest rounded-lg p-sm border border-outline-variant">
          <h3 className="text-headline-md font-headline-md text-on-surface mb-sm">Цена</h3>
          <div className="flex gap-2 items-center">
            <input
              className="w-full border border-outline-variant rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-transparent"
              placeholder="От"
              type="number"
              min={0}
              value={filters.priceMin}
              onChange={(e) => setFilter('priceMin', e.target.value)}
            />
            <span className="text-on-surface-variant flex-shrink-0">—</span>
            <input
              className="w-full border border-outline-variant rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-transparent"
              placeholder="До"
              type="number"
              min={0}
              value={filters.priceMax}
              onChange={(e) => setFilter('priceMax', e.target.value)}
            />
          </div>
        </div>

        {/* В наличии */}
        <div className="bg-surface-container-lowest rounded-lg p-sm border border-outline-variant flex items-center justify-between">
          <span className="text-body-md font-body-md text-on-surface">В наличии</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              className="sr-only peer"
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => setFilter('inStockOnly', e.target.checked)}
            />
            <div className="w-11 h-6 bg-surface-variant peer-focus:ring-2 peer-focus:ring-primary-fixed rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
          </label>
        </div>

        {/* Сброс фильтров */}
        {hasActiveFilters && <ResetFiltersButton onClick={resetFilters} />}
      </aside>

      {/* Основной контент */}
      <div className="flex-grow flex flex-col gap-lg">
        {/* Заголовок и сортировка */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm">
          <div>
            <h1 className="text-headline-lg font-headline-lg text-on-surface">Каталог товаров</h1>
            {!loading && (
              <p className="text-label-md font-label-md text-on-surface-variant mt-xs">
                {filtered.length} товаров
              </p>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-surface-container-lowest border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-xs px-sm focus:ring-primary focus:border-primary cursor-pointer hover:bg-surface-container-low transition-colors h-10 outline-none"
          >
            <option value="popular">По популярности</option>
            <option value="price_asc">Сначала дешёвые</option>
            <option value="price_desc">Сначала дорогие</option>
            <option value="rating">По рейтингу</option>
          </select>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-xl text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            Загрузка...
          </div>
        )}

        {error && (
          <p className="text-label-md font-label-md text-error bg-error-container rounded-lg px-sm py-xs">{error}</p>
        )}

        {!loading && !error && (
          <>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-xl gap-sm text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: 56 }}>search_off</span>
                <p className="text-body-lg font-body-lg">Товары не найдены</p>
                <ResetFiltersButton onClick={resetFilters} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
                  {paginated.map((item) => (
                    <ProductCard key={item.id} item={item} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center mt-xl">
                    <nav className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-medium transition-colors ${
                            p === page
                              ? 'bg-primary text-on-primary font-bold'
                              : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
