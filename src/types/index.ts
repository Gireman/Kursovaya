export interface InventoryItem {
  id: string;
  name: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export interface PurchaseOrder {
  id: string;
  dealer: string;
  warehouseName: string;
  employee: string;
  totalAmount: number;
  requestDate: string;
  receivedDate: string | null;
  status: 'in_transit' | 'assembling' | 'arrived' | 'cancelled';
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
}

export type EmployeeRole = 'Директор' | 'Менеджер' | 'Техник' | 'Кладовщик';

export interface Employee {
  id: string;
  fullName: string;
  login: string;
  phone: string;
  email: string;
  role: EmployeeRole;
}

export type OrderStatus = 'paid' | 'assembling' | 'ready' | 'delivered';

export interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
  amount: number;
}

export interface OrderService {
  name: string;
  price: number;
}

export interface Order {
  id: string;
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

export type RepairStatus = 'accepted' | 'diagnostics' | 'in_progress' | 'waiting_parts' | 'ready' | 'issued';

export interface Repair {
  id: string;
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
