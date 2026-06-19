import type { DealerRef, InventoryItem, ProductInput, PurchaseInput, PurchaseOrder, WarehouseRef } from '../types';
import { apiRequest } from './client';

export function fetchInventory(): Promise<InventoryItem[]> {
  return apiRequest<InventoryItem[]>('/api/products');
}

export function createProduct(input: ProductInput): Promise<InventoryItem> {
  return apiRequest<InventoryItem>('/api/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateProduct(id: string, input: ProductInput): Promise<InventoryItem> {
  return apiRequest<InventoryItem>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteProduct(id: string): Promise<void> {
  return apiRequest<void>(`/api/products/${id}`, { method: 'DELETE' });
}

export function fetchWarehouses(): Promise<WarehouseRef[]> {
  return apiRequest<WarehouseRef[]>('/api/refs/warehouses');
}

export function fetchDealers(): Promise<DealerRef[]> {
  return apiRequest<DealerRef[]>('/api/refs/dealers');
}

export function fetchPurchases(): Promise<PurchaseOrder[]> {
  return apiRequest<PurchaseOrder[]>('/api/purchases');
}

export function createPurchase(input: PurchaseInput): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>('/api/purchases', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updatePurchaseStatus(id: string, status: string): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/api/purchases/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
