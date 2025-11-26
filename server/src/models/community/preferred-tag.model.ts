import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';
import { BOARDS_TABLE } from './board.model';

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

// 모든 게시판과 태그를 조회하는 쿼리 결과 형태
export interface BoardWithTagsRow extends RowDataPacket {
  board_id: number;
  board_name: string;
  parent_board_id: number | null;
  target_board_id: number; // 태그를 조회할 게시판 ID (최상위는 자신, 하위는 부모)
  response_board_name: string; // 응답에 사용할 게시판 이름 (하위는 부모 이름, 최상위는 자신의 이름)
  tag_id: number | null; // 태그 ID (존재하지 않을 수 있음)
  tag_name: string | null;
}

// 모든 게시판 태그 조회 결과 형태
export interface BoardWithTags {
  boardId: number;
  boardName: string;
  availableTags: Array<{ id: number; name: string }>;
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

// 모든 게시판의 태그를 게시판별로 그룹화하여 조회하는 함수
// - 최상위 게시판: 자신의 태그 반환
// - 하위 게시판: 부모 게시판의 태그 반환 (응답의 boardId는 부모 게시판 ID)
export async function findAllBoardsWithTags(): Promise<BoardWithTags[]> {
  // 모든 게시판과 태그를 한 번에 조회
  // 하위 게시판의 경우 parent_board_id를 사용하여 부모 게시판의 태그를 조회
  const sql = `
    SELECT
      b.board_id,
      b.name as board_name,
      b.parent_board_id, 
      COALESCE(b.parent_board_id, b.board_id) as target_board_id, 
      COALESCE(p.name, b.name) as response_board_name,
      t.tag_id,
      t.name as tag_name
    FROM ${BOARDS_TABLE} b
    LEFT JOIN ${BOARDS_TABLE} p 
      ON b.parent_board_id = p.board_id
    LEFT JOIN ${BOARD_TAG_TABLE} bt 
      ON bt.board_id = COALESCE(b.parent_board_id, b.board_id)
    LEFT JOIN ${TAGS_TABLE} t 
      ON t.tag_id = bt.tag_id
    ORDER BY b.board_id ASC, t.tag_id ASC
  `;

  const [rows] = await pool.query<BoardWithTagsRow[]>(sql);

  // 게시판별로 그룹화
  const boardMap = new Map<number, BoardWithTags>();

  for (const row of rows) {
    // 하위 게시판의 경우 부모 게시판 ID를 사용, 최상위 게시판은 자신의 ID 사용
    const responseBoardId = row.parent_board_id ?? row.board_id; // parent_board_id가 null이면 board_id를 사용
    // 하위 게시판의 경우 부모 게시판 이름 사용, 최상위 게시판은 자신의 이름 사용
    const responseBoardName = row.response_board_name;

    // 이미 존재하는 게시판인지 확인
    if (!boardMap.has(responseBoardId)) { // 이미 존재하는 게시판이 아니면 추가
      boardMap.set(responseBoardId, {
        boardId: responseBoardId,
        boardName: responseBoardName,
        availableTags: [],
      });
    }

    // 태그가 있는 경우 추가
    if (row.tag_id !== null && row.tag_name !== null) { // 태그 존재 여부 확인
      const board = boardMap.get(responseBoardId)!; // 게시판 객체 가져오기
      // 중복 태그 체크 (같은 부모를 가진 하위 게시판들이 있을 수 있음)
      const existingTag = board.availableTags.find(
        (tag) => tag.id === row.tag_id, // 이미 추가된 태그인지 확인
      );
      if (!existingTag) { // 중복이 아니면
        board.availableTags.push({ // 태그 추가
          id: row.tag_id,
          name: row.tag_name,
        });
      }
    }
  }

  // board_id 순서로 정렬하여 반환
  return Array.from(boardMap.values()).sort((a, b) => a.boardId - b.boardId);
}

