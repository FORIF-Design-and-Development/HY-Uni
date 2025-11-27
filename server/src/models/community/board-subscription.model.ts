import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';

// DB 테이블 이름을 상수로 관리
export const BOARD_SUBSCRIPTION_TABLE = 'board_subscription';

// MySQL이 반환한 RowDataPacket을 테이블 스키마에 맞춰 표현한 타입(= 원본 DB 레코드 형태).
export interface BoardSubscriptionRow extends RowDataPacket {
  user_id: number;
  board_id: number;
  created_at: Date;
}

// 애플리케이션 내부에서 사용할 도메인 모델(카멜 케이스 필드 등으로 정규화된 형태).
export interface BoardSubscription {
  userId: number;
  boardId: number;
  createdAt: Date;
}

// DB에서 조회한 Raw 행을 도메인 모델로 변환해 애플리케이션이 바로 사용 가능하게 만듦.
export const toBoardSubscription = (row: BoardSubscriptionRow): BoardSubscription => ({
  userId: row.user_id,
  boardId: row.board_id,
  createdAt: new Date(row.created_at),
});

// 사용자가 게시판을 구독 중인지 확인하는 함수
export async function isBoardSubscribed(
  userId: number,
  boardId: number,
): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM ${BOARD_SUBSCRIPTION_TABLE}
      WHERE user_id = ? AND board_id = ?
      LIMIT 1
    `.trim(),
    [userId, boardId],
  );

  return rows.length > 0;
}

// 사용자가 게시판을 구독하는 함수
export async function addBoardSubscription(
  userId: number,
  boardId: number,
): Promise<void> {
  await pool.query(
    `
      INSERT IGNORE INTO ${BOARD_SUBSCRIPTION_TABLE} (user_id, board_id)
      VALUES (?, ?)
    `.trim(),
    [userId, boardId],
  );
}

// 사용자가 게시판의 구독을 제거하는 함수
export async function removeBoardSubscription(
  userId: number,
  boardId: number,
): Promise<void> {
  await pool.query(
    `
      DELETE FROM ${BOARD_SUBSCRIPTION_TABLE}
      WHERE user_id = ? AND board_id = ?
    `.trim(),
    [userId, boardId],
  );
}

// 게시판 구독자 목록 조회
export async function findBoardSubscribers(
  boardId: number,
): Promise<BoardSubscription[]> {
  const [rows] = await pool.query<BoardSubscriptionRow[]>(
    `
      SELECT user_id, board_id, created_at
      FROM ${BOARD_SUBSCRIPTION_TABLE}
      WHERE board_id = ?
    `.trim(),
    [boardId],
  );
  return rows.map(toBoardSubscription);
}

