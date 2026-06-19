import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Фронтовые «Закупки у дилеров» = таблица БД `orders` (Id_dealer, Id_warehouse).
const SELECT_PURCHASES = `
  SELECT o.Id, d.Dealer, w.Name AS warehouse, o.Amount,
         o.FillingDate, o.ReceiptDate, o.Status,
         u.Surname, u.Name
  FROM orders o
  JOIN dealers d ON d.Id = o.Id_dealer
  JOIN warehouses w ON w.Id = o.Id_warehouse
  JOIN employees e ON e.Id = o.Id_employee
  JOIN users u ON u.Id = e.Id_user
`;

const SELECT_ITEMS = `
  SELECT x.Id_order, x.Id_product, p.Product, x.Count, p.Cost
  FROM extra3 x
  JOIN products p ON p.Id = x.Id_product
  WHERE x.Id_order IN (?)
`;

// Status — свободный varchar, поэтому допустимые значения держим в белом списке.
const ALLOWED_STATUSES = ['Обработка', 'В пути', 'Прибыло', 'Отменено'];
const CANCELLED_STATUS = 'Отменено';
const ARRIVED_STATUS = 'Прибыло';

function employeeShort(surname, name) {
  return name ? `${surname} ${name[0]}.` : surname;
}

async function loadItems(orderIds) {
  if (orderIds.length === 0) return {};
  const [items] = await pool.query(SELECT_ITEMS, [orderIds]);
  return items.reduce((acc, it) => {
    (acc[it.Id_order] ??= []).push({
      productId: String(it.Id_product),
      productName: it.Product,
      quantity: it.Count,
      amount: Number(it.Cost) * it.Count,
    });
    return acc;
  }, {});
}

function mapPurchase(r, itemsByOrder) {
  return {
    id: String(r.Id),
    dealer: r.Dealer,
    warehouseName: r.warehouse,
    employee: employeeShort(r.Surname, r.Name),
    totalAmount: Number(r.Amount),
    requestDate: r.FillingDate,
    receivedDate: r.ReceiptDate,
    status: r.Status,
    items: itemsByOrder[r.Id] ?? [],
  };
}

// Валидирует тело новой закупки. Возвращает { error } или очищенные поля.
function validatePurchase(body) {
  const dealerId = Number(body.dealerId);
  const warehouseId = Number(body.warehouseId);

  if (!Number.isInteger(dealerId) || dealerId <= 0) return { error: 'Выберите дилера' };
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) return { error: 'Выберите склад' };
  if (!Array.isArray(body.items) || body.items.length === 0) return { error: 'Добавьте хотя бы одну позицию' };

  const items = [];
  for (const raw of body.items) {
    const productId = Number(raw.productId);
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(productId) || productId <= 0) return { error: 'Выберите товар в каждой позиции' };
    if (!Number.isInteger(quantity) || quantity <= 0) return { error: 'Количество должно быть целым числом ≥ 1' };
    items.push({ productId, quantity });
  }

  return { dealerId, warehouseId, items };
}

// GET /api/purchases
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(`${SELECT_PURCHASES} ORDER BY o.Id DESC`);
    const itemsByOrder = await loadItems(rows.map((r) => r.Id));
    res.json(rows.map((r) => mapPurchase(r, itemsByOrder)));
  } catch (err) {
    console.error('GET /purchases:', err.message);
    res.status(500).json({ error: 'Ошибка получения закупок' });
  }
});

// POST /api/purchases
router.post('/', async (req, res) => {
  const v = validatePurchase(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  let conn;
  try {
    // Закупку оформляет сотрудник; авторизации пока нет — берём первого.
    const [emp] = await pool.query('SELECT Id FROM employees ORDER BY Id LIMIT 1');
    if (emp.length === 0) return res.status(409).json({ error: 'В системе нет сотрудников для оформления закупки' });
    const employeeId = emp[0].Id;

    // Цены берём из БД и считаем сумму на сервере — не доверяем клиенту.
    const productIds = v.items.map((i) => i.productId);
    const [products] = await pool.query('SELECT Id, Cost FROM products WHERE Id IN (?)', [productIds]);
    const costById = new Map(products.map((p) => [p.Id, Number(p.Cost)]));
    for (const id of productIds) {
      if (!costById.has(id)) return res.status(400).json({ error: 'Указанный товар не существует' });
    }
    const amount = v.items.reduce((sum, i) => sum + costById.get(i.productId) * i.quantity, 0);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO orders (Id_dealer, Id_warehouse, Id_employee, Amount, Count, FillingDate, Status)
       VALUES (?, ?, ?, ?, 0, CURDATE(), 'Обработка')`,
      [v.dealerId, v.warehouseId, employeeId, amount],
    );
    const orderId = result.insertId;

    await conn.query(
      'INSERT INTO extra3 (Id_order, Id_product, Count) VALUES ?',
      [v.items.map((i) => [orderId, i.productId, i.quantity])],
    );

    await conn.commit();

    const [rows] = await pool.query(`${SELECT_PURCHASES} WHERE o.Id = ?`, [orderId]);
    const itemsByOrder = await loadItems([orderId]);
    res.status(201).json(mapPurchase(rows[0], itemsByOrder));
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ error: 'Указан несуществующий дилер или склад' });
    }
    console.error('POST /purchases:', err.message);
    res.status(500).json({ error: 'Ошибка создания закупки' });
  } finally {
    if (conn) conn.release();
  }
});

// PATCH /api/purchases/:id/status — меняем только статус закупки.
router.patch('/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Некорректный идентификатор' });

  const status = String(req.body.status ?? '').trim();
  if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ error: 'Недопустимый статус' });

  try {
    const [current] = await pool.query('SELECT Status FROM orders WHERE Id = ?', [id]);
    if (current.length === 0) return res.status(404).json({ error: 'Закупка не найдена' });
    if (current[0].Status === CANCELLED_STATUS) {
      return res.status(409).json({ error: 'Закупка отменена — статус изменить нельзя' });
    }

    // «Прибыло»/«Отменено» завершают закупку → дата получения = сегодня; иначе очищаем её.
    const endsOrder = status === ARRIVED_STATUS || status === CANCELLED_STATUS;
    await pool.query(
      `UPDATE orders SET Status = ?, ReceiptDate = ${endsOrder ? 'CURDATE()' : 'NULL'} WHERE Id = ?`,
      [status, id],
    );

    const [rows] = await pool.query(`${SELECT_PURCHASES} WHERE o.Id = ?`, [id]);
    const itemsByOrder = await loadItems([id]);
    res.json(mapPurchase(rows[0], itemsByOrder));
  } catch (err) {
    console.error('PATCH /purchases/:id/status:', err.message);
    res.status(500).json({ error: 'Ошибка изменения статуса' });
  }
});

export default router;
