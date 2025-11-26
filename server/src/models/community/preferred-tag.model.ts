import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';

// DB 테이블 이름을 상수로 관리
export const USER_PREFERENCE_TAG_TABLE = 'user_preference_tag';
export const TAGS_TABLE = 'tag';
export const BOARD_TAG_TABLE = 'board_tag';

// tag 테이블의 데이터 형태
export interface TagRow extends RowDataPacket {
  tag_id: number;
  name: string;
}

// user_preference_tag 테이블의 데이터 형태
export interface UserPreferenceTagRow extends RowDataPacket {
  user_id: number;
  tag_id: number;
}

// board_tag 테이블의 데이터 형태
export interface BoardTagRow extends RowDataPacket {
  board_id: number;
  tag_id: number;
}

// JOIN 결과 형태 (태그 정보 포함)
export interface PreferredTagWithNameRow extends RowDataPacket {
  tag_id: number;
  name: string;
}

// 사용자의 모든 선호 태그 목록을 조회하는 함수 (게시판 구분 없이)
// API 없이 내부 로직으로만 사용
// user_preference_tag와 tag를 JOIN하여 사용자의 모든 선호 태그를 반환
export async function findAllPreferredTagsByUserId(
  userId: number,
): Promise<Array<{ id: number; name: string }>> {
  const [rows] = await pool.query<PreferredTagWithNameRow[]>(
    `
      SELECT DISTINCT t.tag_id, t.name
      FROM ${USER_PREFERENCE_TAG_TABLE} upt
      INNER JOIN ${TAGS_TABLE} t ON upt.tag_id = t.tag_id
      WHERE upt.user_id = ?
      ORDER BY t.tag_id ASC
    `.trim(),
    [userId],
  );

  return rows.map((row) => ({
    id: row.tag_id,
    name: row.name,
  }));
}

// 사용자와 게시판별 선호 태그 목록을 조회하는 함수
// user_preference_tag와 board_tag를 JOIN하여 특정 게시판마다 사용자의 선호 태그만 필터링
export async function findPreferredTagsByUserIdAndBoardId(
  userId: number,
  boardId: number,
): Promise<Array<{ id: number; name: string }>> { // 특정 게시판에 대한 사용자의의 선호 태그 id, 태그 이름 목록 반환
  const [rows] = await pool.query<PreferredTagWithNameRow[]>(
    `
      SELECT t.tag_id, t.name
      FROM ${USER_PREFERENCE_TAG_TABLE} upt
      INNER JOIN ${BOARD_TAG_TABLE} bt ON upt.tag_id = bt.tag_id
      INNER JOIN ${TAGS_TABLE} t ON upt.tag_id = t.tag_id
      WHERE upt.user_id = ? AND bt.board_id = ?
      ORDER BY t.tag_id ASC
    `.trim(),
    [userId, boardId],
  );

  return rows.map((row) => ({ // 쿼리 결과를 태그 id, 태그 이름 목록 배열로 변환
    id: row.tag_id,
    name: row.name,
  }));
}

// 게시판별 사용 가능한 태그 목록 조회
// board_tag와 tag를 JOIN하여 특정 게시판에 사용 가능한 모든 태그를 반환
export async function findTagsByBoardId(
  boardId: number, // 조회할 게시판 Id
): Promise<Array<{ id: number; name: string }>> { // 특정 게시판에 사용 가능한(게시판에 등록된) 모든 태그 id, 태그 이름 목록 반환
  const [rows] = await pool.query<PreferredTagWithNameRow[]>(
    `
      SELECT t.tag_id, t.name
      FROM ${BOARD_TAG_TABLE} bt
      INNER JOIN ${TAGS_TABLE} t ON bt.tag_id = t.tag_id
      WHERE bt.board_id = ?
      ORDER BY t.tag_id ASC
    `.trim(),
    [boardId],
  );

  return rows.map((row) => ({
    id: row.tag_id,
    name: row.name,
  }));
}

// 특정 게시판의 선호 태그 개수 조회
export async function countPreferredTagsByUserIdAndBoardId(
  userId: number, // 조회할 사용자 ID
  boardId: number, // 조회할 게시판 ID
): Promise<number> { // 특정 게시판의 선호 태그 개수 반환
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) as count
      FROM ${USER_PREFERENCE_TAG_TABLE} upt
      INNER JOIN ${BOARD_TAG_TABLE} bt ON upt.tag_id = bt.tag_id
      WHERE upt.user_id = ? AND bt.board_id = ?
    `.trim(),
    [userId, boardId],
  );

  return rows[0]?.count ?? 0; // count는 특정 게시판의 선호 태그 개수
}

// 태그 ID들이 실제로 존재하는지 검증
export async function validateTagIdsExist(
  tagIds: number[],
): Promise<boolean> {
  if (tagIds.length === 0) { // tagIds가 빈 배열이면(검증할 태그가 없으면) 모든 태그가 존재하는 것으로 간주
    return true;
  }

  const placeholders = tagIds.map(() => '?').join(', ');
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) as count
      FROM ${TAGS_TABLE}
      WHERE tag_id IN (${placeholders})
    `.trim(),
    tagIds,
  );

  const count = rows[0]?.count ?? 0; // count는 검증할 태그 중 실제로 존재하는 태그의 개수
  return count === tagIds.length; // count와 검증할 태그의 개수가 같으면 true, 다르면 false
}

// 태그들이 해당 게시판에 속하는지 검증 (태그 ID가 존재해도 게시판에 속하지 않으면 false 반환)
export async function validateTagsBelongToBoard(
  tagIds: number[], // 검증할 태그 ID 목록
  boardId: number, // 검증할 게시판 ID
): Promise<boolean> { // 모든 검증할 태그 ID가 해당 게시판에 속하면 true 반환
  if (tagIds.length === 0) { // tagIds가 빈 배열이면(검증할 태그가 없으면) true 반환 (애초에 태그 등록이 필수가 아님)
    return true;
  }

  const placeholders = tagIds.map(() => '?').join(', ');
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) as count
      FROM ${BOARD_TAG_TABLE}
      WHERE board_id = ? AND tag_id IN (${placeholders})
    `.trim(),
    [boardId, ...tagIds], // 파라미터 바인딩(첫 번째는 boardId, 나머지는 tagIds)
  );

  const count = rows[0]?.count ?? 0; // count는 검증할 태그 중 실제로 해당 게시판에 속하는 태그의 개수
  return count === tagIds.length; // count와 검증할 태그의 개수가 같으면 true, 다르면 false
}

// 사용자의 선호 태그를 추가하는 함수 (기존 태그 유지, 새 태그만 추가)
export async function addPreferredTags(
  userId: number,
  boardId: number,
  tagIds: number[], // 추가할 태그 ID 목록
): Promise<void> {
  if (tagIds.length === 0) { // tagIds가 빈 배열이면(추가할 태그가 없으면) 아무것도 하지 않음
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // 기존 선호 태그 조회 (tag_id로)
    const [existingRows] = await connection.query<UserPreferenceTagRow[]>(
      `
        SELECT user_id, tag_id
        FROM ${USER_PREFERENCE_TAG_TABLE}
        WHERE user_id = ? AND tag_id IN (${tagIds.map(() => '?').join(', ')})
      `.trim(),
      [userId, ...tagIds],
    );

    const existingTagIds = new Set(
      existingRows.map((row) => row.tag_id),
    );

    // 새로 추가할 태그만 필터링 (기존에 없는 태그만)
    const newTagIds = tagIds.filter((tagId) => !existingTagIds.has(tagId)); // 추가할 태그 id 중 기존에 존재하는 태그 id는 제외하고 새로운 태그 id 목록 추출

    if (newTagIds.length > 0) { // 새로운 태그 id 목록이 있으면
      // 새 태그 추가
      const valuesPlaceholders = newTagIds.map(() => '(?, ?)').join(', ');
      const params = newTagIds.flatMap((tagId) => [userId, tagId]);

      await connection.query(
        `
          INSERT INTO ${USER_PREFERENCE_TAG_TABLE} (user_id, tag_id)
          VALUES ${valuesPlaceholders}
        `.trim(),
        params,
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

// 사용자의 선호 태그를 선택적으로 삭제하는 함수
export async function deletePreferredTags(
  userId: number,
  boardId: number,
  tagIds: number[],
): Promise<void> {
  if (tagIds.length === 0) {
    return; // 삭제할 태그가 없으면 아무것도 하지 않음
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // 해당 게시판에 속한 태그인지 확인
    const placeholders = tagIds.map(() => '?').join(', ');
    const [boardTagRows] = await connection.query<BoardTagRow[]>(
      `
        SELECT tag_id
        FROM ${BOARD_TAG_TABLE}
        WHERE board_id = ? AND tag_id IN (${placeholders})
      `.trim(),
      [boardId, ...tagIds],
    );

    const validTagIds = boardTagRows.map((row) => row.tag_id); // 검증된 태그 id 목록 추출

    if (validTagIds.length > 0) {
      // user_preference_tag 테이블에서 해당 태그 삭제
      const idPlaceholders = validTagIds.map(() => '?').join(', ');
      await connection.query(
        `
          DELETE FROM ${USER_PREFERENCE_TAG_TABLE}
          WHERE user_id = ? AND tag_id IN (${idPlaceholders})
        `.trim(),
        [userId, ...validTagIds],
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


