import { api } from '../axios';

export type Department = {
  department_id: number;
  college_code: string;
  college_name: string;
  department_code: string;
  department_name: string;
};

export type GetDepartmentsResponse = {
  success: boolean;
  departments: Department[];
};

export async function getDepartments(): Promise<Department[]> {
  const res = await api.get<GetDepartmentsResponse>('/departments');
  return res.data.departments;
}