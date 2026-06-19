import { useEffect, useRef, useState } from 'react';
import { createProduct, createPurchase, deleteProduct, fetchDealers, fetchInventory, fetchPurchases, fetchWarehouses, updateProduct, updatePurchaseStatus } from '../../api/inventory';
import type { DealerRef, InventoryItem, PurchaseOrder, WarehouseRef } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { DateFilter } from '../../components/ui/DateFilter';

const LOW_STOCK_THRESHOLD = 3;
const PAGE_SIZE = 5;

const STATUS_OPTIONS = ['Обработка', 'В пути', 'Прибыло', 'Отменено'];

const STATUS_CONFIG: Record<string, { variant: 'info' | 'warning' | 'success' | 'error'; icon?: string }> = {
  'Обработка': { variant: 'warning' },
  'В пути': { variant: 'info' },
  'Прибыло': { variant: 'success', icon: 'check_circle' },
  'Отменено': { variant: 'error', icon: 'cancel' },
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Pagination({ page, total, count, onPrev, onNext }: { page: number; total: number; count: number; onPrev: () => void; onNext: () => void }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center text-on-surface-variant text-label-md">
      <span>Показано {count} из {total}</span>
      <div className="flex gap-2">
        <button onClick={onPrev} disabled={page <= 1} className="p-1 hover:bg-surface-container rounded transition-colors disabled:opacity-30">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <button onClick={onNext} disabled={page >= totalPages} className="p-1 hover:bg-surface-container rounded transition-colors disabled:opacity-30">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

// ── Stats cards ──────────────────────────────────────────────────────────────

function StatsCards({ items, purchases }: { items: InventoryItem[]; purchases: PurchaseOrder[] }) {
  const totalItems = items.length;
  const criticalCount = items.filter((i) => i.quantity < LOW_STOCK_THRESHOLD).length;
  const incomingCount = purchases.filter((p) => p.status === 'Обработка' || p.status === 'В пути').length;

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

function InventoryTable({
  items,
  warehouses,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  items: InventoryItem[];
  warehouses: WarehouseRef[];
  onCreated: (item: InventoryItem) => void;
  onUpdated: (item: InventoryItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [page, setPage] = useState(1);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchWarehouse = !warehouse || item.warehouseId === warehouse;
    return matchSearch && matchWarehouse;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const warehouseOptions = [
    { value: '', label: 'Все склады' },
    ...warehouses.map((w) => ({ value: w.id, label: w.name })),
  ];

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError('');
    await deleteProduct(deleting.id);
    onDeleted(deleting.id);
    setDeleting(null);
  };

  return (
    <div className="flex flex-col gap-md">
      <h2 className="text-headline-md font-semibold text-on-surface">Товары на складе</h2>
      {deleteError && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-sm">{deleteError}</div>
      )}
      <div className="flex flex-wrap gap-sm items-center bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            className="w-full bg-transparent border-none focus:ring-0 text-body-md placeholder-on-surface-variant text-on-surface p-0 outline-none"
            placeholder="Название товара..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
        <Select
          icon="warehouse"
          value={warehouse}
          onChange={(v) => { setWarehouse(v); setPage(1); }}
          options={warehouseOptions}
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
                {['ID', 'Название', 'Склад', 'Цена', 'Количество', 'Действия'].map((h, i) => (
                  <th
                    key={h}
                    className={`text-label-sm text-on-surface-variant uppercase tracking-wider ${i === 0 ? 'px-2 py-4 w-14 text-center' : 'p-4'}${i === 3 || i === 4 ? ' text-right' : ''}${i === 5 ? ' text-center' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
              {paged.map((item) => {
                const isCritical = item.quantity < LOW_STOCK_THRESHOLD;
                return (
                  <tr
                    key={item.id}
                    className={isCritical ? 'bg-error-container/30 hover:bg-error-container/50 transition-colors' : 'hover:bg-surface-container-lowest transition-colors'}
                  >
                    <td className={`px-2 py-4 font-mono text-sm text-center ${isCritical ? 'text-on-error-container' : 'text-on-surface-variant'}`}>{item.id}</td>
                    <td className={`p-4 font-medium ${isCritical ? 'text-on-error-container' : 'text-on-background'}`}>{item.name}</td>
                    <td className={`p-4 ${isCritical ? 'text-on-error-container/80' : 'text-on-surface-variant'}`}>{item.warehouseName}</td>
                    <td className={`p-4 text-right whitespace-nowrap ${isCritical ? 'text-on-error-container/80' : 'text-on-surface-variant'}`}>{formatAmount(item.cost)}</td>
                    <td className="p-4 text-right">
                      <Badge variant={isCritical ? 'error' : 'success'} icon={isCritical ? 'error' : undefined}>
                        {item.quantity} шт.
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditing(item)}
                          title="Редактировать"
                          className="p-xs text-outline hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                        </button>
                        <button
                          onClick={() => { setDeleteError(''); setDeleting(item); }}
                          title="Удалить"
                          className="p-xs text-outline hover:text-error hover:bg-error-container rounded transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={currentPage}
          total={filtered.length}
          count={paged.length}
          onPrev={() => setPage(currentPage - 1)}
          onNext={() => setPage(currentPage + 1)}
        />
      </div>
      {showAddProduct && (
        <ProductFormModal
          warehouses={warehouses}
          onSaved={(item) => { onCreated(item); setShowAddProduct(false); }}
          onClose={() => setShowAddProduct(false)}
        />
      )}
      {editing && (
        <ProductFormModal
          warehouses={warehouses}
          product={editing}
          onSaved={(item) => { onUpdated(item); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <DeleteProductModal
          name={deleting.name}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          onError={(msg) => { setDeleteError(msg); setDeleting(null); }}
        />
      )}
    </div>
  );
}

// ── Product form modal (create / edit) ────────────────────────────────────────

function ProductFormModal({
  warehouses,
  product,
  onSaved,
  onClose,
}: {
  warehouses: WarehouseRef[];
  product?: InventoryItem;
  onSaved: (item: InventoryItem) => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name ?? '');
  const [warehouse, setWarehouse] = useState(product?.warehouseId ?? '');
  const [cost, setCost] = useState(product ? String(product.cost) : '');
  const [quantity, setQuantity] = useState(product ? String(product.quantity) : '0');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError('');
    if (!name.trim()) return setError('Укажите название товара');
    if (!warehouse) return setError('Выберите склад');
    if (cost === '' || Number(cost) < 0) return setError('Укажите цену (число ≥ 0)');
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        warehouseId: warehouse,
        cost: Number(cost),
        quantity: Number(quantity) || 0,
      };
      const item = isEdit ? await updateProduct(product!.id, input) : await createProduct(input);
      onSaved(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить товар');
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Редактировать товар' : 'Добавить новый товар'}
      subtitle={isEdit ? 'Измените данные товара' : 'Введите данные для постановки на учет'}
      maxWidth="max-w-[28rem]"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md shadow-sm disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-md">
        {error && (
          <div className="rounded-lg bg-error-container/40 text-on-error-container px-3 py-2 text-body-sm">{error}</div>
        )}
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
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
          />
        </div>
        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Цена (₽)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-outline-variant p-2 text-body-md bg-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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

// ── Delete product confirmation modal ─────────────────────────────────────────

function DeleteProductModal({
  name,
  onCancel,
  onConfirm,
  onError,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось удалить товар');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Подтверждение удаления"
      maxWidth="max-w-[28rem]"
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-6 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="px-6 py-2 bg-error text-on-error hover:bg-error/90 rounded-lg transition-colors text-label-md shadow-sm disabled:opacity-50"
          >
            {deleting ? 'Удаление...' : 'Удалить'}
          </button>
        </>
      }
    >
      <p className="text-body-md text-on-surface-variant">
        Вы уверены, что хотите удалить товар <span className="font-semibold text-on-surface">«{name}»</span>? Это действие нельзя отменить.
      </p>
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

// ── Purchase status modal ─────────────────────────────────────────────────────

function PurchaseStatusModal({
  order,
  onUpdated,
  onClose,
}: {
  order: PurchaseOrder;
  onUpdated: (order: PurchaseOrder) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(order.status);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updatePurchaseStatus(order.id, status);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить статус');
      setSaving(false);
      setConfirmingCancel(false);
    }
  };

  const handleSave = () => {
    if (status === order.status) return onClose();
    // Отмена необратима — спрашиваем дополнительное подтверждение.
    if (status === 'Отменено') return setConfirmingCancel(true);
    submit();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Статус закупки ${order.id}`}
      subtitle={`Текущий статус: ${order.status}`}
      maxWidth="max-w-[28rem]"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md shadow-sm disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-md">
        {error && (
          <div className="rounded-lg bg-error-container/40 text-on-error-container px-3 py-2 text-body-sm">{error}</div>
        )}
        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Новый статус</label>
          <Select
            variant="outlined"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
        </div>
        {(status === 'Прибыло' || status === 'Отменено') && (
          <p className="text-body-sm text-on-surface-variant">Дата получения будет проставлена автоматически (сегодня).</p>
        )}
        {(status === 'Обработка' || status === 'В пути') && order.receivedDate && (
          <p className="text-body-sm text-on-surface-variant">Дата получения будет очищена.</p>
        )}
        {status === 'Отменено' && (
          <div className="rounded-lg bg-error-container/40 text-on-error-container px-3 py-2 text-body-sm">
            Отмена закупки необратима — вернуть другой статус будет нельзя.
          </div>
        )}
      </div>

      {confirmingCancel && (
        <Modal
          isOpen
          onClose={() => setConfirmingCancel(false)}
          title="Подтверждение отмены"
          maxWidth="max-w-[26rem]"
          footer={
            <>
              <button
                onClick={() => setConfirmingCancel(false)}
                disabled={saving}
                className="px-6 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md disabled:opacity-50"
              >
                Назад
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="px-6 py-2 bg-error text-on-error hover:bg-error/90 rounded-lg transition-colors text-label-md shadow-sm disabled:opacity-50"
              >
                {saving ? 'Отмена...' : 'Отменить закупку'}
              </button>
            </>
          }
        >
          <p className="text-body-md text-on-surface-variant">
            Вы уверены, что хотите отменить закупку <span className="font-semibold text-on-surface">{order.id}</span>?
            Это действие нельзя отменить — статус останется «Отменено».
          </p>
        </Modal>
      )}
    </Modal>
  );
}

// ── New purchase modal ────────────────────────────────────────────────────────

interface PurchaseLine {
  id: number;
  product: string;
  quantity: number;
}

function NewPurchaseModal({
  dealers,
  warehouses,
  products,
  onCreated,
  onClose,
}: {
  dealers: DealerRef[];
  warehouses: WarehouseRef[];
  products: InventoryItem[];
  onCreated: (order: PurchaseOrder) => void;
  onClose: () => void;
}) {
  const [dealer, setDealer] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [lines, setLines] = useState<PurchaseLine[]>([{ id: 1, product: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const nextId = useRef(2);

  const addLine = () => setLines((l) => [...l, { id: nextId.current++, product: '', quantity: 1 }]);
  const removeLine = (id: number) => setLines((l) => (l.length > 1 ? l.filter((x) => x.id !== id) : l));
  const updateLine = (id: number, patch: Partial<PurchaseLine>) =>
    setLines((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const costOf = (productId: string) => products.find((p) => p.id === productId)?.cost ?? 0;
  const lineTotal = (line: PurchaseLine) => (line.product ? costOf(line.product) * line.quantity : 0);
  const total = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));

  const handleSubmit = async () => {
    setError('');
    if (!dealer) return setError('Выберите дилера');
    if (!warehouse) return setError('Выберите склад назначения');
    const items = lines.filter((l) => l.product).map((l) => ({ productId: l.product, quantity: l.quantity }));
    if (items.length === 0) return setError('Добавьте хотя бы одну позицию с товаром');

    setSaving(true);
    try {
      const order = await createPurchase({ dealerId: dealer, warehouseId: warehouse, items });
      onCreated(order);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать закупку');
      setSaving(false);
    }
  };

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
            disabled={saving}
            className="px-6 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md shadow-sm disabled:opacity-50"
          >
            {saving ? 'Отправка...' : 'Отправить заявку'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-md">
        {error && (
          <div className="rounded-lg bg-error-container/40 text-on-error-container px-3 py-2 text-body-sm">{error}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div>
            <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Дилер</label>
            <Select
              variant="outlined"
              value={dealer}
              onChange={setDealer}
              placeholder="Выберите дилера..."
              options={dealers.map((d) => ({ value: d.id, label: d.name }))}
            />
          </div>
          <div>
            <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Склад назначения</label>
            <Select
              variant="outlined"
              value={warehouse}
              onChange={setWarehouse}
              placeholder="Выберите склад..."
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>event</span>
          Дата заявки: <span className="font-medium text-on-surface">{today}</span>
        </div>
        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Список товаров</label>
          <div className="border border-outline-variant rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr className="border-b border-outline-variant">
                  <th className="p-3 text-label-sm">Товар</th>
                  <th className="p-3 text-label-sm w-24">Кол-во</th>
                  <th className="p-3 text-label-sm w-32 text-right">Сумма</th>
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
                        options={productOptions}
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
                    <td className="p-2 text-right whitespace-nowrap text-on-surface-variant">
                      {line.product ? formatAmount(lineTotal(line)) : '—'}
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
          <span className="text-xl font-bold text-primary">{formatAmount(total)}</span>
        </div>
      </div>
    </Modal>
  );
}

// ── Purchases table ───────────────────────────────────────────────────────────

function PurchasesTable({
  purchases,
  dealers,
  warehouses,
  products,
  onCreated,
  onUpdated,
}: {
  purchases: PurchaseOrder[];
  dealers: DealerRef[];
  warehouses: WarehouseRef[];
  products: InventoryItem[];
  onCreated: (order: PurchaseOrder) => void;
  onUpdated: (order: PurchaseOrder) => void;
}) {
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showNewPurchase, setShowNewPurchase] = useState(false);
  const [editingStatus, setEditingStatus] = useState<PurchaseOrder | null>(null);
  const [dealerFilter, setDealerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const dayOf = (d: string | null) => (d ? String(d).slice(0, 10) : '');

  const filtered = purchases.filter((p) => {
    const matchDealer = !dealerFilter || p.dealer === dealerFilter;
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchDate = !dateFilter || dayOf(p.requestDate) === dateFilter || dayOf(p.receivedDate) === dateFilter;
    return matchDealer && matchStatus && matchDate;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const dealerFilterOptions = dealers.map((d) => ({ value: d.name, label: d.name }));

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
          onChange={(v) => { setDealerFilter(v); setPage(1); }}
          options={[{ value: '', label: 'Все дилеры' }, ...dealerFilterOptions]}
        />
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
        <Select
          icon="pending_actions"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[{ value: '', label: 'Любой статус' }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]}
        />
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
        <DateFilter value={dateFilter} onChange={(v) => { setDateFilter(v); setPage(1); }} />
        <button
          onClick={() => { setDealerFilter(''); setStatusFilter(''); setDateFilter(''); setPage(1); }}
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
                {['ID', 'Дилер', 'Склад', 'Сотрудник', 'Общая сумма', 'Даты (Запрос / Получ.)', 'Статус', 'Товар'].map((h, i) => (
                  <th
                    key={h}
                    className={`text-label-sm text-on-surface-variant uppercase tracking-wider ${i === 0 ? 'px-2 py-4 w-14 text-center' : 'p-4'}${i === 5 ? ' w-36' : ''}${i === 7 ? ' w-20' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
              {paged.map((order) => {
                const status = STATUS_CONFIG[order.status] ?? { variant: 'info' as const };
                return (
                  <tr key={order.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-2 py-4 font-mono text-sm text-center text-on-surface-variant">{order.id}</td>
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
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant} icon={status.icon}>
                          {order.status}
                        </Badge>
                        {order.status === 'Отменено' ? (
                          <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }} title="Закупка отменена — статус изменить нельзя">lock</span>
                        ) : (
                          <button
                            onClick={() => setEditingStatus(order)}
                            title="Изменить статус"
                            className="p-xs text-outline hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                          </button>
                        )}
                      </div>
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
        <Pagination
          page={currentPage}
          total={filtered.length}
          count={paged.length}
          onPrev={() => setPage(currentPage - 1)}
          onNext={() => setPage(currentPage + 1)}
        />
      </div>
      {editingStatus && (
        <PurchaseStatusModal
          order={editingStatus}
          onUpdated={(order) => { onUpdated(order); setEditingStatus(null); }}
          onClose={() => setEditingStatus(null)}
        />
      )}
      {selectedOrder && <PurchaseDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      {showNewPurchase && (
        <NewPurchaseModal
          dealers={dealers}
          warehouses={warehouses}
          products={products}
          onCreated={(order) => { onCreated(order); setShowNewPurchase(false); }}
          onClose={() => setShowNewPurchase(false)}
        />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRef[]>([]);
  const [dealers, setDealers] = useState<DealerRef[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchInventory(), fetchPurchases(), fetchWarehouses(), fetchDealers()]).then(([inv, pur, wh, dl]) => {
      setInventory(inv);
      setPurchases(pur);
      setWarehouses(wh);
      setDealers(dl);
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
      <InventoryTable
        items={inventory}
        warehouses={warehouses}
        onCreated={(item) => setInventory((prev) => [item, ...prev])}
        onUpdated={(item) => setInventory((prev) => prev.map((p) => (p.id === item.id ? item : p)))}
        onDeleted={(id) => setInventory((prev) => prev.filter((p) => p.id !== id))}
      />
      <PurchasesTable
        purchases={purchases}
        dealers={dealers}
        warehouses={warehouses}
        products={inventory}
        onCreated={(order) => setPurchases((prev) => [order, ...prev])}
        onUpdated={(order) => setPurchases((prev) => prev.map((p) => (p.id === order.id ? order : p)))}
      />
    </>
  );
}
