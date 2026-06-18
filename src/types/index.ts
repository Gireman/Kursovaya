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
