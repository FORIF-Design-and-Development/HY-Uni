import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db.js';

// DB 테이블 이름을 상수로 관리
export const BOARD_FAVORITES_TABLE = 'board_favorite';

// MySQL이 반환한 RowDataPacket을 테이블 스키마에 맞춰 표현한 타입(= 원본 DB 레코드 형태).
export interface BoardFavoriteRow extends RowDataPacket {
  user_id: number;
  board_id: number;
  created_at: Date;
}

// 애플리케이션 내부에서 사용할 도메인 모델(카멜 케이스 필드 등으로 정규화된 형태).
export interface BoardFavorite {
  userId: number;
  boardId: number;
  createdAt: Date;
}

// DB에서 조회한 Raw 행을 도메인 모델로 변환해 애플리케이션이 바로 사용 가능하게 만듦.
export const toBoardFavorite = (row: BoardFavoriteRow): BoardFavorite => ({
  userId: row.user_id,
  boardId: row.board_id,
  createdAt: new Date(row.created_at),
});

// 사용자가 게시판을 즐겨찾기 했는지 확인하는 함수
export async function isBoardFavorite(
  userId: number,
  boardId: number,
): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM ${BOARD_FAVORITES_TABLE}
      WHERE user_id = ? AND board_id = ?
      LIMIT 1
    `.trim(),
    [userId, boardId],
  );

  return rows.length > 0;
}

// 사용자가 게시판을 즐겨찾기 하는 함수
export async function addBoardFavorite(
  userId: number,
  boardId: number,
): Promise<void> {
  await pool.query(
    `
      INSERT IGNORE INTO ${BOARD_FAVORITES_TABLE} (user_id, board_id)
      VALUES (?, ?)
    `.trim(),
    [userId, boardId],
  );
}

// 사용자가 게시판의 즐겨찾기를 제거하는 함수
export async function removeBoardFavorite(
  userId: number,
  boardId: number,
): Promise<void> {
  await pool.query(
    `
      DELETE FROM ${BOARD_FAVORITES_TABLE}
      WHERE user_id = ? AND board_id = ?
    `.trim(),
    [userId, boardId],
  );
}

