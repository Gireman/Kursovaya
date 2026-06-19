import { useEffect, useState } from 'react';
import {
  fetchClients, fetchEmployees, createClient, updateClient, deleteClient,
  createEmployee, updateEmployee, deleteEmployee, fetchPosts,
} from '../../api/users';
import type { Client, ClientInput, Employee, EmployeeInput, PostRef } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';

const PAGE_SIZE = 5;

const ROLE_CONFIG: Record<string, { icon: string; className: string }> = {
  'Директор': { icon: 'admin_panel_settings', className: 'bg-tertiary-container/20 text-tertiary' },
  'Менеджер': { icon: 'support_agent', className: 'bg-secondary-container/20 text-secondary' },
  'Техник': { icon: 'build', className: 'bg-primary-container/20 text-primary' },
  'Ремонтник': { icon: 'build', className: 'bg-primary-container/20 text-primary' },
  'Кладовщик': { icon: 'inventory', className: 'bg-tertiary-container/20 text-tertiary' },
  'Бухгалтер': { icon: 'calculate', className: 'bg-secondary-container/20 text-secondary' },
};

// Должность приходит из БД свободным текстом — на неизвестную ставим нейтральный стиль.
const DEFAULT_ROLE_STYLE = { icon: 'badge', className: 'bg-surface-container text-on-surface-variant' };
const roleStyle = (role: string) => ROLE_CONFIG[role] ?? DEFAULT_ROLE_STYLE;

// Пустые/необязательные поля (Email, Адрес, Отчество) показываем прочерком.
const dash = (v?: string | null) => (v && String(v).trim() ? v : '—');

// ── Shared field styles ───────────────────────────────────────────────────────

const labelClass = 'block text-label-sm font-bold text-on-surface-variant uppercase mb-2';
const inputClass =
  'w-full rounded-lg border border-outline-variant p-2 text-body-md bg-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none';

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

function SectionTablePagination({ page, total, count, onPrev, onNext }: { page: number; total: number; count: number; onPrev: () => void; onNext: () => void }) {
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

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex flex-wrap gap-sm items-center bg-surface p-4 rounded-xl border border-outline-variant shadow-sm">
      <div className="flex items-center gap-2 flex-1 min-w-[250px]">
        <span className="material-symbols-outlined text-on-surface-variant">search</span>
        <input
          className="w-full bg-transparent border-none focus:ring-0 text-body-md placeholder-on-surface-variant text-on-surface p-0 outline-none"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// ── Delete confirmation modal ───────────────────────────────────────────────────

function DeleteConfirmModal({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
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
        Вы уверены, что хотите удалить пользователя <span className="font-medium text-on-surface">{name}</span>? Это действие нельзя будет отменить.
      </p>
    </Modal>
  );
}

// ── Client form modal (add / edit) ──────────────────────────────────────────────

function ClientFormModal({ client, onClose, onSave }: { client: Client | null; onClose: () => void; onSave: (c: ClientInput) => Promise<void> }) {
  const [fullName, setFullName] = useState(client?.fullName ?? '');
  const [login, setLogin] = useState(client?.login ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [address, setAddress] = useState(client?.address ?? '');
  const [birthday, setBirthday] = useState(client?.birthday ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError('');
    setSaving(true);
    try {
      await onSave({ fullName, login, phone, email, address, birthday, password: password || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={client ? 'Редактирование клиента' : 'Добавить клиента'}
      subtitle={client ? undefined : 'Введите данные нового клиента'}
      maxWidth="max-w-[28rem]"
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
            disabled={saving}
            className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md shadow-sm disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : client ? 'Сохранить изменения' : 'Сохранить'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-md">
        {error && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-label-md">{error}</div>
        )}
        <div>
          <label className={labelClass}>ФИО</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Логин</label>
          <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="ivan_i" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Пароль{client && ' (оставьте пустым, чтобы не менять)'}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Телефон</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Дата рождения</label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Почта</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Адрес</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="г. Москва, ул. Ленина, д. 10" rows={2} className={`${inputClass} resize-none`} />
        </div>
      </div>
    </Modal>
  );
}

// ── Employee form modal (add / edit) ────────────────────────────────────────────

function EmployeeFormModal({ employee, posts, onClose, onSave }: { employee: Employee | null; posts: PostRef[]; onClose: () => void; onSave: (e: EmployeeInput) => Promise<void> }) {
  const [fullName, setFullName] = useState(employee?.fullName ?? '');
  const [login, setLogin] = useState(employee?.login ?? '');
  const [phone, setPhone] = useState(employee?.phone ?? '');
  const [email, setEmail] = useState(employee?.email ?? '');
  const [birthday, setBirthday] = useState(employee?.birthday ?? '');
  const [postId, setPostId] = useState(employee?.postId ?? posts[0]?.id ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError('');
    setSaving(true);
    try {
      await onSave({ fullName, login, phone, email, birthday, postId, password: password || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={employee ? 'Редактирование сотрудника' : 'Добавить сотрудника'}
      subtitle={employee ? undefined : 'Введите данные нового сотрудника'}
      maxWidth="max-w-[28rem]"
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
            disabled={saving}
            className="px-6 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md shadow-sm disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : employee ? 'Сохранить изменения' : 'Сохранить'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-md">
        {error && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-label-md">{error}</div>
        )}
        <div>
          <label className={labelClass}>ФИО</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Логин</label>
          <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="ivan_i" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Пароль{employee && ' (оставьте пустым, чтобы не менять)'}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Телефон</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Дата рождения</label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Почта</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Должность</label>
          <Select
            variant="outlined"
            value={postId}
            onChange={(v) => setPostId(v)}
            options={posts.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
      </div>
    </Modal>
  );
}

// ── Clients section ─────────────────────────────────────────────────────────────

function ClientsSection({ clients, setClients }: { clients: Client[]; setClients: React.Dispatch<React.SetStateAction<Client[]>> }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.login.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.address ?? '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (c: Client) => { setEditing(c); setShowForm(true); };

  const save = async (input: ClientInput) => {
    if (editing) {
      const updated = await updateClient(editing.id, input);
      setClients((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } else {
      const created = await createClient(input);
      setClients((list) => [...list, created]);
    }
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteClient(deleting.id);
      setClients((list) => list.filter((x) => x.id !== deleting.id));
      setDeleteError('');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Ошибка удаления');
    }
    setDeleting(null);
  };

  return (
    <div className="flex flex-col gap-md">
      <div className="flex justify-between items-center">
        <h2 className="text-headline-md font-semibold text-on-surface">Клиенты</h2>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md flex items-center gap-xs shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Добавить клиента
        </button>
      </div>
      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Поиск клиента..." />
      {deleteError && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-label-md">{deleteError}</div>
      )}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {['ID', 'ФИО', 'Логин', 'Телефон', 'Дата рождения', 'Почта', 'Адрес'].map((h) => (
                  <th key={h} className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider">{h}</th>
                ))}
                <th className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {paged.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-4 font-mono text-sm text-on-surface">{c.id}</td>
                  <td className="p-4 text-body-md font-medium text-on-surface">{c.fullName}</td>
                  <td className="p-4 text-body-md text-on-surface-variant">{c.login}</td>
                  <td className="p-4 text-body-md text-on-surface-variant">{dash(c.phone)}</td>
                  <td className="p-4 text-body-md text-on-surface-variant">{dash(c.birthday)}</td>
                  <td className="p-4 text-body-md text-on-surface-variant">{dash(c.email)}</td>
                  <td className="p-4 text-body-md text-on-surface-variant">{dash(c.address)}</td>
                  <td className="p-4 text-right">
                    <ActionButtons onEdit={() => openEdit(c)} onDelete={() => setDeleting(c)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SectionTablePagination
          page={currentPage}
          total={filtered.length}
          count={paged.length}
          onPrev={() => setPage(currentPage - 1)}
          onNext={() => setPage(currentPage + 1)}
        />
      </div>

      {showForm && <ClientFormModal client={editing} onClose={() => setShowForm(false)} onSave={save} />}
      {deleting && <DeleteConfirmModal name={deleting.fullName} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
    </div>
  );
}

// ── Staff section ─────────────────────────────────────────────────────────────

function EmployeesSection({ employees, setEmployees, posts }: { employees: Employee[]; setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>; posts: PostRef[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.login.toLowerCase().includes(q) ||
      e.phone.toLowerCase().includes(q) ||
      (e.email ?? '').toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (e: Employee) => { setEditing(e); setShowForm(true); };

  const save = async (input: EmployeeInput) => {
    if (editing) {
      const updated = await updateEmployee(editing.id, input);
      setEmployees((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } else {
      const created = await createEmployee(input);
      setEmployees((list) => [...list, created]);
    }
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteEmployee(deleting.id);
      setEmployees((list) => list.filter((x) => x.id !== deleting.id));
      setDeleteError('');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Ошибка удаления');
    }
    setDeleting(null);
  };

  return (
    <div className="flex flex-col gap-md mt-xl">
      <div className="flex justify-between items-center">
        <h2 className="text-headline-md font-semibold text-on-surface">Сотрудники</h2>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors text-label-md flex items-center gap-xs shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Добавить сотрудника
        </button>
      </div>
      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Поиск сотрудника..." />
      {deleteError && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-label-md">{deleteError}</div>
      )}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {['ID', 'ФИО', 'Логин', 'Телефон', 'Почта', 'Должность'].map((h) => (
                  <th key={h} className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider">{h}</th>
                ))}
                <th className="p-4 text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {paged.map((e) => {
                const role = roleStyle(e.role);
                return (
                  <tr key={e.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="p-4 font-mono text-sm text-on-surface">{e.id}</td>
                    <td className="p-4 text-body-md font-medium text-on-surface">{e.fullName}</td>
                    <td className="p-4 text-body-md text-on-surface-variant">{e.login}</td>
                    <td className="p-4 text-body-md text-on-surface-variant">{dash(e.phone)}</td>
                    <td className="p-4 text-body-md text-on-surface-variant">{dash(e.email)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-xs px-2 py-1 rounded-full text-label-sm ${role.className}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{role.icon}</span>
                        {e.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <ActionButtons onEdit={() => openEdit(e)} onDelete={() => setDeleting(e)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SectionTablePagination
          page={currentPage}
          total={filtered.length}
          count={paged.length}
          onPrev={() => setPage(currentPage - 1)}
          onNext={() => setPage(currentPage + 1)}
        />
      </div>

      {showForm && <EmployeeFormModal employee={editing} posts={posts} onClose={() => setShowForm(false)} onSave={save} />}
      {deleting && <DeleteConfirmModal name={deleting.fullName} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Users() {
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [posts, setPosts] = useState<PostRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchClients(), fetchEmployees(), fetchPosts()]).then(([cl, emp, ps]) => {
      setClients(cl);
      setEmployees(emp);
      setPosts(ps);
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
        <h1 className="text-headline-lg font-bold text-on-background">Управление пользователями</h1>
        <p className="text-body-md text-on-surface-variant">
          Управление базой клиентов и штатным расписанием сотрудников.
        </p>
      </div>
      <ClientsSection clients={clients} setClients={setClients} />
      <EmployeesSection employees={employees} setEmployees={setEmployees} posts={posts} />
    </>
  );
}
