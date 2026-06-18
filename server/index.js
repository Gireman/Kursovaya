require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());

let dbConnected = false;

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

connection.connect((err) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err.message);
  } else {
    dbConnected = true;
    console.log('Успешное подключение к БД');
  }
});

app.get('/api/db-status', (req, res) => {
  if (dbConnected) {
    res.json({ status: 'ok' });
  } else {
    res.status(500).json({ status: 'error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
