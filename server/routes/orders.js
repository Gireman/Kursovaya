import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Фронтовые «Заказы» клиентов = таблица БД `purchases`
// (Id_client, Id_employee, Sum, Tax, FillingDate, IssueDate, Status).
// Товары заказа — в extra2 (Id_product, Id_purchase, Count); услуги — в extra1 (Id_service, Id_purchase).
const SELECT_ORDER = `
  SELECT p.Id, p.Id_client, p.Id_employee, p.Sum, p.Tax, p.FillingDate, p.IssueDate, p.Status,
         cu.Login AS ClientLogin, cu.Surname AS ClientSurname, cu.Name AS ClientName, cu.Patronymic AS ClientPatronymic,
         eu.Surname AS EmpSurname, eu.Name AS EmpName, eu.Patronymic AS EmpPatronymic
  FROM purchases p
  JOIN clients c ON c.Id = p.Id_client
  JOIN users cu ON cu.Id = c.Id_user
  JOIN employees e ON e.Id = p.Id_employee
  JOIN users eu ON eu.Id = e.Id_user
`;

const SELECT_PRODUCTS = `
  SELECT x.Id_purchase, x.Id_product, pr.Product, x.Count, pr.Cost
  FROM extra2 x
  JOIN products pr ON pr.Id = x.Id_product
  WHERE x.Id_purchase IN (?)
`;

const SELECT_SERVICES = `
  SELECT x.Id_purchase, x.Id_service, sv.Service, sv.Price
  FROM extra1 x
  JOIN services sv ON sv.Id = x.Id_service
  WHERE x.Id_purchase IN (?)
`;

// Status — свободный varchar; допустимые значения держим в белом списке. «Отмены» нет.
const ALLOWED_STATUSES = ['Оплачено', 'В сборке', 'Готов к выдаче', 'Выдан'];
const DEFAULT_STATUS = 'Оплачено';
const ISSUED_STATUS = 'Выдан'; // при выдаче проставляем дату выдачи

// «Фамилия И.О.» — фамилия + инициалы имени и отчества.
function employeeShort(surname, name, patronymic) {
  const initials = [name, patronymic].filter(Boolean).map((s) => `${s[0]}.`).join('');
  return initials ? `${surname} ${initials}` : surname;
}

function clientFullName(r) {
  return [r.ClientSurname, r.ClientName, r.ClientPatronymic].filter(Boolean).join(' ');
}

async function loadProducts(purchaseIds) {
  if (purchaseIds.length === 0) return {};
  const [rows] = await pool.query(SELECT_PRODUCTS, [purchaseIds]);
  return rows.reduce((acc, it) => {
    (acc[it.Id_purchase] ??= []).push({
      id: String(it.Id_product),
      name: it.Product,
      quantity: it.Count,
      amount: Number(it.Cost) * it.Count,
    });
    return acc;
  }, {});
}

async function loadServices(purchaseIds) {
  if (purchaseIds.length === 0) return {};
  const [rows] = await pool.query(SELECT_SERVICES, [purchaseIds]);
  return rows.reduce((acc, it) => {
    (acc[it.Id_purchase] ??= []).push({ id: String(it.Id_service), name: it.Service, price: Number(it.Price) });
    return acc;
  }, {});
}

function mapOrder(r, productsBy, servicesBy) {
  return {
    id: String(r.Id),
    clientId: String(r.Id_client),
    clientLogin: r.ClientLogin,
    clientName: clientFullName(r),
    employeeId: String(r.Id_employee),
    employeeName: employeeShort(r.EmpSurname, r.EmpName, r.EmpPatronymic),
    totalAmount: Number(r.Sum),
    taxDeduction: Number(r.Tax),
    receiptDate: r.FillingDate,
    issueDate: r.IssueDate,
    status: r.Status,
    products: productsBy[r.Id] ?? [],
    services: servicesBy[r.Id] ?? [],
  };
}

async function fetchOrderById(id) {
  const [rows] = await pool.query(`${SELECT_ORDER} WHERE p.Id = ?`, [id]);
  if (rows.length === 0) return null;
  const productsBy = await loadProducts([id]);
  const servicesBy = await loadServices([id]);
  return mapOrder(rows[0], productsBy, servicesBy);
}

// Разбор товаров/услуг заказа. Возвращает { error } или { products, services }.
function parseItems(body) {
  const products = [];
  for (const raw of body.products ?? []) {
    const productId = Number(raw.productId);
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(productId) || productId <= 0) return { error: 'Выберите товар в каждой позиции' };
    if (!Number.isInteger(quantity) || quantity <= 0) return { error: 'Количество должно быть целым числом ≥ 1' };
    products.push({ productId, quantity });
  }

  const services = [];
  for (const raw of body.services ?? []) {
    const serviceId = Number(raw.serviceId);
    if (!Number.isInteger(serviceId) || serviceId <= 0) return { error: 'Некорректная услуга' };
    services.push({ serviceId });
  }

  if (products.length === 0 && services.length === 0) {
    return { error: 'Добавьте хотя бы один товар или услугу' };
  }

  return { products, services };
}

// Проверка тела заказа (админ-форма). Возвращает { error } или очищенные поля.
function validateOrder(body) {
  const clientId = Number(body.clientId);
  const employeeId = Number(body.employeeId);
  if (!Number.isInteger(clientId) || clientId <= 0) return { error: 'Выберите клиента' };
  if (!Number.isInteger(employeeId) || employeeId <= 0) return { error: 'Выберите сотрудника' };

  const items = parseItems(body);
  if (items.error) return items;

  return { clientId, employeeId, products: items.products, services: items.services };
}

// Сумму считаем на сервере из products.Cost и services.Price — не доверяем клиенту.
async function computeSum(conn, products, services) {
  let sum = 0;
  if (products.length > 0) {
    const ids = products.map((p) => p.productId);
    const [rows] = await conn.query('SELECT Id, Cost FROM products WHERE Id IN (?)', [ids]);
    const costById = new Map(rows.map((p) => [p.Id, Number(p.Cost)]));
    for (const id of ids) {
      if (!costById.has(id)) return { error: 'Указанный товар не существует' };
    }
    sum += products.reduce((s, p) => s + costById.get(p.productId) * p.quantity, 0);
  }
  if (services.length > 0) {
    const ids = services.map((s) => s.serviceId);
    const [rows] = await conn.query('SELECT Id, Price FROM services WHERE Id IN (?)', [ids]);
    const priceById = new Map(rows.map((s) => [s.Id, Number(s.Price)]));
    for (const id of ids) {
      if (!priceById.has(id)) return { error: 'Указанная услуга не существует' };
    }
    sum += services.reduce((s, sv) => s + priceById.get(sv.serviceId), 0);
  }
  return sum;
}

async function insertItems(conn, purchaseId, products, services) {
  if (products.length > 0) {
    await conn.query(
      'INSERT INTO extra2 (Id_product, Id_purchase, Count) VALUES ?',
      [products.map((p) => [p.productId, purchaseId, p.quantity])],
    );
  }
  if (services.length > 0) {
    await conn.query(
      'INSERT INTO extra1 (Id_service, Id_purchase) VALUES ?',
      [services.map((s) => [s.serviceId, purchaseId])],
    );
  }
}

function refError(err, res) {
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    res.status(400).json({ error: 'Указан несуществующий клиент, сотрудник, товар или услуга' });
    return true;
  }
  return false;
}

// GET /api/orders
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(`${SELECT_ORDER} ORDER BY p.Id DESC`);
    const ids = rows.map((r) => r.Id);
    const productsBy = await loadProducts(ids);
    const servicesBy = await loadServices(ids);
    res.json(rows.map((r) => mapOrder(r, productsBy, servicesBy)));
  } catch (err) {
    console.error('GET /orders:', err.message);
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  const v = validateOrder(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  let conn;
  try {
    conn = await pool.getConnection();
    const sum = await computeSum(conn, v.products, v.services);
    if (sum && sum.error) { conn.release(); return res.status(400).json({ error: sum.error }); }

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO purchases (Id_client, Id_employee, Sum, Tax, FillingDate, Status)
       VALUES (?, ?, ?, 0, CURDATE(), ?)`,
      [v.clientId, v.employeeId, sum, DEFAULT_STATUS],
    );
    const purchaseId = result.insertId;
    await insertItems(conn, purchaseId, v.products, v.services);
    await conn.commit();

    res.status(201).json(await fetchOrderById(purchaseId));
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    if (refError(err, res)) return;
    console.error('POST /orders:', err.message);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  } finally {
    if (conn) conn.release();
  }
});

// POST /api/orders/checkout — самооформление клиентом своей корзины.
// Клиент берётся из сессии, сотрудник-обработчик — по умолчанию, статус — «Оплачено».
router.post('/checkout', requireAuth, async (req, res) => {
  const items = parseItems(req.body);
  if (items.error) return res.status(400).json({ error: items.error });

  let conn;
  try {
    conn = await pool.getConnection();

    // Клиент = профиль текущего пользователя.
    const [clientRows] = await conn.query('SELECT Id FROM clients WHERE Id_user = ?', [req.session.userId]);
    if (clientRows.length === 0) {
      conn.release();
      return res.status(403).json({ error: 'Оформление доступно только клиентам' });
    }
    const clientId = clientRows[0].Id;

    // Продавца-сессии нет → назначаем первого сотрудника как обработчика.
    const [empRows] = await conn.query('SELECT Id FROM employees ORDER BY Id LIMIT 1');
    if (empRows.length === 0) {
      conn.release();
      return res.status(500).json({ error: 'Нет сотрудника для оформления заказа' });
    }
    const employeeId = empRows[0].Id;

    const sum = await computeSum(conn, items.products, items.services);
    if (sum && sum.error) { conn.release(); return res.status(400).json({ error: sum.error }); }

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO purchases (Id_client, Id_employee, Sum, Tax, FillingDate, Status)
       VALUES (?, ?, ?, 0, CURDATE(), ?)`,
      [clientId, employeeId, sum, DEFAULT_STATUS],
    );
    const purchaseId = result.insertId;
    await insertItems(conn, purchaseId, items.products, items.services);
    await conn.commit();

    res.status(201).json(await fetchOrderById(purchaseId));
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    if (refError(err, res)) return;
    console.error('POST /orders/checkout:', err.message);
    res.status(500).json({ error: 'Ошибка оформления заказа' });
  } finally {
    if (conn) conn.release();
  }
});

// PUT /api/orders/:id — клиент, сотрудник, состав. Статус/дата выдачи меняются через PATCH.
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Некорректный идентификатор' });
  const v = validateOrder(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  let conn;
  try {
    conn = await pool.getConnection();
    const [existing] = await conn.query('SELECT Id FROM purchases WHERE Id = ?', [id]);
    if (existing.length === 0) { conn.release(); return res.status(404).json({ error: 'Заказ не найден' }); }

    const sum = await computeSum(conn, v.products, v.services);
    if (sum && sum.error) { conn.release(); return res.status(400).json({ error: sum.error }); }

    await conn.beginTransaction();
    await conn.query('UPDATE purchases SET Id_client = ?, Id_employee = ?, Sum = ? WHERE Id = ?', [v.clientId, v.employeeId, sum, id]);
    await conn.query('DELETE FROM extra2 WHERE Id_purchase = ?', [id]);
    await conn.query('DELETE FROM extra1 WHERE Id_purchase = ?', [id]);
    await insertItems(conn, id, v.products, v.services);
    await conn.commit();

    res.json(await fetchOrderById(id));
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    if (refError(err, res)) return;
    console.error('PUT /orders:', err.message);
    res.status(500).json({ error: 'Ошибка обновления заказа' });
  } finally {
    if (conn) conn.release();
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Некорректный идентификатор' });

  const status = String(req.body.status ?? '').trim();
  if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ error: 'Недопустимый статус' });

  try {
    const [current] = await pool.query('SELECT Id FROM purchases WHERE Id = ?', [id]);
    if (current.length === 0) return res.status(404).json({ error: 'Заказ не найден' });

    // «Выдан» → дата выдачи = сегодня; иначе очищаем её.
    const issued = status === ISSUED_STATUS;
    await pool.query(
      `UPDATE purchases SET Status = ?, IssueDate = ${issued ? 'CURDATE()' : 'NULL'} WHERE Id = ?`,
      [status, id],
    );

    res.json(await fetchOrderById(id));
  } catch (err) {
    console.error('PATCH /orders/:id/status:', err.message);
    res.status(500).json({ error: 'Ошибка изменения статуса' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Некорректный идентификатор' });

  let conn;
  try {
    conn = await pool.getConnection();
    const [existing] = await conn.query('SELECT Id FROM purchases WHERE Id = ?', [id]);
    if (existing.length === 0) { conn.release(); return res.status(404).json({ error: 'Заказ не найден' }); }

    await conn.beginTransaction();
    await conn.query('DELETE FROM extra2 WHERE Id_purchase = ?', [id]);
    await conn.query('DELETE FROM extra1 WHERE Id_purchase = ?', [id]);
    await conn.query('DELETE FROM purchases WHERE Id = ?', [id]);
    await conn.commit();
    res.status(204).end();
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error('DELETE /orders:', err.message);
    res.status(500).json({ error: 'Ошибка удаления заказа' });
  } finally {
    if (conn) conn.release();
  }
});

export default router;
