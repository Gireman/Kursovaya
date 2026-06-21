import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchClients, updateClient } from '../api/users';
import type { ClientInput } from '../types';

const inputClass =
  'w-full px-4 py-2 rounded-lg border bg-surface-container-lowest text-body-md font-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 border-outline-variant';

const labelClass = 'block text-label-md font-label-md text-on-surface mb-xs';

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [clientId, setClientId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientInput>({
    fullName: '',
    login: '',
    phone: '',
    email: '',
    address: '',
    birthday: '',
    password: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchClients()
      .then((clients) => {
        // AuthUser.id — это users.Id, а Client.id — это clients.Id, разные таблицы.
        // Матчим по логину, он уникален.
        const me = clients.find((c) => c.login === user.login);
        if (me) {
          setClientId(me.id);
          setForm({
            fullName: me.fullName,
            login: me.login,
            phone: me.phone,
            email: me.email ?? '',
            address: me.address ?? '',
            birthday: me.birthday ? me.birthday.slice(0, 10) : '',
            password: '',
          });
        }
      })
      .catch(() => setError('Не удалось загрузить данные профиля'))
      .finally(() => setLoading(false));
  }, [user]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
    setSuccess(false);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const input: ClientInput = { ...form };
      if (!input.password) delete input.password;
      await updateClient(clientId, input);
      setSuccess(true);
      setForm((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  if (loading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Загрузка...
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center py-xl px-md">
      <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] w-full max-w-2xl border border-outline-variant p-lg hover:shadow-[0px_8px_24px_rgba(0,0,0,0.1)] transition-shadow duration-300">
        <div className="mb-lg border-b border-outline-variant pb-md flex items-center space-x-sm">
          <span
            className="material-symbols-outlined text-primary text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            manage_accounts
          </span>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">Настройки Профиля</h1>
        </div>

        <form className="space-y-md" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="col-span-1 md:col-span-2">
              <label className={labelClass} htmlFor="fullName">ФИО</label>
              <input className={inputClass} id="fullName" type="text" value={form.fullName} onChange={handleChange} />
            </div>

            <div>
              <label className={labelClass} htmlFor="login">Логин</label>
              <input className={inputClass} id="login" type="text" value={form.login} onChange={handleChange} />
            </div>

            <div>
              <label className={labelClass} htmlFor="email">Почта</label>
              <input className={inputClass} id="email" type="email" value={form.email} onChange={handleChange} />
            </div>

            <div>
              <label className={labelClass} htmlFor="phone">Телефон</label>
              <input
                className={inputClass}
                id="phone"
                type="tel"
                placeholder="+7 (___) ___-__-__"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="birthday">Дата рождения</label>
              <input className={inputClass} id="birthday" type="date" value={form.birthday} onChange={handleChange} />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className={labelClass} htmlFor="password">Пароль</label>
              <input
                className={inputClass}
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className={labelClass} htmlFor="address">Адрес</label>
              <input
                className={inputClass}
                id="address"
                type="text"
                placeholder="Введите ваш адрес"
                value={form.address}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <p className="text-label-md font-label-md text-error bg-error-container rounded-lg px-sm py-xs">
              {error}
            </p>
          )}
          {success && (
            <p className="text-label-md font-label-md text-secondary bg-secondary-container rounded-lg px-sm py-xs">
              Изменения сохранены
            </p>
          )}

          <div className="mt-xl pt-md border-t border-outline-variant flex items-center justify-between">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-xs px-6 py-2 rounded-lg border font-label-md text-label-md border-outline-variant text-on-surface-variant hover:bg-error-container hover:text-error hover:border-error transition-colors duration-200"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
              Выйти
            </button>

            <div className="flex items-center space-x-sm">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2 rounded-lg bg-transparent border font-label-md text-label-md hover:bg-surface-container-low transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 border-outline-variant text-on-surface-variant"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
