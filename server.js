import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err.message);
    return;
  }
  console.log('БД подключена');
  connection.release();
});

app.get('/api/status', (req, res) => {
  pool.query('SELECT 1', (err) => {
    if (err) {
      console.error('Ошибка запроса к БД:', err.message);
      return res.json({ connected: false });
    }
    res.json({ connected: true });
  });
});

app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));
