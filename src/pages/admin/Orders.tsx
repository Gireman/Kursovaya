import { useEffect, useRef, useState } from 'react';
import { createOrder, deleteOrder, fetchOrders, fetchServices, updateOrder, updateOrderStatus } from '../../api/orders';
import { fetchClients, fetchEmployees } from '../../api/users';
import { fetchInventory } from '../../api/inventory';
import type { Client, Employee, InventoryItem, Order, OrderInput, OrderStatus, ServiceRef } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';

const PAGE_SIZE = 5;

// Статусы заказа (русские подписи, как хранятся в purchases.Status). «Отмены» нет.
const STATUS_OPTIONS: OrderStatus[] = ['Оплачено', 'В сборке', 'Готов к выдаче', 'Выдан'];
const ISSUED_STATUS = 'Выдан';

const STATUS_CONFIG: Record<string, { variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  'Оплачено': { variant: 'success' },
  'В сборке': { variant: 'warning' },
  'Готов к выдаче': { variant: 'info' },
  'Выдан': { variant: 'neutral' },
};
const DEFAULT_STATUS_STYLE = { variant: 'neutral' as const };
const statusStyle = (status: string) => STATUS_CONFIG[status] ?? DEFAULT_STATUS_STYLE;

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
      <span>Показано {count} из {total} заказов</span>
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

// ── Action buttons (edit / delete) ──────────────────────────────────────────────

function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-xs">
      <button
        onClick={onEdit}
        className="p-xs text-outline hover:text-primary hover:bg-surface-container rounded transition-colors"
        title="Редактировать"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
      </button>
      <button
        onClick={onDelete}
        className="p-xs text-outline hover:text-error hover:bg-error-container rounded transition-colors"
        title="Удалить"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
      </button>
    </div>
  );
}

// ── Delete confirmation modal ───────────────────────────────────────────────────

function DeleteConfirmModal({
  orderId,
  onCancel,
  onConfirm,
  onError,
}: {
  orderId: string;
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
      onError(e instanceof Error ? e.message : 'Не удалось удалить заказ');
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
            className="px-6 py-2 bg-error text-on-error hover:opacity-90 rounded-lg transition-opacity text-label-md shadow-sm disabled:opacity-50"
          >
            {deleting ? 'Удаление...' : 'Удалить'}
          </button>
        </>
      }
    >
      <p className="text-body-md text-on-surface-variant">
        Вы уверены, что хотите удалить заказ <span className="font-medium text-on-surface">#{orderId}</span>? Это действие нельзя будет отменить.
      </p>
    </Modal>
  );
}

// ── Order status modal (change status, like purchases) ────────────────────────────

function OrderStatusModal({ order, onUpdated, onClose }: { order: Order; onUpdated: (order: Order) => void; onClose: () => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (status === order.status) return onClose();
    setSaving(true);
    setError('');
    try {
      const updated = await updateOrderStatus(order.id, status);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить статус');
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Статус заказа #${order.id}`}
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
            onClick={save}
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
            onChange={(v) => setStatus(v)}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
        </div>
        {status === ISSUED_STATUS && (
          <p className="text-body-sm text-on-surface-variant">Дата выдачи будет проставлена автоматически (сегодня).</p>
        )}
        {status !== ISSUED_STATUS && order.issueDate && (
          <p className="text-body-sm text-on-surface-variant">Дата выдачи будет очищена.</p>
        )}
      </div>
    </Modal>
  );
}

// ── Order details modal (products / services) ─────────────────────────────────────

function OrderItemsModal({ order, type, onClose }: { order: Order; type: 'products' | 'services'; onClose: () => void }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={type === 'products' ? `Заказ #${order.id} — Товары` : `Заказ #${order.id} — Услуги`}
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
      {type === 'products' ? (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              {['ID товара', 'Название', 'Количество', 'Сумма'].map((h, i) => (
                <th key={h} className={`p-3 text-label-sm text-on-surface-variant uppercase tracking-wider${i >= 2 ? ' text-right whitespace-nowrap' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
            {order.products.length > 0 ? (
              order.products.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-3 font-mono text-sm text-on-surface-variant">{p.id}</td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-right whitespace-nowrap">{p.quantity} шт.</td>
                  <td className="p-3 text-right whitespace-nowrap">{formatAmount(p.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-on-surface-variant">Товары отсутствуют</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="p-3 text-label-sm text-on-surface-variant uppercase tracking-wider">Название услуги</th>
              <th className="p-3 text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Цена услуги</th>
            </tr>
          </thead>
          <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
            {order.services.length > 0 ? (
              order.services.map((s) => (
                <tr key={s.id ?? s.name} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 text-right whitespace-nowrap">{formatAmount(s.price)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="p-6 text-center text-on-surface-variant">Услуги отсутствуют</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

// ── Order form modal (create / edit) ──────────────────────────────────────────

interface ProductLine {
  id: number;
  product: string;
  quantity: number;
}

interface ServiceLine {
  id: number;
  service: string;
}

function OrderFormModal({
  order,
  clients,
  employees,
  products,
  services,
  onClose,
  onSave,
}: {
  order: Order | null;
  clients: Client[];
  employees: Employee[];
  products: InventoryItem[];
  services: ServiceRef[];
  onClose: () => void;
  onSave: (o: Order) => void;
}) {
  const [client, setClient] = useState(order?.clientId ?? '');
  const [employee, setEmployee] = useState(order?.employeeId ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const initialProductLines: ProductLine[] =
    order && order.products.length
      ? order.products.map((p, i) => ({ id: i + 1, product: p.id, quantity: p.quantity }))
      : [{ id: 1, product: '', quantity: 1 }];
  const initialServiceLines: ServiceLine[] =
    order && order.services.length
      ? order.services.map((s, i) => ({ id: i + 1, service: s.id ?? '' }))
      : [{ id: 1, service: '' }];

  const [productLines, setProductLines] = useState<ProductLine[]>(initialProductLines);
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(initialServiceLines);
  const productId = useRef(initialProductLines.length + 1);
  const serviceId = useRef(initialServiceLines.length + 1);

  const addProduct = () => setProductLines((l) => [...l, { id: productId.current++, product: '', quantity: 1 }]);
  const removeProduct = (id: number) => setProductLines((l) => (l.length > 1 ? l.filter((x) => x.id !== id) : l));
  const updateProduct = (id: number, patch: Partial<ProductLine>) =>
    setProductLines((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addService = () => setServiceLines((l) => [...l, { id: serviceId.current++, service: '' }]);
  const removeService = (id: number) => setServiceLines((l) => (l.length > 1 ? l.filter((x) => x.id !== id) : l));
  const updateService = (id: number, patch: Partial<ServiceLine>) =>
    setServiceLines((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // Цена товара — из справочника товаров, цена услуги — из справочника услуг.
  const costOf = (id: string) => products.find((p) => p.id === id)?.cost ?? 0;
  const servicePriceOf = (id: string) => services.find((s) => s.id === id)?.price ?? 0;
  const linePrice = (line: ProductLine) => costOf(line.product) * line.quantity;
  const total =
    productLines.reduce((sum, l) => sum + linePrice(l), 0) +
    serviceLines.reduce((sum, l) => sum + (l.service ? servicePriceOf(l.service) : 0), 0);

  const submit = async () => {
    setError('');
    if (!client) return setError('Выберите клиента');
    if (!employee) return setError('Выберите сотрудника');

    const input: OrderInput = {
      clientId: client,
      employeeId: employee,
      products: productLines.filter((l) => l.product).map((l) => ({ productId: l.product, quantity: l.quantity })),
      services: serviceLines.filter((l) => l.service).map((l) => ({ serviceId: l.service })),
    };
    if (input.products.length === 0 && input.services.length === 0) {
      return setError('Добавьте хотя бы один товар или услугу');
    }

    setSaving(true);
    try {
      const saved = order ? await updateOrder(order.id, input) : await createOrder(input);
      onSave(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить заказ');
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={order ? `Редактировать заказ #${order.id}` : 'Создать новый заказ'}
      subtitle={order ? undefined : 'Заполните данные для оформления заказа клиента'}
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
            onClick={submit}
            disabled={saving}
            className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md shadow-sm disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : order ? 'Сохранить изменения' : 'Создать заказ'}
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
            <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Клиент</label>
            <Select
              variant="outlined"
              value={client}
              onChange={setClient}
              placeholder="Выберите клиента..."
              options={clients.map((c) => ({ value: String(c.id), label: c.login }))}
            />
          </div>
          <div>
            <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Сотрудник</label>
            <Select
              variant="outlined"
              value={employee}
              onChange={setEmployee}
              placeholder="Выберите сотрудника..."
              options={employees.map((e) => ({ value: e.id, label: `${e.id} — ${e.fullName}` }))}
            />
          </div>
        </div>

        {/* Products */}
        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Список товаров</label>
          <div className="border border-outline-variant rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr className="border-b border-outline-variant">
                  <th className="p-3 text-label-sm">Товар</th>
                  <th className="p-3 text-label-sm w-24">Кол-во</th>
                  <th className="p-3 text-label-sm w-32 text-right">Цена (₽)</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {productLines.map((line) => (
                  <tr key={line.id} className="border-b border-outline-variant">
                    <td className="p-2">
                      <Select
                        block
                        value={line.product}
                        onChange={(v) => updateProduct(line.id, { product: v })}
                        placeholder="Выберите товар..."
                        options={products.map((p) => ({ value: p.id, label: p.name }))}
                        className="px-1"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => updateProduct(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full bg-transparent border-none p-1 text-body-md outline-none"
                      />
                    </td>
                    <td className="p-2 text-right text-body-md">{line.product ? formatAmount(linePrice(line)) : '—'}</td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeProduct(line.id)}
                        disabled={productLines.length === 1}
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
              onClick={addProduct}
              className="w-full py-2 text-primary hover:bg-primary/5 text-label-md border-t border-outline-variant"
            >
              + Добавить позицию
            </button>
          </div>
        </div>

        {/* Services — у услуг в БД нет цены, поэтому только выбор названия */}
        <div>
          <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Дополнительные услуги</label>
          <div className="border border-outline-variant rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr className="border-b border-outline-variant">
                  <th className="p-3 text-label-sm">Услуга</th>
                  <th className="p-3 text-label-sm w-32 text-right">Цена (₽)</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {serviceLines.map((line) => (
                  <tr key={line.id} className="border-b border-outline-variant">
                    <td className="p-2">
                      <Select
                        block
                        value={line.service}
                        onChange={(v) => updateService(line.id, { service: v })}
                        placeholder={services.length ? 'Выберите услугу...' : 'Услуг пока нет'}
                        options={services.map((s) => ({ value: s.id, label: s.name }))}
                        className="px-1"
                      />
                    </td>
                    <td className="p-2 text-right text-body-md">{line.service ? formatAmount(servicePriceOf(line.service)) : '—'}</td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeService(line.id)}
                        disabled={serviceLines.length === 1}
                        className="p-1 text-on-surface-variant hover:text-error rounded transition-colors disabled:opacity-30 disabled:hover:text-on-surface-variant"
                        title="Удалить услугу"
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
              onClick={addService}
              className="w-full py-2 text-primary hover:bg-primary/5 text-label-md border-t border-outline-variant"
            >
              + Добавить услугу
            </button>
          </div>
        </div>

        <div className="flex justify-end items-center gap-2 pt-md border-t border-outline-variant">
          <span className="text-label-md font-bold text-on-surface-variant uppercase">ИТОГО:</span>
          <span className="text-xl font-bold text-primary">{formatAmount(total)}</span>
        </div>
      </div>
    </Modal>
  );
}

// ── Orders table ────────────────────────────────────────────────────────────────

function OrdersTable({
  orders,
  setOrders,
  clients,
  employees,
  products,
  services,
}: {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  clients: Client[];
  employees: Employee[];
  products: InventoryItem[];
  services: ServiceRef[];
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [editingStatus, setEditingStatus] = useState<Order | null>(null);
  const [details, setDetails] = useState<{ order: Order; type: 'products' | 'services' } | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.clientLogin.toLowerCase().includes(q) ||
      o.clientName.toLowerCase().includes(q) ||
      o.employeeId.toLowerCase().includes(q) ||
      o.employeeName.toLowerCase().includes(q);
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (order: Order) => { setEditing(order); setShowForm(true); };

  // saved уже сохранён на сервере — просто отражаем его в стейте.
  const save = (saved: Order) => {
    setOrders((list) => (list.some((x) => x.id === saved.id) ? list.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...list]));
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError('');
    await deleteOrder(deleting.id);
    setOrders((list) => list.filter((x) => x.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div className="flex flex-col gap-sm">
          <h1 className="text-headline-lg font-bold text-on-background">Управление заказами</h1>
          <p className="text-body-md text-on-surface-variant">Просмотр и управление покупками клиентов.</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md flex items-center gap-xs shadow-sm self-start sm:self-auto"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Новый заказ
        </button>
      </div>

      {deleteError && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-sm">{deleteError}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-sm items-center bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            className="w-full bg-transparent border-none focus:ring-0 text-body-md placeholder-on-surface-variant text-on-surface p-0 outline-none"
            placeholder="ID, клиент, сотрудник..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
        <Select
          icon="pending_actions"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[{ value: '', label: 'Все статусы' }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]}
        />
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wider">
                <th className="p-4">ID</th>
                <th className="p-4">Клиент</th>
                <th className="p-4">Сотрудник</th>
                <th className="p-4 text-right whitespace-nowrap">Сумма</th>
                <th className="p-4">Даты (запрос / выдача)</th>
                <th className="p-4">Статус</th>
                <th className="p-4">Подробности</th>
                <th className="p-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
              {paged.map((order) => {
                const status = statusStyle(order.status);
                return (
                  <tr key={order.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="p-4 font-mono text-sm text-on-surface">{order.id}</td>
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{order.clientLogin}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{order.employeeName}</div>
                    </td>
                    <td className="p-4 text-right font-medium whitespace-nowrap">{formatAmount(order.totalAmount)}</td>
                    <td className="p-4 text-on-surface-variant text-sm">
                      {formatDate(order.receiptDate)}
                      <br />
                      <span className={order.issueDate ? 'text-primary' : 'text-on-surface-variant'}>
                        {formatDate(order.issueDate)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant}>{order.status}</Badge>
                        <button
                          onClick={() => setEditingStatus(order)}
                          title="Изменить статус"
                          className="p-xs text-outline hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setDetails({ order, type: 'products' })}
                          className="text-primary hover:underline text-label-md"
                        >
                          Товары
                        </button>
                        <button
                          onClick={() => setDetails({ order, type: 'services' })}
                          className="text-primary hover:underline text-label-md"
                        >
                          Услуги
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <ActionButtons onEdit={() => openEdit(order)} onDelete={() => { setDeleteError(''); setDeleting(order); }} />
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
        <OrderStatusModal
          order={editingStatus}
          onUpdated={(o) => { setOrders((list) => list.map((x) => (x.id === o.id ? o : x))); setEditingStatus(null); }}
          onClose={() => setEditingStatus(null)}
        />
      )}
      {showForm && (
        <OrderFormModal
          order={editing}
          clients={clients}
          employees={employees}
          products={products}
          services={services}
          onClose={() => setShowForm(false)}
          onSave={save}
        />
      )}
      {details && <OrderItemsModal order={details.order} type={details.type} onClose={() => setDetails(null)} />}
      {deleting && (
        <DeleteConfirmModal
          orderId={deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          onError={(msg) => { setDeleteError(msg); setDeleting(null); }}
        />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [services, setServices] = useState<ServiceRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchClients(), fetchEmployees(), fetchInventory(), fetchServices()]).then(
      ([ord, cl, emp, prod, srv]) => {
        setOrders(ord);
        setClients(cl);
        setEmployees(emp);
        setProducts(prod);
        setServices(srv);
        setLoading(false);
      },
    );
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
    <OrdersTable
      orders={orders}
      setOrders={setOrders}
      clients={clients}
      employees={employees}
      products={products}
      services={services}
    />
  );
}
