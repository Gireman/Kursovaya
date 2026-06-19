import { useEffect, useState } from 'react';
import { fetchRepairs } from '../../api/repairs';
import type { Repair, RepairStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';

const CLIENT_OPTIONS = [
  { login: 'ivan_i', name: 'Иван Иванов' },
  { login: 'anna_s', name: 'Анна Смирнова' },
  { login: 'vector_corp', name: 'ООО "Вектор"' },
  { login: 'elena_p', name: 'Елена Попова' },
  { login: 'dmitry_v', name: 'Дмитрий Васильев' },
];

const EMPLOYEE_OPTIONS = [
  { id: 'EMP-001', name: 'Петр Смирнов' },
  { id: 'EMP-002', name: 'Алексей Попов' },
  { id: 'EMP-003', name: 'Дмитрий Волков' },
];

const STATUS_CONFIG: Record<RepairStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  accepted: { label: 'Принято', variant: 'neutral' },
  diagnostics: { label: 'Диагностика', variant: 'info' },
  in_progress: { label: 'В работе', variant: 'info' },
  waiting_parts: { label: 'Ожидает запчасти', variant: 'warning' },
  ready: { label: 'Готов к выдаче', variant: 'success' },
  issued: { label: 'Выдан', variant: 'neutral' },
};

const STATUS_OPTIONS = (Object.keys(STATUS_CONFIG) as RepairStatus[]).map((value) => ({
  value,
  label: STATUS_CONFIG[value].label,
}));

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

function DeleteConfirmModal({ repairId, onCancel, onConfirm }: { repairId: string; onCancel: () => void; onConfirm: () => void }) {
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
        Вы уверены, что хотите удалить ремонт <span className="font-medium text-on-surface">#{repairId}</span>? Это действие нельзя будет отменить.
      </p>
    </Modal>
  );
}

// ── Repair form modal (create / edit) ─────────────────────────────────────────────

const labelClass = 'block text-label-sm font-bold text-on-surface-variant uppercase mb-2';
const inputClass =
  'w-full p-2 bg-surface-container-lowest rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md outline-none';

function RepairFormModal({ repair, onClose, onSave }: { repair: Repair | null; onClose: () => void; onSave: (r: Repair) => void }) {
  const [client, setClient] = useState(repair?.clientLogin ?? '');
  const [employee, setEmployee] = useState(repair?.employeeId ?? '');
  const [deviceName, setDeviceName] = useState(repair?.deviceName ?? '');
  const [cost, setCost] = useState(repair?.cost ?? 0);
  const [homeVisit, setHomeVisit] = useState(repair ? repair.homeVisit : false);
  const [repairable, setRepairable] = useState(repair ? repair.repairable : true);
  const [status, setStatus] = useState<RepairStatus>(repair?.status ?? 'accepted');

  const submit = () => {
    const clientOpt = CLIENT_OPTIONS.find((c) => c.login === client);
    const employeeOpt = EMPLOYEE_OPTIONS.find((e) => e.id === employee);

    onSave({
      id: repair?.id ?? '',
      clientLogin: client,
      clientName: clientOpt?.name ?? '',
      employeeId: employee,
      employeeName: employeeOpt?.name ?? '',
      deviceName,
      repairable,
      homeVisit,
      submitDate: repair?.submitDate ?? new Date().toISOString().slice(0, 10),
      returnDate: status === 'issued' ? (repair?.returnDate ?? new Date().toISOString().slice(0, 10)) : (repair?.returnDate ?? null),
      cost,
      taxDeduction: repair?.taxDeduction ?? 0,
      status,
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={repair ? `Редактировать ремонт #${repair.id}` : 'Новый ремонт'}
      subtitle={repair ? undefined : 'Заполните данные для оформления заявки на ремонт'}
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
            {repair ? 'Сохранить изменения' : 'Создать ремонт'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div>
          <label className={labelClass}>Клиент (Login / ФИО)</label>
          <Select
            variant="outlined"
            value={client}
            onChange={setClient}
            placeholder="Выберите клиента..."
            options={CLIENT_OPTIONS.map((c) => ({ value: c.login, label: `${c.login} (${c.name})` }))}
          />
        </div>
        <div>
          <label className={labelClass}>Сотрудник (ID / ФИО)</label>
          <Select
            variant="outlined"
            value={employee}
            onChange={setEmployee}
            placeholder="Выберите сотрудника..."
            options={EMPLOYEE_OPTIONS.map((e) => ({ value: e.id, label: `${e.id} — ${e.name}` }))}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Название техники</label>
          <input
            className={inputClass}
            placeholder="Напр. Ноутбук ASUS ROG"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Стоимость ремонта (₽)</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            placeholder="0"
            value={cost}
            onChange={(e) => setCost(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
        <div>
          <label className={labelClass}>Выезд на дом</label>
          <Select
            variant="outlined"
            value={homeVisit ? 'yes' : 'no'}
            onChange={(v) => setHomeVisit(v === 'yes')}
            options={[
              { value: 'no', label: 'Нет' },
              { value: 'yes', label: 'Да' },
            ]}
          />
        </div>
        <div>
          <label className={labelClass}>Подлежит ремонту</label>
          <Select
            variant="outlined"
            value={repairable ? 'yes' : 'no'}
            onChange={(v) => setRepairable(v === 'yes')}
            options={[
              { value: 'yes', label: 'Да' },
              { value: 'no', label: 'Нет' },
            ]}
          />
        </div>
        <div>
          <label className={labelClass}>Статус</label>
          <Select
            variant="outlined"
            value={status}
            onChange={(v) => setStatus(v as RepairStatus)}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>
    </Modal>
  );
}

// ── Stats cards ────────────────────────────────────────────────────────────────

function StatsCards({ repairs }: { repairs: Repair[] }) {
  const inProgress = repairs.filter((r) => r.status === 'in_progress').length;
  const waitingParts = repairs.filter((r) => r.status === 'waiting_parts').length;
  const ready = repairs.filter((r) => r.status === 'ready').length;

  const cards = [
    { label: 'В работе', value: inProgress, icon: 'engineering', className: 'text-primary bg-primary-container' },
    { label: 'Ожидают запчасти', value: waitingParts, icon: 'inventory', className: 'text-tertiary bg-tertiary/10' },
    { label: 'Готовы к выдаче', value: ready, icon: 'check_circle', className: 'text-secondary bg-secondary/10' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
      {cards.map((c) => (
        <div key={c.label} className="bg-surface p-md rounded-xl border border-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-sm">
            <div className="text-label-md text-on-surface-variant">{c.label}</div>
            <span className={`material-symbols-outlined p-2 rounded-full ${c.className}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {c.icon}
            </span>
          </div>
          <div className="text-headline-lg font-bold text-on-surface">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Repairs table ────────────────────────────────────────────────────────────────

function RepairsTable({ repairs, setRepairs }: { repairs: Repair[]; setRepairs: React.Dispatch<React.SetStateAction<Repair[]>> }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [homeFilter, setHomeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Repair | null>(null);
  const [deleting, setDeleting] = useState<Repair | null>(null);

  const filtered = repairs.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.clientLogin.toLowerCase().includes(q) ||
      r.clientName.toLowerCase().includes(q) ||
      r.employeeId.toLowerCase().includes(q) ||
      r.employeeName.toLowerCase().includes(q) ||
      r.deviceName.toLowerCase().includes(q);
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchHome = !homeFilter || (homeFilter === 'yes' ? r.homeVisit : !r.homeVisit);
    return matchSearch && matchStatus && matchHome;
  });

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (repair: Repair) => { setEditing(repair); setShowForm(true); };

  const save = (r: Repair) => {
    if (r.id) {
      setRepairs((list) => list.map((x) => (x.id === r.id ? r : x)));
    } else {
      const maxNum = repairs.reduce((m, x) => {
        const n = Number(x.id.split('-').pop()) || 0;
        return Math.max(m, n);
      }, 0);
      const nextId = `REP-2023-${String(maxNum + 1).padStart(3, '0')}`;
      setRepairs((list) => [{ ...r, id: nextId }, ...list]);
    }
    setShowForm(false);
  };

  const confirmDelete = () => {
    if (deleting) setRepairs((list) => list.filter((x) => x.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div className="flex flex-col gap-sm">
          <h1 className="text-headline-lg font-bold text-on-background">Активные ремонты</h1>
          <p className="text-body-md text-on-surface-variant">Управление текущими заказами и статусами ремонта.</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md flex items-center gap-xs shadow-sm self-start sm:self-auto"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Новый заказ
        </button>
      </div>

      <StatsCards repairs={repairs} />

      {/* Filters */}
      <div className="flex flex-wrap gap-sm items-center bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            className="w-full bg-transparent border-none focus:ring-0 text-body-md placeholder-on-surface-variant text-on-surface p-0 outline-none"
            placeholder="ID ремонта, клиент, сотрудник, техника..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
        <Select
          icon="pending_actions"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: '', label: 'Все статусы' }, ...STATUS_OPTIONS]}
        />
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant">home</span>
          <span className="text-label-md text-on-surface-variant whitespace-nowrap">Выезд на дом:</span>
          <div className="w-16">
            <Select
              block
              value={homeFilter}
              onChange={setHomeFilter}
              options={[
                { value: '', label: 'Все' },
                { value: 'yes', label: 'Да' },
                { value: 'no', label: 'Нет' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wider">
                <th className="p-4 whitespace-nowrap">ID ремонта</th>
                <th className="p-4 whitespace-nowrap">Клиент (Login / ФИО)</th>
                <th className="p-4 whitespace-nowrap">Сотрудник (ID / ФИО)</th>
                <th className="p-4 whitespace-nowrap">Название техники</th>
                <th className="p-4 whitespace-nowrap text-center">Подлежит ремонту</th>
                <th className="p-4 whitespace-nowrap text-center">Выезд на дом</th>
                <th className="p-4 whitespace-nowrap">Даты (подача / возврат)</th>
                <th className="p-4 whitespace-nowrap text-right">Стоимость ремонта</th>
                {/* <th className="p-4 whitespace-nowrap text-right">Налоговый вычет</th> — закомментирован, может понадобиться позже */}
                <th className="p-4 whitespace-nowrap text-center">Статус</th>
                <th className="p-4 whitespace-nowrap text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
              {filtered.map((repair) => {
                const status = STATUS_CONFIG[repair.status];
                return (
                  <tr key={repair.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="p-4 font-mono text-sm text-primary">#{repair.id}</td>
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{repair.clientLogin}</div>
                      <div className="text-on-surface-variant text-sm">{repair.clientName}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{repair.employeeId}</div>
                      <div className="text-on-surface-variant text-sm">{repair.employeeName}</div>
                    </td>
                    <td className="p-4">{repair.deviceName}</td>
                    <td className="p-4 text-center">
                      <Badge variant={repair.repairable ? 'success' : 'error'}>{repair.repairable ? 'Да' : 'Нет'}</Badge>
                    </td>
                    <td className="p-4 text-center">
                      {repair.homeVisit ? (
                        <span className="material-symbols-outlined text-primary" title="Выезд на дом">home</span>
                      ) : (
                        <span className="material-symbols-outlined text-outline" title="Без выезда">horizontal_rule</span>
                      )}
                    </td>
                    <td className="p-4 text-on-surface-variant text-sm whitespace-nowrap">
                      {formatDate(repair.submitDate)} - {formatDate(repair.returnDate)}
                    </td>
                    <td className="p-4 text-right font-medium whitespace-nowrap">{formatAmount(repair.cost)}</td>
                    {/* <td className="p-4 text-right text-on-surface-variant whitespace-nowrap">{formatAmount(repair.taxDeduction)}</td> — закомментирован */}
                    <td className="p-4 text-center">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <ActionButtons onEdit={() => openEdit(repair)} onDelete={() => setDeleting(repair)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center text-on-surface-variant text-label-md">
          <span>Показано {filtered.length} из {repairs.length} ремонтов</span>
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

      {showForm && <RepairFormModal repair={editing} onClose={() => setShowForm(false)} onSave={save} />}
      {deleting && <DeleteConfirmModal repairId={deleting.id} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Repairs() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepairs().then((data) => {
      setRepairs(data);
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

  return <RepairsTable repairs={repairs} setRepairs={setRepairs} />;
}
