import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkConnection } from './db.js';
import apiRoutes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use('/api', apiRoutes);

app.use(express.static(path.join(rootDir, 'dist')));
app.use((_req, res) => {
  res.sendFile(path.join(rootDir, 'dist', 'index.html'));
});

checkConnection()
  .then(() => console.log('БД подключена'))
  .catch((err) => console.error('Ошибка подключения к БД:', err.message));

const PORT = process.env.API_PORT || process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));
