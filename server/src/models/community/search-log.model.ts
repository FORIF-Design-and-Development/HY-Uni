import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';

// DB 테이블 이름을 상수로 관리
export const SEARCH_LOG_TABLE = 'search_log';

// MySQL이 반환한 RowDataPacket을 테이블 스키마에 맞춰 표현한 타입(= 원본 DB 레코드 형태).
export interface SearchLogRow extends RowDataPacket {
  search_id: number;
  user_id: number | null;
  query: string;
  created_at: Date;
}

// 검색어 로그를 생성하는 함수
export async function createSearchLog(
  query: string,
  userId: number | null,
): Promise<SearchLogRow> {
  const sql = `
    INSERT INTO ${SEARCH_LOG_TABLE} (user_id, query)
    VALUES (?, ?)
  `;

  const [result] = await pool.query(sql, [userId, query]);
  const insertResult = result as any;
  const insertedId = insertResult.insertId as number;

  // 생성된 레코드 조회
  const [rows] = await pool.query<SearchLogRow[]>(
    `SELECT * FROM ${SEARCH_LOG_TABLE} WHERE search_id = ?`,
    [insertedId],
  );

  return rows[0] as SearchLogRow;
}

