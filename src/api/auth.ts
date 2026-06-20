import { apiRequest } from './client';

// Роли пользователей (совпадают с users.Id_role в БД).
export const ROLE_CLIENT = 1;
export const ROLE_EMPLOYEE = 2;

export interface AuthUser {
  id: number;
  role: number;
  login: string;
  fullName: string;
  email: string | null;
}

export interface RegisterInput {
  login: string;
  password: string;
  fullName: string;
  birthday: string;
  phone: string;
  email?: string;
  address?: string;
}

export function register(input: RegisterInput): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function login(loginOrEmail: string, password: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginOrEmail, password }),
  });
}

export function logout(): Promise<void> {
  return apiRequest<void>('/api/auth/logout', { method: 'POST' });
}

export function fetchMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/auth/me');
}
