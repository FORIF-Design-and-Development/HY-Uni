import { pool } from '../../config/db';

export type UserStatus = 'active' | 'inactive' | 'graduated' | 'leave';
export type AuthProvider = 'local' | 'hanyang';

export interface User {
  user_id: number;
  email: string;
  password: string | null;
  name: string;
  birth_date: string;
  student_number: string;
  phone_number: string;
  nickname: string;
  department_id: number;
  portal_uuid: string | null;
  portal_user_id: string | null;
  auth_provider: AuthProvider;
  status: UserStatus;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

//회원가입용 입력 타입
export interface CreateUserInput {
  email: string;
  password: string | null;
  name: string;
  birth_date: string;
  student_number: string;
  phone_number: string;
  nickname: string;
  department_id: number;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
  const list = rows as User[];
  return list[0] || null;
}

export async function findUserByStudentNumber(student_number: string): Promise<User | null> {
  const [rows] = await pool.query('SELECT * FROM user WHERE student_number = ?', [student_number]);
  const list = rows as User[];
  return list[0] || null;
}

export async function findUserByNickname(nickname: string): Promise<User | null> {
  const [rows] = await pool.query('SELECT * FROM user WHERE nickname = ?', [nickname]);
  const list = rows as User[];
  return list[0] || null;
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const {
    email,
    password,
    name,
    birth_date,
    student_number,
    phone_number,
    nickname,
    department_id,
  } = data;

  const [result] = await pool.query(
    `INSERT INTO user
      (email, password, name, birth_date, student_number, phone_number, nickname, department_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      email,
      password,
      name,
      birth_date,
      student_number,
      phone_number,
      nickname,
      department_id,
    ]
  );

  const insertResult = result as any;
  const insertedId = insertResult.insertId as number;

  const [rows] = await pool.query('SELECT * FROM user WHERE user_id = ?', [insertedId]);
  const list = rows as User[];
  return list[0] as User;
}