import type { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../../config/db';

// DB 테이블 이름을 상수로 관리
export const USER_FILTER_KEYWORD_TABLE = 'user_filter_keyword';
export const KEYWORD_TABLE = 'keyword';

// keyword 테이블의 데이터 형태
export interface KeywordRow extends RowDataPacket {
  keyword_id: number;
  name: string;
}

// user_filter_keyword 테이블의 데이터 형태
export interface UserFilterKeywordRow extends RowDataPacket {
  user_id: number;
  keyword: number;
}

// JOIN 결과 형태 (키워드 이름 포함)
export interface UserFilterKeywordWithNameRow extends RowDataPacket {
  user_id: number;
  keyword: number;
  name: string;
}

// 키워드 이름으로 keyword_id를 찾거나 기존에 없으면 새로 생성하는 함수
async function findOrCreateKeywordId(
  connection: PoolConnection,
  keywordName: string,
): Promise<number> {
  // 먼저 name으로 기존 키워드 찾기
  const [existingRows] = await connection.query<KeywordRow[]>(
    `
      SELECT keyword_id
      FROM ${KEYWORD_TABLE}
      WHERE name = ?
      LIMIT 1
    `.trim(),
    [keywordName],
  );

  if (existingRows.length > 0 && existingRows[0]) { // 배열에 요소가 있는지 확인 + 실제 요소가 존재하는지 확인
    return existingRows[0].keyword_id;
  }

  // 없으면 새로 생성
  const [result] = await connection.query<ResultSetHeader>(
    `
      INSERT INTO ${KEYWORD_TABLE} (name)
      VALUES (?)
    `.trim(),
    [keywordName],
  );

  return result.insertId;
}

// 사용자의 필터링 키워드 목록을 조회하는 함수
export async function findFilterKeywordsByUserId(
  userId: number,
): Promise<string[]> {
  const [rows] = await pool.query<UserFilterKeywordWithNameRow[]>(
    `
      SELECT ufk.user_id, ufk.keyword, k.name
      FROM ${USER_FILTER_KEYWORD_TABLE} ufk
      INNER JOIN ${KEYWORD_TABLE} k ON ufk.keyword = k.keyword_id
      WHERE ufk.user_id = ?
      ORDER BY ufk.keyword ASC
    `.trim(),
    [userId],
  );

  return rows.map((row) => row.name);
}

// 사용자의 필터링 키워드를 추가하는 함수 (기존 키워드 유지, 새 키워드만 추가)
export async function addFilterKeywords(
  userId: number,
  keywords: string[],
): Promise<void> {
  if (keywords.length === 0) {
    return; // 추가할 키워드가 없으면 아무것도 하지 않음
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // 기존 키워드 조회 (name으로)
    const [existingRows] = await connection.query<UserFilterKeywordWithNameRow[]>(
      `
        SELECT ufk.user_id, ufk.keyword, k.name
        FROM ${USER_FILTER_KEYWORD_TABLE} ufk
        INNER JOIN ${KEYWORD_TABLE} k ON ufk.keyword = k.keyword_id
        WHERE ufk.user_id = ?
      `.trim(),
      [userId],
    );

    const existingKeywords = existingRows.map((row) => row.name); // 기존 키워드 목록

    // 새로 추가할 키워드만 필터링 (기존에 없는 키워드만)
    const newKeywords = keywords.filter(
      (keyword) => !existingKeywords.includes(keyword),
    );

    // 새로 추가할 키워드가 있으면 처리
    if (newKeywords.length > 0) {
      // 각 키워드에 대해 keyword_id 찾거나 생성 후 user_filter_keyword에 추가
      for (const keywordName of newKeywords) {
        const keywordId = await findOrCreateKeywordId(connection, keywordName);

        // user_filter_keyword 테이블에 추가 (중복 방지를 위해 INSERT IGNORE 사용)
        await connection.query(
          `
            INSERT IGNORE INTO ${USER_FILTER_KEYWORD_TABLE} (user_id, keyword)
            VALUES (?, ?)
          `.trim(),
          [userId, keywordId],
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 사용자의 특정 필터링 키워드를 (선택적으로) 삭제하는 함수
// - 삭제할 키워드 이름으로 keyword_id를 찾음
// - user_filter_keyword 테이블에서 해당 keyword_id 삭제
export async function deleteFilterKeywords(
  userId: number,
  keywords: string[],
): Promise<void> {
  if (keywords.length === 0) {
    return; // 삭제할 키워드가 없으면 아무것도 하지 않음
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // 키워드 이름으로 keyword_id 찾기
    const placeholders = keywords.map(() => '?').join(', ');
    const [keywordRows] = await connection.query<KeywordRow[]>(
      `
        SELECT keyword_id
        FROM ${KEYWORD_TABLE}
        WHERE name IN (${placeholders})
      `.trim(),
      keywords,
    );

    const keywordIds = keywordRows.map((row) => row.keyword_id); // 키워드 ID 목록 (키워드 ID 값만 추출)

    if (keywordIds.length > 0) {
      // user_filter_keyword 테이블에서 해당 keyword 삭제
      const idPlaceholders = keywordIds.map(() => '?').join(', ');
      await connection.query(
        `
          DELETE FROM ${USER_FILTER_KEYWORD_TABLE}
          WHERE user_id = ? AND keyword IN (${idPlaceholders})
        `.trim(),
        [userId, ...keywordIds],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

