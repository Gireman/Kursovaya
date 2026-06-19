import type { Client, ClientInput, Employee, EmployeeInput, PostRef } from '../types';
import { apiRequest } from './client';

export function fetchClients(): Promise<Client[]> {
  return apiRequest<Client[]>('/api/clients');
}

export function createClient(input: ClientInput): Promise<Client> {
  return apiRequest<Client>('/api/clients', { method: 'POST', body: JSON.stringify(input) });
}

export function updateClient(id: number, input: ClientInput): Promise<Client> {
  return apiRequest<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteClient(id: number): Promise<void> {
  return apiRequest<void>(`/api/clients/${id}`, { method: 'DELETE' });
}

export function fetchEmployees(): Promise<Employee[]> {
  return apiRequest<Employee[]>('/api/employees');
}

export function createEmployee(input: EmployeeInput): Promise<Employee> {
  return apiRequest<Employee>('/api/employees', { method: 'POST', body: JSON.stringify(input) });
}

export function updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
  return apiRequest<Employee>(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteEmployee(id: string): Promise<void> {
  return apiRequest<void>(`/api/employees/${id}`, { method: 'DELETE' });
}

export function fetchPosts(): Promise<PostRef[]> {
  return apiRequest<PostRef[]>('/api/refs/posts');
}
