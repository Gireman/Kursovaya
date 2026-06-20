import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, register as apiRegister, ROLE_EMPLOYEE } from '../api/auth';
import type { AuthUser } from '../api/auth';
import { useAuth } from '../auth/AuthContext';

type Mode = 'login' | 'register';

const inputClass =
  'w-full px-sm py-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim';

const labelClass = 'font-label-md text-label-md text-on-surface';

const submitClass =
  'w-full bg-primary text-on-primary font-label-md text-label-md py-sm rounded-lg transition-colors active:opacity-80 hover:bg-primary-container disabled:opacity-60 disabled:cursor-not-allowed';

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-base">
      <label className={labelClass} htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="font-label-md text-label-md text-error bg-error-container rounded-lg px-sm py-xs">
      {message}
    </p>
  );
}

// Переход после успешной авторизации: сотрудник (роль 2) → админка, клиент (роль 1) → назад.
function useAuthRedirect() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  return (user: AuthUser) => {
    setUser(user);
    if (user.role === ROLE_EMPLOYEE) {
      navigate('/admin', { replace: true });
    } else {
      navigate(-1);
    }
  };
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const redirect = useAuthRedirect();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await apiLogin(identifier, password);
      redirect(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-md relative z-10" onSubmit={handleSubmit}>
      <Field id="login-email" label="Почта / Логин">
        <input
          className={inputClass}
          id="login-email"
          placeholder="user@example.com"
          required
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </Field>
      <Field id="login-password" label="Пароль">
        <input
          className={inputClass}
          id="login-password"
          placeholder="••••••••"
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error && <ErrorMessage message={error} />}
      <div className="pt-sm">
        <button className={submitClass} type="submit" disabled={loading}>
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </div>
      <div className="text-center mt-md">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Нет аккаунта?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-primary font-label-md text-label-md hover:underline bg-transparent border-none cursor-pointer"
          >
            Зарегистрироваться
          </button>
        </p>
      </div>
    </form>
  );
}

const EMPTY_REGISTER = {
  login: '',
  password: '',
  fullName: '',
  birthday: '',
  phone: '',
  email: '',
  address: '',
};

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const redirect = useAuthRedirect();
  const [form, setForm] = useState(EMPTY_REGISTER);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof EMPTY_REGISTER) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await apiRegister(form);
      redirect(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-md relative z-10" onSubmit={handleSubmit}>
      <Field id="reg-login" label="Логин">
        <input className={inputClass} id="reg-login" placeholder="Придумайте логин" required type="text"
          value={form.login} onChange={update('login')} />
      </Field>
      <Field id="reg-password" label="Пароль">
        <input className={inputClass} id="reg-password" placeholder="Создайте надежный пароль" required type="password"
          value={form.password} onChange={update('password')} />
      </Field>
      <Field id="reg-name" label="ФИО">
        <input className={inputClass} id="reg-name" placeholder="Иванов Иван Иванович" required type="text"
          value={form.fullName} onChange={update('fullName')} />
      </Field>
      <Field id="reg-dob" label="Дата рождения">
        <input className={inputClass} id="reg-dob" required type="date"
          value={form.birthday} onChange={update('birthday')} />
      </Field>
      <Field id="reg-phone" label="Телефон">
        <input className={inputClass} id="reg-phone" placeholder="+7 (___) ___-__-__" required type="tel"
          value={form.phone} onChange={update('phone')} />
      </Field>
      <Field id="reg-email" label="Почта">
        <input className={inputClass} id="reg-email" placeholder="user@example.com" type="email"
          value={form.email} onChange={update('email')} />
      </Field>
      <Field id="reg-address" label="Адрес">
        <textarea className={inputClass} id="reg-address" placeholder="г. Москва, ул. Примерная, д. 1" rows={2}
          value={form.address} onChange={update('address')} />
      </Field>
      {error && <ErrorMessage message={error} />}
      <div className="pt-sm">
        <button className={submitClass} type="submit" disabled={loading}>
          {loading ? 'Создание…' : 'Создать аккаунт'}
        </button>
      </div>
      <div className="text-center mt-md">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Уже есть аккаунт?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-primary font-label-md text-label-md hover:underline bg-transparent border-none cursor-pointer"
          >
            Войти
          </button>
        </p>
      </div>
    </form>
  );
}

export default function Auth() {
  const [mode, setMode] = useState<Mode>('login');
  const navigate = useNavigate();

  const isLogin = mode === 'login';

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center py-xl px-md">
      <div className="w-full max-w-[28rem] bg-surface-container-lowest rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-outline-variant p-lg relative overflow-hidden">
        {/* Стрелка назад */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors active:opacity-80"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        {/* Декоративный фон */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-fixed-dim rounded-full blur-3xl opacity-30 pointer-events-none" />

        {/* Заголовок */}
        <div className="text-center mb-md relative z-10">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 48 }}>computer</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-sm">
            {isLogin ? 'Войти' : 'Регистрация'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-base">
            {isLogin ? 'Добро пожаловать обратно' : 'Создайте новый аккаунт'}
          </p>
        </div>

        {isLogin ? (
          <LoginForm onSwitch={() => setMode('register')} />
        ) : (
          <RegisterForm onSwitch={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}
