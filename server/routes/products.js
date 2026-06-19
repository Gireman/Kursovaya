import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

const SELECT_PRODUCTS = `
  SELECT p.Id, p.Product, p.Count, p.Cost, p.Id_warehouse, w.Name AS warehouse
  FROM products p
  JOIN warehouses w ON w.Id = p.Id_warehouse
`;

function mapProduct(r) {
  return {
    id: String(r.Id),
    name: r.Product,
    warehouseId: String(r.Id_warehouse),
    warehouseName: r.warehouse,
    cost: Number(r.Cost),
    quantity: r.Count,
  };
}

// Возвращает { error } при ошибке валидации, иначе очищенные поля.
function validateProduct(body) {
  const name = String(body.name ?? '').trim();
  const warehouseId = Number(body.warehouseId);
  const quantity = Number(body.quantity);
  const cost = Number(body.cost);

  if (!name) return { error: 'Укажите название товара' };
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) return { error: 'Выберите склад' };
  if (!Number.isInteger(quantity) || quantity < 0) return { error: 'Количество должно быть целым числом ≥ 0' };
  if (!Number.isFinite(cost) || cost < 0) return { error: 'Цена должна быть числом ≥ 0' };

  return { name, warehouseId, quantity, cost };
}

// GET /api/products
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(`${SELECT_PRODUCTS} ORDER BY p.Id DESC`);
    res.json(rows.map(mapProduct));
  } catch (err) {
    console.error('GET /products:', err.message);
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  const v = validateProduct(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  try {
    const [result] = await pool.query(
      'INSERT INTO products (Id_warehouse, Product, Count, Cost) VALUES (?, ?, ?, ?)',
      [v.warehouseId, v.name, v.quantity, v.cost],
    );
    const [rows] = await pool.query(`${SELECT_PRODUCTS} WHERE p.Id = ?`, [result.insertId]);
    res.status(201).json(mapProduct(rows[0]));
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ error: 'Указанный склад не существует' });
    }
    console.error('POST /products:', err.message);
    res.status(500).json({ error: 'Ошибка создания товара' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Некорректный идентификатор' });

  const v = validateProduct(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  try {
    const [result] = await pool.query(
      'UPDATE products SET Id_warehouse = ?, Product = ?, Count = ?, Cost = ? WHERE Id = ?',
      [v.warehouseId, v.name, v.quantity, v.cost, id],
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Товар не найден' });

    const [rows] = await pool.query(`${SELECT_PRODUCTS} WHERE p.Id = ?`, [id]);
    res.json(mapProduct(rows[0]));
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ error: 'Указанный склад не существует' });
    }
    console.error('PUT /products:', err.message);
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Некорректный идентификатор' });

  try {
    const [result] = await pool.query('DELETE FROM products WHERE Id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Товар не найден' });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ error: 'Нельзя удалить: товар используется в закупках или заказах' });
    }
    console.error('DELETE /products:', err.message);
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
});

export default router;
