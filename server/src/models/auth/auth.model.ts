import { pool } from '../../config/db';
import mysql from 'mysql2/promise';

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

export async function findUserById(userId: number): Promise<User | null> {
  const [rows] = await pool.query('SELECT * FROM user WHERE user_id = ?', [userId]);
  const list = rows as User[];
  return list[0] || null;
}

//마지막 로그인 시간 업데이트(로그인 성공시 호출용)
export async function updateLastLoginAt(userId: number): Promise<void> {
  await pool.query('UPDATE user SET last_login_at = NOW() WHERE user_id = ?', [userId]);
}

export async function findUserByNameAndBirth(name: string, birth_date: string): Promise<User | null> {
  const [rows] = await pool.query(
    `SELECT * FROM user WHERE name = ? AND birth_date = ? LIMIT 1`,
    [name, birth_date]
  );

  const list = rows as User[];
  return list[0] || null;
}

export async function findUserForPasswordReset(name: string, birth_date: string, email: string): Promise<User | null> {
  const [rows] = await pool.query(
    `SELECT * FROM user
     WHERE name = ? AND birth_date = ? AND email = ?
     LIMIT 1`,
    [name, birth_date, email]
  );

  const list = rows as User[];
  return list[0] || null;
}

/*
export async function updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
  await pool.query(
    'UPDATE user SET password = ? WHERE user_id = ?',
    [hashedPassword, userId]
  );
}
*/

export async function updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
  try {
    //1차 시도: pool 사용
    await pool.query(
      'UPDATE user SET password = ? WHERE user_id = ?',
      [hashedPassword, userId]
    );
  } catch (err: any) {
    if (err.code !== 'ECONNRESET') {
      throw err; //다른 에러면 그대로 위로 던짐
    }

    //2차 시도: 새 커넥션으로 우회
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST as string,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER as string,
      password: process.env.DB_PASSWORD as string,
      database: process.env.DB_NAME as string,
      multipleStatements: false,
    });

    try {
      await conn.execute(
        'UPDATE user SET password = ? WHERE user_id = ?',
        [hashedPassword, userId]
      );
    } finally {
      await conn.end();
    }
  }
}