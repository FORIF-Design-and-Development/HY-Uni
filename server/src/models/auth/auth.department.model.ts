import { pool } from '../../config/db';

export interface Department {
  department_id: number;
  college_code: string;
  college_name: string;
  department_code: string;
  department_name: string;
}

//전체 목록 조회
export async function getAllDepartments(): Promise<Department[]> {
  const [rows] = await pool.query(
    'SELECT * FROM department ORDER BY college_name, department_name'
  );
  return rows as Department[];
}

//회원가입시 id 검증용
export async function findDepartmentById(id: number): Promise<Department | null> {
  const [rows] = await pool.query('SELECT * FROM department WHERE department_id = ?', [id]);
  const list = rows as Department[];
  return list[0] || null;
}