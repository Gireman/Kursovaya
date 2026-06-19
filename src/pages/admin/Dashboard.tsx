import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOrders } from '../../api/orders';
import { fetchRepairs } from '../../api/repairs';
import { fetchInventory } from '../../api/inventory';
import type { Order, Repair, InventoryItem, OrderStatus, RepairStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';

const LOW_STOCK_THRESHOLD = 3;

type BadgeVariant = 'success' | 'error' | 'info' | 'warning' | 'neutral';

const ORDER_STATUS: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  paid: { label: 'Оплачено', variant: 'success' },
  assembling: { label: 'В сборке', variant: 'warning' },
  ready: { label: 'Готов к выдаче', variant: 'info' },
  delivered: { label: 'Выдан', variant: 'neutral' },
};

const REPAIR_STATUS: Record<RepairStatus, { label: string; variant: BadgeVariant }> = {
  accepted: { label: 'Принято', variant: 'neutral' },
  diagnostics: { label: 'Диагностика', variant: 'info' },
  in_progress: { label: 'В работе', variant: 'info' },
  waiting_parts: { label: 'Ожидает запчасти', variant: 'warning' },
  ready: { label: 'Готов к выдаче', variant: 'success' },
  issued: { label: 'Выдан', variant: 'neutral' },
};

// Mock monthly series — drives the bar charts (variant B: heights computed from data).
const REVENUE_BY_MONTH = [
  { label: 'Май', value: 320000 },
  { label: 'Июн', value: 480000 },
  { label: 'Июл', value: 390000 },
  { label: 'Авг', value: 610000 },
  { label: 'Сен', value: 540000 },
  { label: 'Окт', value: 720000 },
];

const REPAIRS_BY_MONTH = [
  { label: 'Май', value: 120 },
  { label: 'Июн', value: 180 },
  { label: 'Июл', value: 105 },
  { label: 'Авг', value: 240 },
  { label: 'Сен', value: 150 },
  { label: 'Окт', value: 210 },
];

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ── Stat cards ──────────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  accent?: boolean;
  hint?: string;
}

function StatCards({ orders, repairs, inventory }: { orders: Order[]; repairs: Repair[]; inventory: InventoryItem[] }) {
  const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const activeRepairs = repairs.filter((r) => r.status !== 'issued').length;
  const totalOrders = orders.length;
  const lowStock = inventory.filter((i) => i.quantity < LOW_STOCK_THRESHOLD).length;

  const cards: StatCard[] = [
    { label: 'Выручка (заказы)', value: formatAmount(revenue), icon: 'payments', hint: 'Всего' },
    { label: 'В ремонте', value: String(activeRepairs), unit: 'устройств', icon: 'build', hint: 'Сейчас' },
    { label: 'Всего заказов', value: String(totalOrders), icon: 'shopping_bag', hint: 'Сейчас' },
    { label: 'Заканчиваются запчасти', value: String(lowStock), unit: 'позиций', icon: 'warning', accent: true, hint: 'Требует внимания' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-surface rounded-xl p-md border border-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0px_8px_24px_rgba(0,0,0,0.1)] transition-shadow"
        >
          <div className="flex justify-between items-start mb-sm">
            <div className={`p-xs rounded-lg ${c.accent ? 'bg-error-container text-error' : 'bg-surface-container text-primary'}`}>
              <span className="material-symbols-outlined">{c.icon}</span>
            </div>
            {c.hint && (
              <span className={`text-label-sm ${c.accent ? 'text-error' : 'text-on-surface-variant'}`}>{c.hint}</span>
            )}
          </div>
          <div className="text-label-md text-on-surface-variant mb-xs">{c.label}</div>
          <div className={`text-headline-md font-semibold ${c.accent ? 'text-error' : 'text-on-surface'}`}>
            {c.value}
            {c.unit && <span className="text-body-md text-on-surface-variant font-normal"> {c.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Bar chart (CSS, data-driven) ──────────────────────────────────────────────

function BarChart({ data, valueFormatter }: { data: { label: string; value: number }[]; valueFormatter?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const peak = Math.max(...data.map((d) => d.value));

  return (
    <div>
      <div className="h-56 flex items-end justify-between gap-3 pt-xl border-l border-outline-variant/50">
        {data.map((d) => {
          const isPeak = d.value === peak;
          return (
            <div key={d.label} className="flex-1 h-full flex items-end justify-center">
              <div
                className={`group relative w-8 rounded-t-sm transition-colors ${isPeak ? 'bg-primary shadow-md' : 'bg-surface-container-high hover:bg-primary'}`}
                style={{ height: `${(d.value / max) * 100}%` }}
              >
                <span
                  className={`absolute -top-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap transition-opacity ${
                    isPeak ? 'font-bold text-on-surface' : 'text-on-surface-variant opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {valueFormatter ? valueFormatter(d.value) : d.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-3 border-t border-outline-variant/50 pt-2">
        {data.map((d) => (
          <span
            key={d.label}
            className={`flex-1 text-center text-label-sm ${d.value === peak ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, year, children }: { title: string; year: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl p-md border border-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center mb-md">
        <h2 className="text-headline-md font-bold text-on-surface">{title}</h2>
        <span className="text-label-md text-on-surface-variant">{year}</span>
      </div>
      {children}
    </div>
  );
}

// ── Recent activity (derived from orders + repairs) ────────────────────────────

interface Activity {
  key: string;
  id: string;
  client: string;
  device: string;
  status: { label: string; variant: BadgeVariant };
  amount: number;
  date: string;
}

function buildActivity(orders: Order[], repairs: Repair[]): Activity[] {
  const fromOrders: Activity[] = orders.map((o) => ({
    key: `O-${o.id}`,
    id: o.id,
    client: o.clientName,
    device: o.products[0]?.name ?? `Заказ (${o.products.length} поз.)`,
    status: ORDER_STATUS[o.status],
    amount: o.totalAmount,
    date: o.issueDate ?? o.receiptDate,
  }));

  const fromRepairs: Activity[] = repairs.map((r) => ({
    key: `R-${r.id}`,
    id: r.id,
    client: r.clientName,
    device: r.deviceName,
    status: REPAIR_STATUS[r.status],
    amount: r.cost,
    date: r.returnDate ?? r.submitDate,
  }));

  return [...fromOrders, ...fromRepairs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}

function RecentActivity({ orders, repairs }: { orders: Order[]; repairs: Repair[] }) {
  const items = buildActivity(orders, repairs);

  return (
    <div>
      <div className="flex justify-between items-center mb-md">
        <h2 className="text-headline-md font-bold text-on-surface">Последняя активность</h2>
        <Link to="/admin/orders" className="text-primary text-label-md hover:text-secondary transition-colors">
          Все заказы
        </Link>
      </div>
      <div className="overflow-x-auto bg-surface border border-outline-variant rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant uppercase tracking-wider">
              <th className="p-4 text-label-sm">ID</th>
              <th className="p-4 text-label-sm">Клиент</th>
              <th className="p-4 text-label-sm">Устройство / Состав</th>
              <th className="p-4 text-label-sm">Дата</th>
              <th className="p-4 text-label-sm">Статус</th>
              <th className="p-4 text-label-sm text-right">Сумма</th>
            </tr>
          </thead>
          <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
            {items.map((a) => (
              <tr key={a.key} className="hover:bg-surface-container-lowest transition-colors">
                <td className="p-4 font-mono text-sm text-on-surface">#{a.id}</td>
                <td className="p-4">{a.client}</td>
                <td className="p-4 text-on-surface-variant">{a.device}</td>
                <td className="p-4 text-on-surface-variant text-sm whitespace-nowrap">{formatDate(a.date)}</td>
                <td className="p-4">
                  <Badge variant={a.status.variant}>{a.status.label}</Badge>
                </td>
                <td className="p-4 text-right font-medium whitespace-nowrap">{formatAmount(a.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchRepairs(), fetchInventory()]).then(([o, r, i]) => {
      setOrders(o);
      setRepairs(r);
      setInventory(i);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
        <div className="flex flex-col gap-sm">
          <h1 className="text-headline-lg font-bold text-on-background">Обзор</h1>
          <p className="text-body-md text-on-surface-variant">Сводка по заказам, ремонтам и складу.</p>
        </div>
        <Link
          to="/admin/orders"
          className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md flex items-center gap-xs shadow-sm self-start sm:self-auto"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Новый заказ
        </Link>
      </div>

      <StatCards orders={orders} repairs={repairs} inventory={inventory} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
        <ChartCard title="Выручка по месяцам" year="2026">
          <BarChart data={REVENUE_BY_MONTH} valueFormatter={formatAmount} />
        </ChartCard>
        <ChartCard title="Ремонты по месяцам" year="2026">
          <BarChart data={REPAIRS_BY_MONTH} />
        </ChartCard>
      </div>

      <RecentActivity orders={orders} repairs={repairs} />
    </>
  );
}
