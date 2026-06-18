import type { InventoryItem, PurchaseOrder } from '../types';

const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'PRD-8901', name: 'Материнская плата ASUS ROG Strix B650E-F', warehouseId: 'WH-01', warehouseName: 'Склад А', quantity: 15 },
  { id: 'PRD-8902', name: 'Видеокарта NVIDIA RTX 4070 Ti', warehouseId: 'WH-02', warehouseName: 'Склад B', quantity: 8 },
  { id: 'PRD-8903', name: 'Процессор Intel Core i9-14900K', warehouseId: 'WH-01', warehouseName: 'Склад А', quantity: 2 },
  { id: 'PRD-8904', name: 'Оперативная память Kingston FURY Beast 32GB', warehouseId: 'WH-01', warehouseName: 'Склад А', quantity: 24 },
  { id: 'PRD-8905', name: 'Блок питания Corsair RM850x', warehouseId: 'WH-02', warehouseName: 'Склад B', quantity: 10 },
];

const MOCK_PURCHASES: PurchaseOrder[] = [
  {
    id: 'PO-44021',
    dealer: 'Merlion',
    warehouseName: 'Склад А',
    employee: 'Иванов И.',
    totalAmount: 350000,
    requestDate: '2023-10-10',
    receivedDate: null,
    status: 'in_transit',
    items: [
      { productId: 'PRD-8901', productName: 'Материнская плата ASUS ROG Strix B650E-F', quantity: 5, amount: 175000 },
      { productId: 'PRD-8904', productName: 'SSD Samsung 990 PRO 2TB', quantity: 5, amount: 175000 },
    ],
  },
  {
    id: 'PO-44019',
    dealer: 'OCS Distribution',
    warehouseName: 'Склад B',
    employee: 'Петров А.',
    totalAmount: 1200500,
    requestDate: '2023-10-05',
    receivedDate: '2023-10-05',
    status: 'arrived',
    items: [],
  },
  {
    id: 'PO-44018',
    dealer: 'Marvel',
    warehouseName: 'Склад А',
    employee: 'Сидоров С.',
    totalAmount: 215000,
    requestDate: '2023-10-01',
    receivedDate: '2023-10-03',
    status: 'arrived',
    items: [],
  },
  {
    id: 'PO-44017',
    dealer: 'Netlab',
    warehouseName: 'Склад B',
    employee: 'Кузнецов Д.',
    totalAmount: 89000,
    requestDate: '2023-09-28',
    receivedDate: null,
    status: 'cancelled',
    items: [],
  },
  {
    id: 'PO-44016',
    dealer: 'ELKO',
    warehouseName: 'Склад А',
    employee: 'Васильев А.',
    totalAmount: 540000,
    requestDate: '2023-09-25',
    receivedDate: '2023-09-27',
    status: 'arrived',
    items: [],
  },
];

export async function fetchInventory(): Promise<InventoryItem[]> {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_INVENTORY), 300));
}

export async function fetchPurchases(): Promise<PurchaseOrder[]> {
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_PURCHASES), 300));
}
