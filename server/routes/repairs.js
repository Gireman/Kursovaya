import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Фронтовые «Ремонты» = таблица БД `repairs`
// (Id_client, Id_employee, RepairObject, HomeVisit, FillingDate, ReturnDate, Repaired, Cost, Tax, Status).
// HomeVisit / Repaired — tinyint(1) (булевы): храним строго 0/1, читаем как true/false.
const SELECT_REPAIR = `
  SELECT r.Id, r.Id_client, r.Id_employee, r.RepairObject, r.HomeVisit, r.FillingDate,
         r.ReturnDate, r.Repaired, r.Cost, r.Tax, r.Status,
         cu.Login AS ClientLogin, cu.Surname AS ClientSurname, cu.Name AS ClientName, cu.Patronymic AS ClientPatronymic,
         eu.Surname AS EmpSurname, eu.Name AS EmpName, eu.Patronymic AS EmpPatronymic
  FROM repairs r
  JOIN clients c ON c.Id = r.Id_client
  JOIN users cu ON cu.Id = c.Id_user
  JOIN employees e ON e.Id = r.Id_employee
  JOIN users eu ON eu.Id = e.Id_user
`;

// Status — свободный varchar; держим белый список русских подписей.
const ALLOWED_STATUSES = ['Принято', 'Диагностика', 'В работе', 'Ожидает запчасти', 'Готов к выдаче', 'Выдан'];
const DEFAULT_STATUS = 'Принято';
const ISSUED_STATUS = 'Выдан'; // при выдаче проставляем дату возврата

// «Фамилия И.О.» — фамилия + инициалы имени и отчества.
function employeeShort(surname, name, patronymic) {
  const initials = [name, patronymic].filter(Boolean).map((s) => `${s[0]}.`).join('');
  return initials ? `${surname} ${initials}` : surname;
}

function clientFullName(r) {
  return [r.ClientSurname, r.ClientName, r.ClientPatronymic].filter(Boolean).join(' ');
}

function mapRepair(r) {
  return {
    id: String(r.Id),
    clientId: String(r.Id_client),
    clientLogin: r.ClientLogin,
    clientName: clientFullName(r),
    employeeId: String(r.Id_employee),
    employeeName: employeeShort(r.EmpSurname, r.EmpName, r.EmpPatronymic),
    deviceName: r.RepairObject,
    homeVisit: Boolean(r.HomeVisit), // tinyint(1) → boolean
    repairable: Boolean(r.Repaired),
    submitDate: r.FillingDate,
    returnDate: r.ReturnDate,
    cost: Number(r.Cost),
    taxDeduction: Number(r.Tax),
    status: r.Status,
  };
}

async function fetchRepairById(id) {
  const [rows] = await pool.query(`${SELECT_REPAIR} WHERE r.Id = ?`, [id]);
  return rows.length ? mapRepair(rows[0]) : null;
}

// Проверка тела ремонта. Возвращает { error } или нормализованные поля.
function validateRepair(body) {
  const clientId = Number(body.clientId);
  const employeeId = Number(body.employeeId);
  if (!Number.isInteger(clientId) || clientId <= 0) return { error: 'Выберите клиента' };
  if (!Number.isInteger(employeeId) || employeeId <= 0) return { error: 'Выберите сотрудника' };

  const deviceName = String(body.deviceName ?? '').trim();
  if (!deviceName) return { error: 'Укажите название техники' };

  const cost = Number(body.cost);
  if (!Number.isFinite(cost) || cost < 0) return { error: 'Стоимость должна быть неотрицательным числом' };

  const status = String(body.status ?? DEFAULT_STATUS).trim();
  if (!ALLOWED_STATUSES.includes(status)) return { error: 'Недопустимый статус' };

  // Булевы поля — пишем строго 0/1 (tinyint(1) в MySQL хранит булево именно так).
  const homeVisit = body.homeVisit ? 1 : 0;
  const repaired = body.repairable ? 1 : 0;

  return { clientId, employeeId, deviceName, cost, status, homeVisit, repaired };
}

function refError(err, res) {
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    res.status(400).json({ error: 'Указан несуществующий клиент или сотрудник' });
    return true;
  }
  return false;
}

// GET /api/repairs
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(`${SELECT_REPAIR} ORDER BY r.Id DESC`);
    res.json(rows.map(mapRepair));
  } catch (err) {
    console.error('GET /repairs:', err.message);
    res.status(500).json({ error: 'Ошибка получения ремонтов' });
  }
});

// POST /api/repairs — дата подачи = сегодня; «Выдан» → дата возврата = сегодня. Tax = 0.
router.post('/', async (req, res) => {
  const v = validateRepair(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  try {
    const issued = v.status === ISSUED_STATUS;
    const tax = Math.round(v.cost * 5) / 100;
    const [result] = await pool.query(
      `INSERT INTO repairs (Id_client, Id_employee, RepairObject, HomeVisit, FillingDate, ReturnDate, Repaired, Cost, Tax, Status)
       VALUES (?, ?, ?, ?, CURDATE(), ${issued ? 'CURDATE()' : 'NULL'}, ?, ?, ?, ?)`,
      [v.clientId, v.employeeId, v.deviceName, v.homeVisit, v.repaired, v.cost, tax, v.status],
    );
    res.status(201).json(await fetchRepairById(result.insertId));
  } catch (err) {
    if (refError(err, res)) return;
    console.error('POST /repairs:', err.message);
    res.status(500).json({ error: 'Ошибка создания ремонта' });
  }
});

// PUT /api/repairs/:id — «Выдан» → дата возврата = сегодня; иначе очищаем её.
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Некорректный идентификатор' });
  const v = validateRepair(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  try {
    const [existing] = await pool.query('SELECT Id FROM repairs WHERE Id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Ремонт не найден' });

    const issued = v.status === ISSUED_STATUS;
    const tax = Math.round(v.cost * 5) / 100;
    await pool.query(
      `UPDATE repairs
       SET Id_client = ?, Id_employee = ?, RepairObject = ?, HomeVisit = ?, Repaired = ?,
           Cost = ?, Tax = ?, Status = ?, ReturnDate = ${issued ? 'CURDATE()' : 'NULL'}
       WHERE Id = ?`,
      [v.clientId, v.employeeId, v.deviceName, v.homeVisit, v.repaired, v.cost, tax, v.status, id],
    );
    res.json(await fetchRepairById(id));
  } catch (err) {
    if (refError(err, res)) return;
    console.error('PUT /repairs:', err.message);
    res.status(500).json({ error: 'Ошибка обновления ремонта' });
  }
});

// DELETE /api/repairs/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Некорректный идентификатор' });

  try {
    const [existing] = await pool.query('SELECT Id FROM repairs WHERE Id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Ремонт не найден' });

    await pool.query('DELETE FROM repairs WHERE Id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /repairs:', err.message);
    res.status(500).json({ error: 'Ошибка удаления ремонта' });
  }
});

export default router;
