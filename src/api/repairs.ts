import type { Repair, RepairInput } from '../types';
import { apiRequest } from './client';

export function fetchRepairs(): Promise<Repair[]> {
  return apiRequest<Repair[]>('/api/repairs');
}

export function createRepair(input: RepairInput): Promise<Repair> {
  return apiRequest<Repair>('/api/repairs', { method: 'POST', body: JSON.stringify(input) });
}

export function updateRepair(id: string, input: RepairInput): Promise<Repair> {
  return apiRequest<Repair>(`/api/repairs/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteRepair(id: string): Promise<void> {
  return apiRequest<void>(`/api/repairs/${id}`, { method: 'DELETE' });
}
