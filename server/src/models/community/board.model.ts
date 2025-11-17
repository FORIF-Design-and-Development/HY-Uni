import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';

// DB 테이블 이름을 상수로 관리
export const BOARDS_TABLE = 'board';

// 게시판 카테고리
export const BOARD_CATEGORIES = [
  'my',
  'recommend',
  'hot',
  'best',
  'free',
  'club',
  'career',
  'department',
  'international',
] as const;

// 게시판 카테고리를 숫자로 매핑
export type BoardCategory = (typeof BOARD_CATEGORIES)[number];

// MySQL이 반환한 RowDataPacket을 테이블 스키마에 맞춰 표현한 타입(= 원본 DB 레코드 형태).
export interface BoardRow extends RowDataPacket {
  board_id: number;
  parent_board_id: number | null;
  name: string;
  description: string | null;
  category: BoardCategory;
  created_at: Date;
}

// 애플리케이션 내부에서 사용할 도메인 모델(카멜 케이스 필드 등으로 정규화된 형태).
export interface Board {
  boardId: number;
  parentBoardId: number | null;
  name: string;
  description: string | null;
  category: BoardCategory;
  createdAt: Date;
}

// DB에서 조회한 Raw 행을 도메인 모델로 변환해 애플리케이션이 바로 사용 가능하게 만듦.
export const toBoard = (row: BoardRow): Board => ({
  boardId: row.board_id,
  parentBoardId: row.parent_board_id,
  name: row.name,
  description: row.description,
  category: row.category,
  createdAt: new Date(row.created_at),
});

// 게시판 ID로 게시판을 조회하는 함수
export async function findBoardById(boardId: number): Promise<Board | null> {
  const [rows] = await pool.query<BoardRow[]>(
    `
      SELECT board_id, parent_board_id, name, description, category, created_at
      FROM ${BOARDS_TABLE}
      WHERE board_id = ?
      LIMIT 1
    `.trim(),
    [boardId],
  );

  const row = rows[0];
  return row ? toBoard(row) : null;
}

// DB에서 조회한 Raw 행을 도메인 모델로 변환해 애플리케이션이 바로 사용 가능하게 만듦.
interface BoardWithUserFlagsRow extends RowDataPacket {
  board_id: number; // 게시판 ID
  parent_board_id: number | null; // 부모 게시판 ID
  name: string; // 게시판 이름
  is_favorite: 0 | 1; // 사용자 즐겨찾기 여부
  is_subscribed: 0 | 1; // 사용자 구독 여부
}

// 사용자 즐겨찾기 및 구독 여부가 포함된 게시판 도메인 모델
export interface BoardWithUserFlags {
  id: number;
  name: string;
  parentBoardId: number | null;
  isFavorite: boolean;
  isSubscribed: boolean;
}

// 사용자 즐겨찾기 및 구독 여부가 포함된 게시판 목록을 조회하는 함수
export async function findBoardsWithUserFlags(
  userId: number | null, // 사용자 ID(required)
): Promise<BoardWithUserFlags[]> { // 사용자 즐겨찾기 및 구독 여부가 포함된 게시판 목록
  const sql = `
    SELECT
      b.board_id,
      b.name,
      b.parent_board_id,
      CASE WHEN bf.user_id IS NULL THEN 0 ELSE 1 END AS is_favorite,
      CASE WHEN bs.user_id IS NULL THEN 0 ELSE 1 END AS is_subscribed
    FROM ${BOARDS_TABLE} AS b
    LEFT JOIN board_favorite AS bf
      ON bf.board_id = b.board_id
      AND bf.user_id = ?
    LEFT JOIN board_subscription AS bs
      ON bs.board_id = b.board_id
      AND bs.user_id = ?
    ORDER BY b.board_id ASC
  `;

  const userParam = userId ?? null; // 사용자 ID가 없으면 null로 처리
  const [rows] = await pool.query<BoardWithUserFlagsRow[]>(sql, [ // 쿼리 실행 결과를 BoardWithUserFlagsRow[] 배열로 변환
    userParam,
    userParam,
  ]);

  return rows.map((row: BoardWithUserFlagsRow) => ({ // 쿼리 결과를 BoardWithUserFlags 배열로 변환
    id: row.board_id,
    name: row.name,
    parentBoardId: row.parent_board_id,
    isFavorite: Boolean(row.is_favorite),
    isSubscribed: Boolean(row.is_subscribed),
  }));
}

