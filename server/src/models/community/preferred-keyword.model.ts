import type { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../../config/db';

// DB 테이블 이름을 상수로 관리
export const USER_KEYWORD_TABLE = 'user_keyword';
export const KEYWORD_TABLE = 'keyword';

// keyword 테이블의 데이터 형태
export interface KeywordRow extends RowDataPacket {
  keyword_id: number;
  name: string;
}

// user_keyword 테이블의 데이터 형태
export interface UserKeywordRow extends RowDataPacket {
  user_id: number;
  keyword_id: number;
}

// JOIN 결과 형태 (키워드 이름 포함)
export interface UserKeywordWithNameRow extends RowDataPacket {
  user_id: number;
  keyword_id: number;
  name: string;
}

// 애플리케이션 내부에서 사용할 도메인 모델
export interface PreferredKeyword {
  userId: number;
  keyword: string;
  createdAt: Date;
}

// ID와 이름을 함께 반환하는 인터페이스
export interface PreferredKeywordWithId {
  id: number;
  name: string;
}

// 키워드 이름으로 keyword_id를 찾거나 생성하는 함수
async function findOrCreateKeywordId(
  connection: PoolConnection,
  keywordName: string,
): Promise<number> {
  // 먼저 기존 키워드 찾기
  const [existingRows] = await connection.query<KeywordRow[]>(
    `
      SELECT keyword_id
      FROM ${KEYWORD_TABLE}
      WHERE name = ?
      LIMIT 1
    `.trim(),
    [keywordName],
  );

  if (existingRows.length > 0 && existingRows[0]) { // 기존 키워드가 있으면 keyword_id 반환
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

// 사용자의 선호 키워드 목록을 조회하는 함수 (ID 포함)
export async function findPreferredKeywordsByUserId(
  userId: number,
): Promise<PreferredKeywordWithId[]> {
  const [rows] = await pool.query<UserKeywordWithNameRow[]>(
    `
      SELECT uk.user_id, uk.keyword_id, k.name
      FROM ${USER_KEYWORD_TABLE} uk
      INNER JOIN ${KEYWORD_TABLE} k ON uk.keyword_id = k.keyword_id
      WHERE uk.user_id = ?
      ORDER BY uk.keyword_id ASC
    `.trim(),
    [userId],
  );

  return rows.map((row) => ({
    id: row.keyword_id,
    name: row.name,
  }));
}

// 사용자의 선호 키워드를 추가하는 함수 (기존 키워드 유지, 새 키워드만 추가)
export async function addPreferredKeywords(
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
    const [existingRows] = await connection.query<UserKeywordWithNameRow[]>(
      `
        SELECT uk.user_id, uk.keyword_id, k.name
        FROM ${USER_KEYWORD_TABLE} uk
        INNER JOIN ${KEYWORD_TABLE} k ON uk.keyword_id = k.keyword_id
        WHERE uk.user_id = ?
      `.trim(),
      [userId],
    );

    const existingKeywords = existingRows.map((row) => row.name);
    
    // 새로 추가할 키워드만 필터링 (기존에 없는 키워드만)
    const newKeywords = keywords.filter(
      (keyword) => !existingKeywords.includes(keyword),
    );

    // 새로 추가할 키워드가 있으면 처리
    if (newKeywords.length > 0) {
      // 각 키워드에 대해 keyword_id 찾거나 생성 후 user_keyword에 추가
      for (const keywordName of newKeywords) {
        const keywordId = await findOrCreateKeywordId(connection, keywordName);
        
        // user_keyword 테이블에 추가 (중복 방지를 위해 INSERT IGNORE 사용)
        await connection.query(
          `
            INSERT IGNORE INTO ${USER_KEYWORD_TABLE} (user_id, keyword_id)
            VALUES (?, ?)
          `.trim(),
          [userId, keywordId],
        );
      }
    }

    await connection.commit(); // 변경사항 커밋(데이터베이스에 확정)
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 사용자의 특정 선호 키워드를 (선택적으로) 삭제하는 함수
// -삭제할 키워드 이름으로 keyword_id를 찾음
// -user_keyword 테이블에서 해당 keyword_id 삭제
export async function deletePreferredKeywords(
  userId: number,
  keywords: string[],
): Promise<void> {
  if (keywords.length === 0) {
    return; // 삭제할 키워드가 없으면 아무것도 하지 않음
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 키워드 이름으로 keyword_id 찾기
    const placeholders = keywords.map(() => '?').join(', '); // 키워드 개수만큼 ? 추가
    const [keywordRows] = await connection.query<KeywordRow[]>(
      `
        SELECT keyword_id
        FROM ${KEYWORD_TABLE}
        WHERE name IN (${placeholders})
      `.trim(),
      keywords,
    );

    const keywordIds = keywordRows.map((row) => row.keyword_id);

    if (keywordIds.length > 0) {
      // user_keyword 테이블에서 해당 keyword_id 삭제
      const idPlaceholders = keywordIds.map(() => '?').join(', ');
      await connection.query(
        `
          DELETE FROM ${USER_KEYWORD_TABLE}
          WHERE user_id = ? AND keyword_id IN (${idPlaceholders})
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

// ID로 키워드를 삭제하는 함수
export async function deletePreferredKeywordsByIds(
  userId: number,
  keywordIds: number[],
): Promise<void> {
  if (keywordIds.length === 0) {
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. USER_KEYWORD_TABLE에서 삭제
    const idPlaceholders = keywordIds.map(() => '?').join(', ');
    await connection.query(
      `
        DELETE FROM ${USER_KEYWORD_TABLE}
        WHERE user_id = ? AND keyword_id IN (${idPlaceholders})
      `.trim(),
      [userId, ...keywordIds],
    );

    // 2. 각 keyword_id에 대해 다른 사용자가 사용 중인지 확인
    for (const keywordId of keywordIds) {
      const [remainingUsers] = await connection.query<UserKeywordRow[]>(
        `
          SELECT user_id, keyword_id
          FROM ${USER_KEYWORD_TABLE}
          WHERE keyword_id = ?
          LIMIT 1
        `.trim(),
        [keywordId],
      );

      // 다른 사용자가 사용하지 않으면 keyword 테이블에서도 삭제
      if (remainingUsers.length === 0) {
        await connection.query(
          `
            DELETE FROM ${KEYWORD_TABLE}
            WHERE keyword_id = ?
          `.trim(),
          [keywordId],
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

