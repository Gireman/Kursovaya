import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { useCart } from '../cart/CartContext';
import type { CartLine } from '../cart/CartContext';
import { useAuth } from '../auth/AuthContext';
import { fetchServices, checkoutCart } from '../api/orders';
import type { ServiceRef } from '../types';

function formatRub(value: number): string {
  return value.toLocaleString('ru-RU') + ' ₽';
}

// ── Карточка товара ───────────────────────────────────────────────────────────
function CartItem({
  item,
  onQuantityChange,
  onRemove,
}: {
  item: CartLine;
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="bg-surface rounded-lg p-md shadow-[0px_4px_12px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row items-center gap-md border border-outline-variant/30">
      <div className="w-24 h-24 bg-surface-container rounded-md overflow-hidden flex-shrink-0">
        <img alt={item.name} className="w-full h-full object-cover" src={item.image} />
      </div>
      <div className="flex-grow flex flex-col justify-center">
        <h3 className="font-headline-md text-body-lg text-on-background mb-xs">{item.name}</h3>
        <div className="font-headline-md text-headline-md font-bold text-primary">{formatRub(item.price)}</div>
      </div>
      <div className="flex items-center gap-sm mt-sm sm:mt-0">
        <div className="flex items-center border border-outline-variant rounded-md overflow-hidden">
          <button
            type="button"
            aria-label="Уменьшить количество"
            disabled={item.quantity <= 1}
            onClick={() => onQuantityChange(item.id, item.quantity - 1)}
            className="w-8 h-8 flex items-center justify-center bg-surface hover:bg-surface-container transition-colors text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <input
            className="w-12 h-8 text-center border-none bg-surface text-on-background font-body-md focus:ring-0 p-0 outline-none"
            readOnly
            type="text"
            value={item.quantity}
          />
          <button
            type="button"
            aria-label="Увеличить количество"
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
            className="w-8 h-8 flex items-center justify-center bg-surface hover:bg-surface-container transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
        <button
          type="button"
          aria-label="Удалить"
          onClick={() => onRemove(item.id)}
          className="text-error hover:text-on-error-container transition-colors p-xs rounded-full hover:bg-error-container"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  );
}

// ── Пустое состояние корзины ──────────────────────────────────────────────────
function EmptyCart() {
  return (
    <div className="bg-surface rounded-lg p-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-outline-variant/30 flex flex-col items-center justify-center text-center gap-sm">
      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 56 }}>
        remove_shopping_cart
      </span>
      <h3 className="font-headline-md text-headline-md text-on-surface">Ваша корзина пуста</h3>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-[28rem]">
        Добавьте товары из каталога, чтобы оформить заказ.
      </p>
      <Link
        to="/"
        className="mt-sm bg-primary text-on-primary px-lg h-12 rounded-lg font-label-md flex items-center justify-center hover:bg-primary-container transition-colors active:opacity-80"
      >
        Перейти в каталог
      </Link>
    </div>
  );
}

// ── Панель оформления (услуги + итоги) ────────────────────────────────────────
function Summary({
  services,
  selected,
  onToggleService,
  subtotal,
  servicesTotal,
  total,
  itemCount,
  canCheckout,
  checkingOut,
  error,
  onCheckout,
}: {
  services: ServiceRef[];
  selected: string[];
  onToggleService: (id: string) => void;
  subtotal: number;
  servicesTotal: number;
  total: number;
  itemCount: number;
  canCheckout: boolean;
  checkingOut: boolean;
  error: string;
  onCheckout: () => void;
}) {
  return (
    <div className="bg-surface rounded-xl p-lg shadow-[0px_8px_24px_rgba(0,0,0,0.1)] border border-outline-variant/30 sticky top-24">
      <h2 className="font-headline-md text-headline-md text-on-background border-b border-outline-variant pb-sm mb-md">
        Оформление
      </h2>

      <div className="mb-md">
        <h3 className="font-label-md text-label-md text-on-surface-variant mb-sm uppercase tracking-wide">
          Дополнительные услуги
        </h3>
        <div className="flex flex-col gap-xs">
          {services.map((service) => (
            <label
              key={service.id}
              className="flex items-center justify-between cursor-pointer p-sm rounded-md transition-colors hover:bg-surface-container-high"
            >
              <div className="flex items-center gap-xs">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded accent-primary cursor-pointer"
                  checked={selected.includes(service.id)}
                  onChange={() => onToggleService(service.id)}
                />
                <span className="font-body-md text-body-md text-on-background">{service.name}</span>
              </div>
              <span className="font-label-md text-label-md text-on-surface-variant">
                {service.price === 0 ? 'Бесплатно' : `+ ${formatRub(service.price)}`}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-outline-variant pt-md mb-md">
        <div className="flex justify-between items-end mb-sm">
          <span className="font-body-md text-body-md text-on-surface-variant">Товары ({itemCount})</span>
          <span className="font-body-md text-body-md text-on-background">{formatRub(subtotal)}</span>
        </div>
        <div className="flex justify-between items-end mb-sm">
          <span className="font-body-md text-body-md text-on-surface-variant">Услуги</span>
          <span className="font-body-md text-body-md text-on-background">{formatRub(servicesTotal)}</span>
        </div>
        <div className="flex justify-between items-end mt-md">
          <span className="font-headline-md text-body-lg text-on-background">Итого:</span>
          <span className="font-display-lg text-headline-lg text-primary">{formatRub(total)}</span>
        </div>
      </div>

      {error && (
        <p className="font-label-md text-label-md text-error bg-error-container rounded-lg px-sm py-xs mb-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!canCheckout || checkingOut}
        onClick={onCheckout}
        className="w-full bg-primary text-on-primary font-label-md text-label-md py-sm px-md rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-xs hover:bg-primary-container disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {checkingOut ? 'Оформляем…' : 'Оформить заказ'}
        {!checkingOut && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
      </button>
      <p className="font-label-sm text-label-sm text-on-surface-variant text-center mt-sm">
        Нажимая кнопку, вы соглашаетесь с условиями обработки данных.
      </p>
    </div>
  );
}

// ── Страница ──────────────────────────────────────────────────────────────────
export default function Cart() {
  const { items, setQuantity, remove, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [services, setServices] = useState<ServiceRef[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  // Справочник услуг из БД (Сборка ПК, Установка ОС и т.д.).
  useEffect(() => {
    fetchServices().then(setServices).catch(() => setServices([]));
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const servicesTotal = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);
  const total = subtotal + servicesTotal;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  function toggleService(id: string) {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function confirmRemove() {
    if (pendingRemoveId !== null) remove(pendingRemoveId);
    setPendingRemoveId(null);
  }

  async function handleCheckout() {
    setError('');
    // Гость → на страницу входа.
    if (!user) {
      navigate('/auth');
      return;
    }
    setCheckingOut(true);
    try {
      const order = await checkoutCart({
        products: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        services: selectedServices.map((id) => ({ serviceId: Number(id) })),
      });
      clear();
      setSelectedServices([]);
      setSuccessOrderId(order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка оформления заказа');
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <>
      <h1 className="font-headline-lg text-headline-lg text-on-background mb-xl">Корзина</h1>

      <div className="flex flex-col lg:flex-row gap-gutter">
        <div className="w-full lg:w-2/3 flex flex-col gap-sm">
          {items.length === 0 ? (
            <EmptyCart />
          ) : (
            items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onQuantityChange={setQuantity}
                onRemove={setPendingRemoveId}
              />
            ))
          )}
        </div>

        <div className="w-full lg:w-1/3">
          <Summary
            services={services}
            selected={selectedServices}
            onToggleService={toggleService}
            subtotal={subtotal}
            servicesTotal={servicesTotal}
            total={total}
            itemCount={itemCount}
            canCheckout={items.length > 0}
            checkingOut={checkingOut}
            error={error}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      <Modal
        isOpen={pendingRemoveId !== null}
        onClose={() => setPendingRemoveId(null)}
        title="Удаление товара"
        maxWidth="max-w-[26rem]"
        bodyClassName="p-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPendingRemoveId(null)}
              className="px-md py-sm rounded-lg font-label-md border border-outline-variant hover:bg-surface-container transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={confirmRemove}
              className="px-md py-sm rounded-lg font-label-md bg-error text-on-error hover:opacity-90 transition-colors"
            >
              Удалить
            </button>
          </>
        }
      >
        <p className="font-body-md text-body-md text-on-surface-variant">
          Вы уверены, что хотите удалить этот товар из корзины?
        </p>
      </Modal>

      <Modal
        isOpen={successOrderId !== null}
        onClose={() => setSuccessOrderId(null)}
        title="Заказ оформлен"
        maxWidth="max-w-[26rem]"
        bodyClassName="p-md"
        footer={
          <button
            type="button"
            onClick={() => setSuccessOrderId(null)}
            className="px-md py-sm rounded-lg font-label-md bg-primary text-on-primary hover:bg-primary-container transition-colors"
          >
            Хорошо
          </button>
        }
      >
        <div className="flex items-start gap-sm">
          <span className="material-symbols-outlined text-secondary" style={{ fontSize: 32 }}>
            check_circle
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Заказ №{successOrderId} принят в обработку со статусом «Оплачено». Спасибо за покупку!
          </p>
        </div>
      </Modal>
    </>
  );
}
