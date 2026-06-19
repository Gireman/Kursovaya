import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { ROLE_CLIENT } from '../middleware/auth.js';

const router = Router();

const BCRYPT_ROUNDS = 10;

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

// Колонка Phone — varchar(13). Оставляем только ведущий «+» и цифры,
// чтобы можно было вводить телефон с форматированием, а в БД клалась чистая строка.
const PHONE_MAX = 13;
function normalizePhone(raw) {
  const s = String(raw ?? '').trim();
  const plus = s.startsWith('+') ? '+' : '';
  return plus + s.replace(/\D/g, '');
}

// Общая проверка полей клиента. Возвращает { error } или нормализованные значения.
function validateClient(body) {
  const { surname, name, patronymic } = splitFullName(body.fullName);
  const login = String(body.login ?? '').trim();
  const phone = normalizePhone(body.phone);

  if (!surname || !name) return { error: 'Укажите фамилию и имя' };
  if (!login) return { error: 'Укажите логин' };
  if (!phone) return { error: 'Укажите телефон' };
  if (phone.length > PHONE_MAX) return { error: `Телефон не длиннее ${PHONE_MAX} символов (только + и цифры)` };

  return { surname, name, patronymic, login, phone };
}

function toClient(row) {
  return {
    id: row.id,
    fullName: buildFullName(row),
    login: row.Login,
    phone: row.Phone,
    email: row.Email,
    address: row.Adress,
    birthday: row.Birthday ? String(row.Birthday).slice(0, 10) : '',
  };
}

const SELECT_CLIENT = `
  SELECT c.Id AS id, c.Id_user AS userId, c.Adress,
         u.Name, u.Surname, u.Patronymic, u.Login, u.Phone, u.Email, u.Birthday
  FROM clients c
  JOIN users u ON u.Id = c.Id_user
`;

// GET /api/clients
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(`${SELECT_CLIENT} ORDER BY c.Id`);
    res.json(rows.map(toClient));
  } catch (err) {
    console.error('GET /clients:', err.message);
    res.status(500).json({ error: 'Ошибка получения клиентов' });
  }
});

// POST /api/clients
router.post('/', async (req, res) => {
  const v = validateClient(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  const { email, address, birthday, password } = req.body;
  if (!birthday) return res.status(400).json({ error: 'Укажите дату рождения' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const hash = await bcrypt.hash(password || v.login, BCRYPT_ROUNDS);
    const [u] = await conn.query(
      `INSERT INTO users (Id_role, Name, Surname, Patronymic, Login, Password, Phone, Email, Birthday)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ROLE_CLIENT, v.name, v.surname, v.patronymic, v.login, hash, v.phone, email || null, birthday],
    );
    const [c] = await conn.query(
      'INSERT INTO clients (Id_user, Adress) VALUES (?, ?)',
      [u.insertId, address || null],
    );
    await conn.commit();

    const [rows] = await pool.query(`${SELECT_CLIENT} WHERE c.Id = ?`, [c.insertId]);
    res.status(201).json(toClient(rows[0]));
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Логин уже занят' });
    if (err.code === 'ER_DATA_TOO_LONG') return res.status(400).json({ error: 'Значение поля слишком длинное' });
    console.error('POST /clients:', err.message);
    res.status(500).json({ error: 'Ошибка создания клиента' });
  } finally {
    conn.release();
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const v = validateClient(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  const { email, address, birthday, password } = req.body;

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query('SELECT Id_user FROM clients WHERE Id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Клиент не найден' });
    const userId = existing[0].Id_user;

    await conn.beginTransaction();
    const fields = ['Name = ?', 'Surname = ?', 'Patronymic = ?', 'Login = ?', 'Phone = ?', 'Email = ?'];
    const values = [v.name, v.surname, v.patronymic, v.login, v.phone, email || null];
    if (birthday) { fields.push('Birthday = ?'); values.push(birthday); }
    if (password) { fields.push('Password = ?'); values.push(await bcrypt.hash(password, BCRYPT_ROUNDS)); }
    values.push(userId);

    await conn.query(`UPDATE users SET ${fields.join(', ')} WHERE Id = ?`, values);
    await conn.query('UPDATE clients SET Adress = ? WHERE Id = ?', [address || null, id]);
    await conn.commit();

    const [rows] = await pool.query(`${SELECT_CLIENT} WHERE c.Id = ?`, [id]);
    res.json(toClient(rows[0]));
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Логин уже занят' });
    if (err.code === 'ER_DATA_TOO_LONG') return res.status(400).json({ error: 'Значение поля слишком длинное' });
    console.error('PUT /clients:', err.message);
    res.status(500).json({ error: 'Ошибка обновления клиента' });
  } finally {
    conn.release();
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query('SELECT Id_user FROM clients WHERE Id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Клиент не найден' });
    const userId = existing[0].Id_user;

    await conn.beginTransaction();
    await conn.query('DELETE FROM clients WHERE Id = ?', [id]);
    await conn.query('DELETE FROM users WHERE Id = ?', [userId]);
    await conn.commit();
    res.status(204).end();
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'Клиент используется в заказах или ремонтах' });
    }
    console.error('DELETE /clients:', err.message);
    res.status(500).json({ error: 'Ошибка удаления клиента' });
  } finally {
    conn.release();
  }
});

export default router;
