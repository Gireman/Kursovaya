import { useEffect, useRef, useState } from 'react';
import { fetchInventory, fetchPurchases } from '../../api/inventory';
import type { InventoryItem, PurchaseOrder } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { DateFilter } from '../../components/ui/DateFilter';

const LOW_STOCK_THRESHOLD = 3;

const PRODUCT_OPTIONS = [
  { value: 'PRD-8901', label: 'Материнская плата ASUS ROG Strix B650E-F' },
  { value: 'PRD-8902', label: 'Видеокарта NVIDIA RTX 4070 Ti' },
  { value: 'PRD-8903', label: 'Процессор Intel Core i9-14900K' },
  { value: 'PRD-8904', label: 'Оперативная память Kingston FURY Beast 32GB' },
  { value: 'PRD-8905', label: 'Блок питания Corsair RM850x' },
];

const STATUS_CONFIG = {
  in_transit: { label: 'В пути', variant: 'info' as const },
  assembling: { label: 'Комплектуется', variant: 'warning' as const },
  arrived: { label: 'Прибыло на склад', variant: 'success' as const, icon: 'check_circle' },
  cancelled: { label: 'Отменено', variant: 'error' as const, icon: 'cancel' },
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Stats cards ──────────────────────────────────────────────────────────────

function StatsCards({ items, purchases }: { items: InventoryItem[]; purchases: PurchaseOrder[] }) {
  const totalItems = items.length;
  const criticalCount = items.filter((i) => i.quantity < LOW_STOCK_THRESHOLD).length;
  const incomingCount = purchases.filter((p) => p.status === 'in_transit' || p.status === 'assembling').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
      <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">inventory_2</span>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Всего позиций</p>
          <p className="text-headline-md font-bold text-on-surface">{totalItems}</p>
        </div>
      </div>
      <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error">
          <span className="material-symbols-outlined">warning</span>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Критический остаток (&lt;{LOW_STOCK_THRESHOLD})</p>
          <p className="text-headline-md font-bold text-on-surface">{criticalCount}</p>
        </div>
      </div>
      <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
          <span className="material-symbols-outlined">local_shipping</span>
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Ожидается от дилеров</p>
          <p className="text-headline-md font-bold text-on-surface">{incomingCount}</p>
        </div>
      </div>
    </div>
  );
}

// ── Inventory table ───────────────────────────────────────────────────────────

function InventoryTable({ items }: { items: InventoryItem[] }) {
  const [search, setSearch] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchWarehouse = !warehouse || item.warehouseId === warehouse;
    return matchSearch && matchWarehouse;
  });

  return (
    <div className="flex flex-col gap-md">
      <h2 className="text-headline-md font-semibold text-on-surface">Товары на складе</h2>
      <div className="flex flex-wrap gap-sm items-center bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            className="w-full bg-transparent border-none focus:ring-0 text-body-md placeholder-on-surface-variant text-on-surface p-0 outline-none"
            placeholder="Название товара..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
        <Select
          icon="warehouse"
          value={warehouse}
          onChange={setWarehouse}
          options={[
            { value: '', label: 'Все склады' },
            { value: 'WH-01', label: 'Склад А (Основной)' },
            { value: 'WH-02', label: 'Склад B (Резерв)' },
          ]}
        />
        <button
          onClick={() => setShowAddProduct(true)}
          className="ml-auto px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md flex items-center gap-xs shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Добавить товар
        </button>
      </div>
      <div className="bg-surface rounded-xl border border-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {['ID Товара', 'Название', 'Склад', 'Количество'].map((h, i) => (
                  <th key={h} className={`p-4 text-label-sm text-on-surface-variant uppercase tracking-wider${i === 3 ? ' text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
              {filtered.map((item) => {
                const isCritical = item.quantity < LOW_STOCK_THRESHOLD;
                return (
                  <tr
                    key={item.id}
                    className={isCritical ? 'bg-error-container/30 hover:bg-error-container/50 transition-colors' : 'hover:bg-surface-container-lowest transition-colors'}
                  >
                    <td className={`p-4 font-mono text-sm ${isCritical ? 'text-on-error-container' : 'text-on-surface-variant'}`}>{item.id}</td>
                    <td className={`p-4 font-medium ${isCritical ? 'text-on-error-container' : 'text-on-background'}`}>{item.name}</td>
                    <td className={`p-4 ${isCritical ? 'text-on-error-container/80' : 'text-on-surface-variant'}`}>{item.warehouseName}</td>
                    <td className="p-4 text-right">
                      <Badge variant={isCritical ? 'error' : 'success'} icon={isCritical ? 'error' : undefined}>
                        {item.quantity} шт.
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center text-on-surface-variant text-label-md">
          <span>Показано {filtered.length} из {items.length}</span>
          <div className="flex gap-2">
            <button className="p-1 hover:bg-surface-container rounded transition-colors disabled:opacity-30" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="p-1 hover:bg-surface-container rounded transition-colors">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
      {showAddProduct && <AddProductModal onClose={() => setShowAddProduct(false)} />}
    </div>
  );
}

// ── Add product modal ─────────────────────────────────────────────────────────

function AddProductModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [quantity, setQuantity] = useState('0');

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Добавить новый товар"
      subtitle="Введите данные для постановки на учет"
      maxWidth="max-w-[28rem]"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md"
          >
            Отмена
          </button>
          <button className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md shadow-sm">
            Добавить
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-md">
        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Название товара</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Напр: Процессор Intel..."
            className="w-full rounded-lg border border-outline-variant p-2 text-body-md bg-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Склад</label>
          <Select
            variant="outlined"
            value={warehouse}
            onChange={setWarehouse}
            placeholder="Выберите склад..."
            options={[
              { value: 'WH-01', label: 'Склад А' },
              { value: 'WH-02', label: 'Склад Б' },
            ]}
          />
        </div>
        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Количество</label>
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-outline-variant p-2 text-body-md bg-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </div>
    </Modal>
  );
}

// ── Purchase order details modal ──────────────────────────────────────────────

function PurchaseDetailsModal({ order, onClose }: { order: PurchaseOrder; onClose: () => void }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Состав закупки ${order.id}`}
      subtitle={`Дилер: ${order.dealer} | Всего позиций: ${order.items.length}`}
      bodyClassName="p-0"
      footer={
        <button
          onClick={onClose}
          className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md shadow-sm"
        >
          Закрыть
        </button>
      }
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-low border-b border-outline-variant">
            {['ID Товара', 'Название', 'Количество', 'Сумма'].map((h, i) => (
              <th key={h} className={`p-3 text-label-sm text-on-surface-variant uppercase tracking-wider${i >= 2 ? ' text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
          {order.items.map((item) => (
            <tr key={item.productId} className="hover:bg-surface-container-lowest transition-colors">
              <td className="p-3 font-mono text-sm text-on-surface-variant">{item.productId}</td>
              <td className="p-3 font-medium">{item.productName}</td>
              <td className="p-3 text-right">{item.quantity} шт.</td>
              <td className="p-3 text-right">{formatAmount(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

// ── New purchase modal ────────────────────────────────────────────────────────

interface PurchaseLine {
  id: number;
  product: string;
  quantity: number;
}

function NewPurchaseModal({ onClose }: { onClose: () => void }) {
  const [dealer, setDealer] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [lines, setLines] = useState<PurchaseLine[]>([{ id: 1, product: '', quantity: 1 }]);
  const nextId = useRef(2);

  const addLine = () => setLines((l) => [...l, { id: nextId.current++, product: '', quantity: 1 }]);
  const removeLine = (id: number) => setLines((l) => (l.length > 1 ? l.filter((x) => x.id !== id) : l));
  const updateLine = (id: number, patch: Partial<PurchaseLine>) =>
    setLines((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Подача заявки на закупку"
      subtitle="Заполните данные для формирования нового заказа дилеру"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md"
          >
            Отмена
          </button>
          <button className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md shadow-sm">
            Отправить заявку
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div>
            <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Дилер</label>
            <Select
              variant="outlined"
              value={dealer}
              onChange={setDealer}
              placeholder="Выберите дилера..."
              options={[
                { value: 'Merlion', label: 'Merlion' },
                { value: 'Marvel', label: 'Marvel' },
                { value: 'OCS Distribution', label: 'OCS Distribution' },
              ]}
            />
          </div>
          <div>
            <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Склад назначения</label>
            <Select
              variant="outlined"
              value={warehouse}
              onChange={setWarehouse}
              placeholder="Выберите склад..."
              options={[
                { value: 'WH-01', label: 'Склад А' },
                { value: 'WH-02', label: 'Склад B' },
              ]}
            />
          </div>
        </div>
        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Список товаров</label>
          <div className="border border-outline-variant rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr className="border-b border-outline-variant">
                  <th className="p-3 text-label-sm">Товар</th>
                  <th className="p-3 text-label-sm w-24">Кол-во</th>
                  <th className="p-3 text-label-sm w-32">Цена (₽)</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-outline-variant">
                    <td className="p-2">
                      <Select
                        block
                        value={line.product}
                        onChange={(v) => updateLine(line.id, { product: v })}
                        placeholder="Выберите товар..."
                        options={PRODUCT_OPTIONS}
                        className="px-1"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full bg-transparent border-none p-1 text-body-md outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input type="text" readOnly placeholder="—" className="w-full bg-transparent border-none p-1 text-body-md cursor-not-allowed outline-none text-right" />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1}
                        className="p-1 text-on-surface-variant hover:text-error rounded transition-colors disabled:opacity-30 disabled:hover:text-on-surface-variant"
                        title="Удалить позицию"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={addLine}
              className="w-full py-2 text-primary hover:bg-primary/5 text-label-md border-t border-outline-variant"
            >
              + Добавить позицию
            </button>
          </div>
        </div>
        <div className="flex justify-end items-center gap-2">
          <span className="text-label-md font-bold text-on-surface-variant">ИТОГО:</span>
          <span className="text-xl font-bold text-primary">0 ₽</span>
        </div>
      </div>
    </Modal>
  );
}

// ── Purchases table ───────────────────────────────────────────────────────────

function PurchasesTable({ purchases }: { purchases: PurchaseOrder[] }) {
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showNewPurchase, setShowNewPurchase] = useState(false);
  const [dealerFilter, setDealerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filtered = purchases.filter((p) => {
    const matchDealer = !dealerFilter || p.dealer === dealerFilter;
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchDate = !dateFilter || p.requestDate === dateFilter || p.receivedDate === dateFilter;
    return matchDealer && matchStatus && matchDate;
  });

  const dealers = [...new Set(purchases.map((p) => p.dealer))];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex justify-between items-center">
        <h2 className="text-headline-md font-semibold text-on-surface">Закупки у дилеров</h2>
        <button
          onClick={() => setShowNewPurchase(true)}
          className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md flex items-center gap-xs shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Новая закупка
        </button>
      </div>
      <div className="flex flex-wrap gap-sm items-center bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
        <Select
          icon="store"
          value={dealerFilter}
          onChange={setDealerFilter}
          options={[{ value: '', label: 'Все дилеры' }, ...dealers.map((d) => ({ value: d, label: d }))]}
        />
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
        <Select
          icon="pending_actions"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'Любой статус' },
            { value: 'in_transit', label: 'В пути' },
            { value: 'assembling', label: 'Комплектуется' },
            { value: 'arrived', label: 'Прибыло' },
            { value: 'cancelled', label: 'Отменено' },
          ]}
        />
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
        <DateFilter value={dateFilter} onChange={setDateFilter} />
        <button
          onClick={() => { setDealerFilter(''); setStatusFilter(''); setDateFilter(''); }}
          className="ml-auto px-4 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md flex items-center gap-xs"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
          Обновить
        </button>
      </div>
      <div className="bg-surface rounded-xl border border-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {['ID закупки', 'Дилер', 'Склад', 'Сотрудник', 'Общая сумма', 'Даты (Запрос / Получ.)', 'Статус', 'Товар'].map((h) => (
                  <th key={h} className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
              {filtered.map((order) => {
                const status = STATUS_CONFIG[order.status];
                return (
                  <tr key={order.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="p-4 font-mono text-sm text-on-surface-variant">{order.id}</td>
                    <td className="p-4 font-medium text-on-background">{order.dealer}</td>
                    <td className="p-4 text-on-surface-variant">{order.warehouseName}</td>
                    <td className="p-4 text-on-surface-variant">{order.employee}</td>
                    <td className="p-4 font-medium">{formatAmount(order.totalAmount)}</td>
                    <td className="p-4 text-on-surface-variant text-sm">
                      {formatDate(order.requestDate)}
                      <br />
                      <span className={order.receivedDate ? 'text-primary' : 'text-on-surface-variant'}>
                        {order.receivedDate ? formatDate(order.receivedDate) : '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant={status.variant} icon={'icon' in status ? status.icon : undefined}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {order.items.length > 0 ? (
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-primary hover:text-primary/80 text-label-md underline flex items-center gap-1 active:opacity-80 transition-all"
                        >
                          См. детали
                        </button>
                      ) : (
                        <span className="text-on-surface-variant text-sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center text-on-surface-variant text-label-md">
          <span>Показано {filtered.length} из {purchases.length}</span>
          <div className="flex gap-2">
            <button className="p-1 hover:bg-surface-container rounded transition-colors disabled:opacity-30" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="p-1 hover:bg-surface-container rounded transition-colors">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
      {selectedOrder && <PurchaseDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      {showNewPurchase && <NewPurchaseModal onClose={() => setShowNewPurchase(false)} />}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchInventory(), fetchPurchases()]).then(([inv, pur]) => {
      setInventory(inv);
      setPurchases(pur);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Загрузка...
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-sm">
        <h1 className="text-headline-lg font-bold text-on-background">Управление складом</h1>
        <p className="text-body-md text-on-surface-variant">
          Мониторинг остатков, управление складом и контроль входящих поставок от дилеров.
        </p>
      </div>
      <StatsCards items={inventory} purchases={purchases} />
      <InventoryTable items={inventory} />
      <PurchasesTable purchases={purchases} />
    </>
  );
}
