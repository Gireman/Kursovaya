import { Router } from 'express';
import { pool } from '../db.js';
import auth from './auth.js';
import clients from './clients.js';
import employees from './employees.js';
import purchases from './purchases.js';
import orders from './orders.js';
import repairs from './repairs.js';
import products from './products.js';
import refs from './refs.js';

const router = Router();

router.get('/status', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ connected: true });
  } catch {
    res.json({ connected: false });
  }
});

router.use('/auth', auth);
router.use('/clients', clients);
router.use('/employees', employees);
router.use('/purchases', purchases);
router.use('/orders', orders);
router.use('/repairs', repairs);
router.use('/products', products);
router.use('/refs', refs);

export default router;
