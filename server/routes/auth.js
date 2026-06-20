import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { ROLE_CLIENT } from '../middleware/auth.js';

const router = Router();

const BCRYPT_ROUNDS = 10;
const PHONE_MAX = 13; // users.Phone — varchar(13)

function buildFullName(row) {
  return [row.Surname, row.Name, row.Patronymic].filter(Boolean).join(' ');
}

// "Фамилия Имя Отчество" -> { surname, name, patronymic }
function splitFullName(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    surname: parts[0] ?? '',
    name: parts[1] ?? '',
    patronymic: parts.slice(2).join(' ') || null,
  };
}

// Телефон в БД — чистая строка (ведущий «+» и цифры), не длиннее 13 символов.
function normalizePhone(raw) {
  const s = String(raw ?? '').trim();
  const plus = s.startsWith('+') ? '+' : '';
  return plus + s.replace(/\D/g, '');
}

// Публичный профиль текущего пользователя (без пароля).
function toAuthUser(row) {
  return {
    id: row.Id,
    role: row.Id_role,
    login: row.Login,
    fullName: buildFullName(row),
    email: row.Email ?? null,
  };
}

const SELECT_USER = `
  SELECT Id, Id_role, Name, Surname, Patronymic, Login, Email
  FROM users
`;

// POST /api/auth/register — самостоятельная регистрация всегда создаёт клиента (роль 1).
router.post('/register', async (req, res) => {
  const { surname, name, patronymic } = splitFullName(req.body.fullName);
  const login = String(req.body.login ?? '').trim();
  const password = String(req.body.password ?? '');
  const phone = normalizePhone(req.body.phone);
  const { email, address, birthday } = req.body;

  if (!login) return res.status(400).json({ error: 'Укажите логин' });
  if (!password) return res.status(400).json({ error: 'Укажите пароль' });
  if (!surname || !name) return res.status(400).json({ error: 'Укажите фамилию и имя' });
  if (!birthday) return res.status(400).json({ error: 'Укажите дату рождения' });
  if (!phone) return res.status(400).json({ error: 'Укажите телефон' });
  if (phone.length > PHONE_MAX) {
    return res.status(400).json({ error: `Телефон не длиннее ${PHONE_MAX} символов (только + и цифры)` });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [u] = await conn.query(
      `INSERT INTO users (Id_role, Name, Surname, Patronymic, Login, Password, Phone, Email, Birthday)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ROLE_CLIENT, name, surname, patronymic, login, hash, phone, email || null, birthday],
    );
    await conn.query('INSERT INTO clients (Id_user, Adress) VALUES (?, ?)', [u.insertId, address || null]);
    await conn.commit();

    const [rows] = await pool.query(`${SELECT_USER} WHERE Id = ?`, [u.insertId]);
    const user = toAuthUser(rows[0]);

    // Авто-вход: после регистрации сразу создаём сессию.
    req.session.userId = user.id;
    req.session.roleId = user.role;
    res.status(201).json(user);
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Логин уже занят' });
    if (err.code === 'ER_DATA_TOO_LONG') return res.status(400).json({ error: 'Значение поля слишком длинное' });
    console.error('POST /auth/register:', err.message);
    res.status(500).json({ error: 'Ошибка регистрации' });
  } finally {
    conn.release();
  }
});

// POST /api/auth/login — вход по логину ИЛИ почте + пароль.
router.post('/login', async (req, res) => {
  const identifier = String(req.body.login ?? '').trim();
  const password = String(req.body.password ?? '');
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT Id, Id_role, Name, Surname, Patronymic, Login, Email, Password
       FROM users WHERE Login = ? OR Email = ? LIMIT 1`,
      [identifier, identifier],
    );
    const row = rows[0];
    // Один и тот же ответ при неизвестном логине и неверном пароле — не подсказываем, что существует.
    const ok = row ? await bcrypt.compare(password, row.Password) : false;
    if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

    req.session.userId = row.Id;
    req.session.roleId = row.Id_role;
    res.json(toAuthUser(row));
  } catch (err) {
    console.error('POST /auth/login:', err.message);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

// POST /api/auth/logout — завершить сессию.
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

// GET /api/auth/me — текущий пользователь по сессии.
router.get('/me', async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Не авторизован' });
  try {
    const [rows] = await pool.query(`${SELECT_USER} WHERE Id = ?`, [req.session.userId]);
    if (rows.length === 0) return res.status(401).json({ error: 'Не авторизован' });
    res.json(toAuthUser(rows[0]));
  } catch (err) {
    console.error('GET /auth/me:', err.message);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

export default router;
