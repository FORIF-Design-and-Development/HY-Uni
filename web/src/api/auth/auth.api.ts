import { api } from "../axios";

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

export type RegisterResponse = {
  success: boolean;
  user: User;
};

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const res = await api.post<RegisterResponse>('/auth/register', payload);
  return res.data;
}