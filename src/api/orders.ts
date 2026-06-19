import type { Order, OrderInput, ServiceRef } from '../types';
import { apiRequest } from './client';

export function fetchOrders(): Promise<Order[]> {
  return apiRequest<Order[]>('/api/orders');
}

export function createOrder(input: OrderInput): Promise<Order> {
  return apiRequest<Order>('/api/orders', { method: 'POST', body: JSON.stringify(input) });
}

export function updateOrder(id: string, input: OrderInput): Promise<Order> {
  return apiRequest<Order>(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteOrder(id: string): Promise<void> {
  return apiRequest<void>(`/api/orders/${id}`, { method: 'DELETE' });
}

export function updateOrderStatus(id: string, status: string): Promise<Order> {
  return apiRequest<Order>(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function fetchServices(): Promise<ServiceRef[]> {
  return apiRequest<ServiceRef[]>('/api/refs/services');
}
