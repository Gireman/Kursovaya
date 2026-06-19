import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/refs/warehouses
router.get('/warehouses', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT Id, Name FROM warehouses ORDER BY Id');
    res.json(rows.map((r) => ({ id: String(r.Id), name: r.Name })));
  } catch (err) {
    console.error('GET /refs/warehouses:', err.message);
    res.status(500).json({ error: 'Ошибка получения складов' });
  }
});

// GET /api/refs/dealers
router.get('/dealers', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT Id, Dealer FROM dealers ORDER BY Id');
    res.json(rows.map((r) => ({ id: String(r.Id), name: r.Dealer })));
  } catch (err) {
    console.error('GET /refs/dealers:', err.message);
    res.status(500).json({ error: 'Ошибка получения дилеров' });
  }
});

// GET /api/refs/services — справочник услуг (Id, Service, Price)
router.get('/services', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT Id, Service, Price FROM services ORDER BY Id');
    res.json(rows.map((r) => ({ id: String(r.Id), name: r.Service, price: Number(r.Price) })));
  } catch (err) {
    console.error('GET /refs/services:', err.message);
    res.status(500).json({ error: 'Ошибка получения услуг' });
  }
});

// GET /api/refs/posts — справочник должностей сотрудников
router.get('/posts', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT Id, Post FROM posts ORDER BY Id');
    res.json(rows.map((r) => ({ id: String(r.Id), name: r.Post })));
  } catch (err) {
    console.error('GET /refs/posts:', err.message);
    res.status(500).json({ error: 'Ошибка получения должностей' });
  }
});

export default router;
