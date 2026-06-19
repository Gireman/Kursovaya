export interface InventoryItem {
  id: string;
  name: string;
  warehouseId: string;
  warehouseName: string;
  cost: number;
  quantity: number;
}

export interface ProductInput {
  name: string;
  warehouseId: string;
  cost: number;
  quantity: number;
}

export interface WarehouseRef {
  id: string;
  name: string;
}

export interface DealerRef {
  id: string;
  name: string;
}

export interface PurchaseInput {
  dealerId: string;
  warehouseId: string;
  items: { productId: string; quantity: number }[];
}

export interface PurchaseOrder {
  id: string;
  dealer: string;
  warehouseName: string;
  employee: string;
  totalAmount: number;
  requestDate: string;
  receivedDate: string | null;
  status: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
}

export interface Client {
  id: number;
  fullName: string;
  login: string;
  phone: string;
  email: string;
  address: string;
  birthday: string;
}

export interface ClientInput {
  fullName: string;
  login: string;
  phone: string;
  email: string;
  address: string;
  birthday: string;
  password?: string;
}

// Должность сотрудника берётся из справочника posts (свободный текст в БД).
export type EmployeeRole = string;

export interface Employee {
  id: string;
  fullName: string;
  login: string;
  phone: string;
  email: string;
  birthday: string;
  postId: string;
  role: EmployeeRole; // имя должности для отображения
}

export interface EmployeeInput {
  fullName: string;
  login: string;
  phone: string;
  email: string;
  birthday: string;
  postId: string;
  password?: string;
}

// Справочник должностей (таблица posts).
export interface PostRef {
  id: string;
  name: string;
}

// Статус заказа — свободный varchar в БД (purchases.Status), хранится как русская подпись.
export type OrderStatus = string;

export interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
  amount: number;
}

export interface OrderService {
  id?: string;
  name: string;
  price: number; // в БД у услуг цены нет → 0
}

export interface Order {
  id: string;
  clientId: string;
  clientLogin: string;
  clientName: string;
  employeeId: string;
  employeeName: string;
  totalAmount: number;
  taxDeduction: number;
  receiptDate: string;
  issueDate: string | null;
  status: OrderStatus;
  products: OrderProduct[];
  services: OrderService[];
}

export interface OrderInput {
  clientId: string;
  employeeId: string;
  products: { productId: string; quantity: number }[];
  services: { serviceId: string }[];
}

// Справочник услуг (таблица services).
export interface ServiceRef {
  id: string;
  name: string;
  price: number;
}

// Статус ремонта — свободный varchar в БД (repairs.Status), хранится как русская подпись.
export type RepairStatus = string;

export interface Repair {
  id: string;
  clientId: string;
  clientLogin: string;
  clientName: string;
  employeeId: string;
  employeeName: string;
  deviceName: string;
  repairable: boolean;
  homeVisit: boolean;
  submitDate: string;
  returnDate: string | null;
  cost: number;
  taxDeduction: number;
  status: RepairStatus;
}

export interface RepairInput {
  clientId: string;
  employeeId: string;
  deviceName: string;
  cost: number;
  homeVisit: boolean;
  repairable: boolean;
  status: string;
}
