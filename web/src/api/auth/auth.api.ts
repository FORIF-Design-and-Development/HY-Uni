import { api } from "../axios";
import type { Department } from "./department.api";

export type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  birth_date: string;
  student_number: string;
  phone_number: string;
  nickname: string;
  department_id: number;
};

export type User = {
  user_id: number;
  email: string;
  name: string;
  birth_date: string;
  student_number: string;
  phone_number: string;
  nickname: string;
  department_id: number;
  auth_provider: 'local' | 'hanyang';
  status: 'active' | 'inactive' | 'graduated' | 'leave';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  portal_uuid: string | null;
  portal_user_id: string | null;
};

export type AuthResponse = {
  success: boolean;
  user: User;
  department?: Department | null;
  accessToken: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', payload);
  return res.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', payload);
  return res.data;
}

export async function logout(): Promise<{ success: boolean }> {
  const res = await api.post<{ success: boolean }>('/auth/logout');
  return res.data;
}