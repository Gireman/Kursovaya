import { useEffect, useState } from 'react';
import { createRepair, deleteRepair, fetchRepairs, updateRepair } from '../../api/repairs';
import { fetchClients, fetchEmployees } from '../../api/users';
import type { Client, Employee, Repair, RepairInput } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';

const PAGE_SIZE = 5;

// Статусы ремонта (русские подписи, как хранятся в repairs.Status).
const STATUS_CONFIG: Record<string, { variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  'Принято': { variant: 'neutral' },
  'Диагностика': { variant: 'info' },
  'В работе': { variant: 'info' },
  'Ожидает запчасти': { variant: 'warning' },
  'Готов к выдаче': { variant: 'success' },
  'Выдан': { variant: 'neutral' },
};
const STATUS_LIST = Object.keys(STATUS_CONFIG);
const STATUS_OPTIONS = STATUS_LIST.map((s) => ({ value: s, label: s }));
const DEFAULT_STATUS = 'Принято';
const statusStyle = (status: string) => STATUS_CONFIG[status] ?? { variant: 'neutral' as const };

// Оформлять ремонт может только сотрудник с этой должностью (posts.Post).
const REPAIRMAN_POST = 'Ремонтник';

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Pagination({ page, total, count, onPrev, onNext }: { page: number; total: number; count: number; onPrev: () => void; onNext: () => void }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center text-on-surface-variant text-label-md">
      <span>Показано {count} из {total} ремонтов</span>
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
  repairId,
  onCancel,
  onConfirm,
  onError,
}: {
  repairId: string;
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
      onError(e instanceof Error ? e.message : 'Не удалось удалить ремонт');
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
        Вы уверены, что хотите удалить ремонт <span className="font-medium text-on-surface">#{repairId}</span>? Это действие нельзя будет отменить.
      </p>
    </Modal>
  );
}

// ── Repair form modal (create / edit) ─────────────────────────────────────────────

const labelClass = 'block text-label-sm font-bold text-on-surface-variant uppercase mb-2';
const inputClass =
  'w-full p-2 bg-surface-container-lowest rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md outline-none';

function RepairFormModal({
  repair,
  clients,
  employees,
  onClose,
  onSave,
}: {
  repair: Repair | null;
  clients: Client[];
  employees: Employee[];
  onClose: () => void;
  onSave: (r: Repair) => void;
}) {
  const [client, setClient] = useState(repair?.clientId ?? '');
  const [employee, setEmployee] = useState(repair?.employeeId ?? '');
  const [deviceName, setDeviceName] = useState(repair?.deviceName ?? '');
  const [cost, setCost] = useState(repair?.cost ?? 0);
  const [homeVisit, setHomeVisit] = useState(repair ? repair.homeVisit : false);
  const [repairable, setRepairable] = useState(repair ? repair.repairable : true);
  const [status, setStatus] = useState<string>(repair?.status ?? DEFAULT_STATUS);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // В списке — только ремонтники. Если у редактируемого ремонта сотрудник другой
  // должности, оставляем его в списке, чтобы выбор не «слетел» молча.
  const repairmen = employees.filter((e) => e.role === REPAIRMAN_POST || e.id === repair?.employeeId);

  const submit = async () => {
    setError('');
    if (!client) return setError('Выберите клиента');
    if (!employee) return setError('Выберите сотрудника');
    if (!deviceName.trim()) return setError('Укажите название техники');

    const input: RepairInput = {
      clientId: client,
      employeeId: employee,
      deviceName: deviceName.trim(),
      cost,
      homeVisit,
      repairable,
      status,
    };

    setSaving(true);
    try {
      const saved = repair ? await updateRepair(repair.id, input) : await createRepair(input);
      onSave(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить ремонт');
      setSaving(false);
    }
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
            {saving ? 'Сохранение...' : repair ? 'Сохранить изменения' : 'Создать ремонт'}
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
            <label className={labelClass}>Клиент</label>
            <Select
              variant="outlined"
              value={client}
              onChange={setClient}
              placeholder="Выберите клиента..."
              options={clients.map((c) => ({ value: String(c.id), label: c.login }))}
            />
          </div>
          <div>
            <label className={labelClass}>Сотрудник</label>
            <Select
              variant="outlined"
              value={employee}
              onChange={setEmployee}
              placeholder="Выберите сотрудника..."
              options={repairmen.map((e) => ({ value: e.id, label: `${e.id} — ${e.fullName}` }))}
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
          {/* Статус задаётся только при редактировании; при создании всегда «Принято». */}
          {repair && (
            <div>
              <label className={labelClass}>Статус</label>
              <Select variant="outlined" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            </div>
          )}
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
          {/* «Подлежит ремонту» меняется только при редактировании; при создании всегда «Да». */}
          {repair && (
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
          )}
        </div>
        {repair && status === 'Выдан' && (
          <p className="text-body-sm text-on-surface-variant">Дата возврата будет проставлена автоматически (сегодня).</p>
        )}
      </div>
    </Modal>
  );
}

// ── Stats cards ────────────────────────────────────────────────────────────────

function StatsCards({ repairs }: { repairs: Repair[] }) {
  const inProgress = repairs.filter((r) => r.status === 'В работе').length;
  const waitingParts = repairs.filter((r) => r.status === 'Ожидает запчасти').length;
  const ready = repairs.filter((r) => r.status === 'Готов к выдаче').length;

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

function RepairsTable({
  repairs,
  setRepairs,
  clients,
  employees,
}: {
  repairs: Repair[];
  setRepairs: React.Dispatch<React.SetStateAction<Repair[]>>;
  clients: Client[];
  employees: Employee[];
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [homeFilter, setHomeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Repair | null>(null);
  const [deleting, setDeleting] = useState<Repair | null>(null);
  const [deleteError, setDeleteError] = useState('');

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (repair: Repair) => { setEditing(repair); setShowForm(true); };

  // saved уже сохранён на сервере — просто отражаем его в стейте.
  const save = (saved: Repair) => {
    setRepairs((list) => (list.some((x) => x.id === saved.id) ? list.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...list]));
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError('');
    await deleteRepair(deleting.id);
    setRepairs((list) => list.filter((x) => x.id !== deleting.id));
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
          Новый ремонт
        </button>
      </div>

      <StatsCards repairs={repairs} />

      {deleteError && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-sm">{deleteError}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-sm items-center bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            className="w-full bg-transparent border-none focus:ring-0 text-body-md placeholder-on-surface-variant text-on-surface p-0 outline-none"
            placeholder="ID, клиент, сотрудник, техника..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />
        <Select
          icon="pending_actions"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[{ value: '', label: 'Все статусы' }, ...STATUS_OPTIONS]}
        />
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant">home</span>
          <span className="text-label-md text-on-surface-variant whitespace-nowrap">Выезд на дом:</span>
          <div className="w-16">
            <Select
              block
              value={homeFilter}
              onChange={(v) => { setHomeFilter(v); setPage(1); }}
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
                <th className="p-4 whitespace-nowrap">ID</th>
                <th className="p-4 whitespace-nowrap">Клиент</th>
                <th className="p-4 whitespace-nowrap">Сотрудник</th>
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
              {paged.map((repair) => {
                const status = statusStyle(repair.status);
                return (
                  <tr key={repair.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="p-4 font-mono text-sm text-on-surface">{repair.id}</td>
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{repair.clientLogin}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{repair.employeeName}</div>
                    </td>
                    <td className="p-4">{repair.deviceName}</td>
                    <td className="p-4 text-center">
                      <Badge variant={repair.repairable ? 'success' : 'error'}>{repair.repairable ? 'Да' : 'Нет'}</Badge>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={repair.homeVisit ? 'success' : 'error'}>{repair.homeVisit ? 'Да' : 'Нет'}</Badge>
                    </td>
                    <td className="p-4 text-on-surface-variant text-sm whitespace-nowrap">
                      {formatDate(repair.submitDate)} - {formatDate(repair.returnDate)}
                    </td>
                    <td className="p-4 text-right font-medium whitespace-nowrap">{formatAmount(repair.cost)}</td>
                    {/* <td className="p-4 text-right text-on-surface-variant whitespace-nowrap">{formatAmount(repair.taxDeduction)}</td> — закомментирован */}
                    <td className="p-4 text-center">
                      <Badge variant={status.variant}>{repair.status}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <ActionButtons onEdit={() => openEdit(repair)} onDelete={() => { setDeleteError(''); setDeleting(repair); }} />
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

      {showForm && (
        <RepairFormModal
          repair={editing}
          clients={clients}
          employees={employees}
          onClose={() => setShowForm(false)}
          onSave={save}
        />
      )}
      {deleting && (
        <DeleteConfirmModal
          repairId={deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          onError={(msg) => { setDeleteError(msg); setDeleting(null); }}
        />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Repairs() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchRepairs(), fetchClients(), fetchEmployees()]).then(([rep, cl, emp]) => {
      setRepairs(rep);
      setClients(cl);
      setEmployees(emp);
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

  return <RepairsTable repairs={repairs} setRepairs={setRepairs} clients={clients} employees={employees} />;
}
