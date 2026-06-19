import { useEffect, useRef, useState } from 'react';
import { fetchOrders } from '../../api/orders';
import type { Order, OrderStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';

// Catalog with prices — used by the order form for live total calculation and prefill.
const ORDER_PRODUCT_OPTIONS = [
  { value: 'CPU-INT-004', label: 'Процессор Intel Core i7-13700K', price: 42500 },
  { value: 'MB-ASUS-012', label: 'Материнская плата ASUS ROG STRIX Z790-E', price: 35000 },
  { value: 'RAM-KNG-008', label: 'Оперативная память Kingston FURY Beast 32GB (2x16GB)', price: 12000 },
  { value: 'GPU-NV-021', label: 'Видеокарта NVIDIA RTX 4070 Ti', price: 42000 },
  { value: 'SSD-SAM-005', label: 'SSD Samsung 990 PRO 1TB', price: 8900 },
  { value: 'PC-WS-001', label: 'Рабочая станция VERTEX Pro', price: 170000 },
];

const SERVICE_OPTIONS = [
  { value: 'assembly', label: 'Сборка ПК', price: 3500 },
  { value: 'os_install', label: 'Установка и настройка ОС Windows', price: 2000 },
  { value: 'stress_test', label: 'Стресс-тестирование системы', price: 1500 },
  { value: 'parts_install', label: 'Установка комплектующих', price: 3500 },
  { value: 'corp_setup', label: 'Корпоративная настройка ПО', price: 10000 },
];

const CLIENT_OPTIONS = [
  { login: 'ivan_i', name: 'Иванов Иван Иванович' },
  { login: 'anna_s', name: 'Смирнова Анна Сергеевна' },
  { login: 'kuz_dim', name: 'Кузнецов Дмитрий Олегович' },
  { login: 'tech_stroy', name: 'ООО "ТехноСтрой"' },
];

const EMPLOYEE_OPTIONS = [
  { id: 'EMP-001', name: 'Петров П.П.' },
  { id: 'EMP-002', name: 'Сидоров С.С.' },
  { id: 'EMP-003', name: 'Иванова М.И.' },
];

const PRODUCT_PRICE = Object.fromEntries(ORDER_PRODUCT_OPTIONS.map((o) => [o.value, o.price]));
const SERVICE_PRICE = Object.fromEntries(SERVICE_OPTIONS.map((o) => [o.value, o.price]));
const SERVICE_VALUE_BY_LABEL = Object.fromEntries(SERVICE_OPTIONS.map((o) => [o.label, o.value]));

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  paid: { label: 'Оплачено', variant: 'success' },
  assembling: { label: 'В сборке', variant: 'warning' },
  ready: { label: 'Готов к выдаче', variant: 'info' },
  delivered: { label: 'Выдан', variant: 'neutral' },
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
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

function DeleteConfirmModal({ orderId, onCancel, onConfirm }: { orderId: string; onCancel: () => void; onConfirm: () => void }) {
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
            className="px-6 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-error text-on-error hover:opacity-90 rounded-lg transition-opacity text-label-md shadow-sm"
          >
            Удалить
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
                <tr key={s.name} className="hover:bg-surface-container-lowest transition-colors">
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

// ── New order modal ───────────────────────────────────────────────────────────

interface ProductLine {
  id: number;
  product: string;
  quantity: number;
}

interface ServiceLine {
  id: number;
  service: string;
}

function OrderFormModal({ order, onClose, onSave }: { order: Order | null; onClose: () => void; onSave: (o: Order) => void }) {
  const [client, setClient] = useState(order?.clientLogin ?? '');
  const [employee, setEmployee] = useState(order?.employeeId ?? '');
  const [status, setStatus] = useState<OrderStatus>(order?.status ?? 'assembling');

  const initialProductLines: ProductLine[] =
    order && order.products.length
      ? order.products.map((p, i) => ({ id: i + 1, product: p.id, quantity: p.quantity }))
      : [{ id: 1, product: '', quantity: 1 }];
  const initialServiceLines: ServiceLine[] =
    order && order.services.length
      ? order.services.map((s, i) => ({ id: i + 1, service: SERVICE_VALUE_BY_LABEL[s.name] ?? '' }))
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

  const linePrice = (line: ProductLine) => (PRODUCT_PRICE[line.product] ?? 0) * line.quantity;
  const total =
    productLines.reduce((sum, l) => sum + linePrice(l), 0) +
    serviceLines.reduce((sum, l) => sum + (SERVICE_PRICE[l.service] ?? 0), 0);

  const submit = () => {
    const products = productLines
      .filter((l) => l.product)
      .map((l) => {
        const opt = ORDER_PRODUCT_OPTIONS.find((o) => o.value === l.product)!;
        return { id: opt.value, name: opt.label, quantity: l.quantity, amount: opt.price * l.quantity };
      });
    const services = serviceLines
      .filter((l) => l.service)
      .map((l) => {
        const opt = SERVICE_OPTIONS.find((o) => o.value === l.service)!;
        return { name: opt.label, price: opt.price };
      });
    const clientOpt = CLIENT_OPTIONS.find((c) => c.login === client);
    const employeeOpt = EMPLOYEE_OPTIONS.find((e) => e.id === employee);

    onSave({
      id: order?.id ?? '',
      clientLogin: client,
      clientName: clientOpt?.name ?? '',
      employeeId: employee,
      employeeName: employeeOpt?.name ?? '',
      totalAmount: total,
      taxDeduction: order?.taxDeduction ?? Math.round(total * 0.1),
      receiptDate: order?.receiptDate ?? new Date().toISOString().slice(0, 10),
      issueDate: status === 'delivered' ? (order?.issueDate ?? new Date().toISOString().slice(0, 10)) : null,
      status,
      products,
      services,
    });
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
            className="px-6 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md shadow-sm"
          >
            {order ? 'Сохранить изменения' : 'Создать заказ'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div>
            <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Клиент</label>
            <Select
              variant="outlined"
              value={client}
              onChange={setClient}
              placeholder="Выберите клиента..."
              options={CLIENT_OPTIONS.map((c) => ({ value: c.login, label: `${c.login} (${c.name})` }))}
            />
          </div>
          <div>
            <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Сотрудник</label>
            <Select
              variant="outlined"
              value={employee}
              onChange={setEmployee}
              placeholder="Выберите сотрудника..."
              options={EMPLOYEE_OPTIONS.map((e) => ({ value: e.id, label: `${e.id} — ${e.name}` }))}
            />
          </div>
          <div>
            <label className="block text-label-sm font-bold text-on-surface-variant uppercase mb-2">Статус</label>
            <Select
              variant="outlined"
              value={status}
              onChange={(v) => setStatus(v as OrderStatus)}
              options={[
                { value: 'paid', label: 'Оплачено' },
                { value: 'assembling', label: 'В сборке' },
                { value: 'ready', label: 'Готов к выдаче' },
                { value: 'delivered', label: 'Выдан' },
              ]}
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
                        options={ORDER_PRODUCT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
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

        {/* Services — multiple, like products */}
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
                        placeholder="Выберите услугу..."
                        options={SERVICE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        className="px-1"
                      />
                    </td>
                    <td className="p-2 text-right text-body-md">{line.service ? formatAmount(SERVICE_PRICE[line.service] ?? 0) : '—'}</td>
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

function OrdersTable({ orders, setOrders }: { orders: Order[]; setOrders: React.Dispatch<React.SetStateAction<Order[]>> }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [details, setDetails] = useState<{ order: Order; type: 'products' | 'services' } | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);

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

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (order: Order) => { setEditing(order); setShowForm(true); };

  const save = (o: Order) => {
    if (o.id) {
      setOrders((list) => list.map((x) => (x.id === o.id ? o : x)));
    } else {
      const maxNum = orders.reduce((m, x) => Math.max(m, Number(x.id.replace('ORD-', '')) || 0), 0);
      setOrders((list) => [{ ...o, id: `ORD-${maxNum + 1}` }, ...list]);
    }
    setShowForm(false);
  };

  const confirmDelete = () => {
    if (deleting) setOrders((list) => list.filter((x) => x.id !== deleting.id));
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

      {/* Filters */}
      <div className="flex flex-wrap gap-sm items-center bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            className="w-full bg-transparent border-none focus:ring-0 text-body-md placeholder-on-surface-variant text-on-surface p-0 outline-none"
            placeholder="ID заказа, клиент, сотрудник..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
        <Select
          icon="pending_actions"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'Все статусы' },
            { value: 'paid', label: 'Оплачено' },
            { value: 'assembling', label: 'В сборке' },
            { value: 'ready', label: 'Готов к выдаче' },
            { value: 'delivered', label: 'Выдан' },
          ]}
        />
        {/* Кнопка «Больше фильтров» — закомментирована, может понадобиться позже
        <button className="ml-auto px-4 py-2 border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg transition-colors text-label-md flex items-center gap-xs">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>filter_list</span>
          Больше фильтров
        </button>
        */}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wider">
                <th className="p-4">ID заказа</th>
                <th className="p-4">Клиент (Login / ФИО)</th>
                <th className="p-4">Сотрудник (ID / ФИО)</th>
                <th className="p-4 text-right whitespace-nowrap">Сумма всего</th>
                {/* <th className="p-4 text-center">Налоговый вычет</th> — закомментирован, может понадобиться позже */}
                <th className="p-4">Даты (запрос / выдача)</th>
                <th className="p-4">Статус</th>
                <th className="p-4">Подробности</th>
                <th className="p-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
              {filtered.map((order) => {
                const status = STATUS_CONFIG[order.status];
                return (
                  <tr key={order.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="p-4 font-mono text-sm text-on-surface">#{order.id}</td>
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{order.clientLogin}</div>
                      <div className="text-on-surface-variant text-sm">{order.clientName}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{order.employeeId}</div>
                      <div className="text-on-surface-variant text-sm">{order.employeeName}</div>
                    </td>
                    <td className="p-4 text-right font-medium whitespace-nowrap">{formatAmount(order.totalAmount)}</td>
                    {/* <td className="p-4 text-center text-on-surface-variant">{formatAmount(order.taxDeduction)}</td> — закомментирован */}
                    <td className="p-4 text-on-surface-variant text-sm">
                      {formatDate(order.receiptDate)}
                      <br />
                      <span className={order.issueDate ? 'text-primary' : 'text-on-surface-variant'}>
                        {formatDate(order.issueDate)}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant={status.variant}>{status.label}</Badge>
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
                      <ActionButtons onEdit={() => openEdit(order)} onDelete={() => setDeleting(order)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center text-on-surface-variant text-label-md">
          <span>Показано {filtered.length} из {orders.length} заказов</span>
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

      {showForm && <OrderFormModal order={editing} onClose={() => setShowForm(false)} onSave={save} />}
      {details && <OrderItemsModal order={details.order} type={details.type} onClose={() => setDetails(null)} />}
      {deleting && <DeleteConfirmModal orderId={deleting.id} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders().then((data) => {
      setOrders(data);
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

  return <OrdersTable orders={orders} setOrders={setOrders} />;
}
