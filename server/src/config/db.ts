import dotenv from 'dotenv';
import type { Pool, PoolOptions } from 'mysql2/promise';
import mysql from 'mysql2/promise';

dotenv.config();

function req(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`환경변수 ${key}가 설정되지 않음(.env 확인)`);
  return v;
}

const dbConfig: PoolOptions = {
  host: req('DB_HOST'),
  port: Number(process.env.DB_PORT ?? 3306),
  user: req('DB_USER'),
  password: req('DB_PASSWORD'),
  database: req('DB_NAME'),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONN_LIMIT ?? 10),
  queueLimit: 0,
};

export const pool: Pool = mysql.createPool(dbConfig);
