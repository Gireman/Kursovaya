import type { Order } from '../types';

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-9021',
    clientLogin: 'ivan_i',
    clientName: 'Иванов Иван Иванович',
    employeeId: 'EMP-001',
    employeeName: 'Петров П.П.',
    totalAmount: 125000,
    taxDeduction: 12500,
    receiptDate: '2024-10-24',
    issueDate: null,
    status: 'paid',
    products: [
      { id: 'CPU-INT-004', name: 'Процессор Intel Core i7-13700K', quantity: 1, amount: 42500 },
      { id: 'MB-ASUS-012', name: 'Материнская плата ASUS ROG STRIX Z790-E', quantity: 1, amount: 35000 },
      { id: 'RAM-KNG-008', name: 'Оперативная память Kingston FURY Beast 32GB (2x16GB)', quantity: 2, amount: 24000 },
    ],
    services: [
      { name: 'Сборка ПК', price: 3500 },
      { name: 'Установка и настройка ОС Windows', price: 2000 },
      { name: 'Стресс-тестирование системы', price: 1500 },
    ],
  },
  {
    id: 'ORD-9020',
    clientLogin: 'anna_s',
    clientName: 'Смирнова Анна Сергеевна',
    employeeId: 'EMP-002',
    employeeName: 'Сидоров С.С.',
    totalAmount: 45500,
    taxDeduction: 4550,
    receiptDate: '2024-10-23',
    issueDate: null,
    status: 'assembling',
    products: [
      { id: 'GPU-NV-021', name: 'Видеокарта NVIDIA RTX 4070 Ti', quantity: 1, amount: 42000 },
    ],
    services: [
      { name: 'Установка комплектующих', price: 3500 },
    ],
  },
  {
    id: 'ORD-9019',
    clientLogin: 'kuz_dim',
    clientName: 'Кузнецов Дмитрий Олегович',
    employeeId: 'EMP-001',
    employeeName: 'Петров П.П.',
    totalAmount: 8900,
    taxDeduction: 890,
    receiptDate: '2024-10-22',
    issueDate: null,
    status: 'ready',
    products: [
      { id: 'SSD-SAM-005', name: 'SSD Samsung 990 PRO 1TB', quantity: 1, amount: 8900 },
    ],
    services: [],
  },
  {
    id: 'ORD-9018',
    clientLogin: 'tech_stroy',
    clientName: 'ООО "ТехноСтрой"',
    employeeId: 'EMP-003',
    employeeName: 'Иванова М.И.',
    totalAmount: 350000,
    taxDeduction: 35000,
    receiptDate: '2024-10-20',
    issueDate: '2024-10-24',
    status: 'delivered',
    products: [
      { id: 'PC-WS-001', name: 'Рабочая станция VERTEX Pro', quantity: 2, amount: 340000 },
    ],
    services: [
      { name: 'Корпоративная настройка ПО', price: 10000 },
    ],
  },
];

export async function fetchOrders(): Promise<Order[]> {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_ORDERS), 300));
}
