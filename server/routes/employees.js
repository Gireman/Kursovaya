import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { ROLE_EMPLOYEE } from '../middleware/auth.js';

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

// Оставляем только ведущий «+» и цифры, чтобы влезть в varchar(13).
function normalizePhone(raw) {
  const s = String(raw ?? '').trim();
  const plus = s.startsWith('+') ? '+' : '';
  return plus + s.replace(/\D/g, '');
}

function toEmployee(row) {
  return {
    id: String(row.id),
    fullName: buildFullName(row),
    login: row.Login,
    phone: row.Phone,
    email: row.Email,
    birthday: row.Birthday ? String(row.Birthday).slice(0, 10) : '',
    postId: String(row.Id_post),
    role: row.Post, // должность из справочника posts (свободный текст)
  };
}

// Сотрудник = employees + users (Id_role=2) + posts (должность).
const SELECT_EMPLOYEE = `
  SELECT e.Id AS id, e.Id_user AS userId, e.Id_post, p.Post,
         u.Name, u.Surname, u.Patronymic, u.Login, u.Phone, u.Email, u.Birthday
  FROM employees e
  JOIN users u ON u.Id = e.Id_user
  JOIN posts p ON p.Id = e.Id_post
`;

// Общая проверка полей сотрудника. Возвращает { error } или нормализованные значения.
function validateEmployee(body) {
  const { surname, name, patronymic } = splitFullName(body.fullName);
  const login = String(body.login ?? '').trim();
  const phone = normalizePhone(body.phone);
  const postId = Number(body.postId);

  if (!surname || !name) return { error: 'Укажите фамилию и имя' };
  if (!login) return { error: 'Укажите логин' };
  if (!phone) return { error: 'Укажите телефон' };
  if (phone.length > PHONE_MAX) return { error: `Телефон не длиннее ${PHONE_MAX} символов (только + и цифры)` };
  if (!Number.isInteger(postId) || postId <= 0) return { error: 'Выберите должность' };

  return { surname, name, patronymic, login, phone, postId };
}

// GET /api/employees
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(`${SELECT_EMPLOYEE} ORDER BY e.Id`);
    res.json(rows.map(toEmployee));
  } catch (err) {
    console.error('GET /employees:', err.message);
    res.status(500).json({ error: 'Ошибка получения сотрудников' });
  }
});

// POST /api/employees
router.post('/', async (req, res) => {
  const v = validateEmployee(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  const { email, birthday, password } = req.body;
  if (!birthday) return res.status(400).json({ error: 'Укажите дату рождения' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const hash = await bcrypt.hash(password || v.login, BCRYPT_ROUNDS);
    const [u] = await conn.query(
      `INSERT INTO users (Id_role, Name, Surname, Patronymic, Login, Password, Phone, Email, Birthday)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ROLE_EMPLOYEE, v.name, v.surname, v.patronymic, v.login, hash, v.phone, email || null, birthday],
    );
    const [e] = await conn.query(
      'INSERT INTO employees (Id_user, Id_post) VALUES (?, ?)',
      [u.insertId, v.postId],
    );
    await conn.commit();

    const [rows] = await pool.query(`${SELECT_EMPLOYEE} WHERE e.Id = ?`, [e.insertId]);
    res.status(201).json(toEmployee(rows[0]));
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Логин уже занят' });
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ error: 'Выбранная должность не существует' });
    }
    if (err.code === 'ER_DATA_TOO_LONG') return res.status(400).json({ error: 'Значение поля слишком длинное' });
    console.error('POST /employees:', err.message);
    res.status(500).json({ error: 'Ошибка создания сотрудника' });
  } finally {
    conn.release();
  }
});

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const v = validateEmployee(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  const { email, birthday, password } = req.body;

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query('SELECT Id_user FROM employees WHERE Id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Сотрудник не найден' });
    const userId = existing[0].Id_user;

    await conn.beginTransaction();
    const fields = ['Name = ?', 'Surname = ?', 'Patronymic = ?', 'Login = ?', 'Phone = ?', 'Email = ?'];
    const values = [v.name, v.surname, v.patronymic, v.login, v.phone, email || null];
    if (birthday) { fields.push('Birthday = ?'); values.push(birthday); }
    if (password) { fields.push('Password = ?'); values.push(await bcrypt.hash(password, BCRYPT_ROUNDS)); }
    values.push(userId);

    await conn.query(`UPDATE users SET ${fields.join(', ')} WHERE Id = ?`, values);
    await conn.query('UPDATE employees SET Id_post = ? WHERE Id = ?', [v.postId, id]);
    await conn.commit();

    const [rows] = await pool.query(`${SELECT_EMPLOYEE} WHERE e.Id = ?`, [id]);
    res.json(toEmployee(rows[0]));
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Логин уже занят' });
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ error: 'Выбранная должность не существует' });
    }
    if (err.code === 'ER_DATA_TOO_LONG') return res.status(400).json({ error: 'Значение поля слишком длинное' });
    console.error('PUT /employees:', err.message);
    res.status(500).json({ error: 'Ошибка обновления сотрудника' });
  } finally {
    conn.release();
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query('SELECT Id_user FROM employees WHERE Id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Сотрудник не найден' });
    const userId = existing[0].Id_user;

    await conn.beginTransaction();
    await conn.query('DELETE FROM employees WHERE Id = ?', [id]);
    await conn.query('DELETE FROM users WHERE Id = ?', [userId]);
    await conn.commit();
    res.status(204).end();
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ error: 'Сотрудник используется в закупках, заказах или ремонтах' });
    }
    console.error('DELETE /employees:', err.message);
    res.status(500).json({ error: 'Ошибка удаления сотрудника' });
  } finally {
    conn.release();
  }
});

export default router;
