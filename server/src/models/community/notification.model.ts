import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../../config/db';

// DB 테이블 이름을 상수로 관리
export const NOTIFICATIONS_TABLE = 'notification';

// 알림 타입 정의
export type NotificationType =
  | 'new_post_in_board'
  | 'new_comment_on_post'
  | 'new_reply_on_comment'
  | 'new_reaction_on_post'
  | 'new_reaction_on_comment';

// MySQL이 반환한 RowDataPacket을 테이블 스키마에 맞춰 표현한 타입(= 원본 DB 레코드 형태).
// MySQL이 반환한 RowDataPacket을 테이블 스키마에 맞춰 표현한 타입(= 원본 DB 레코드 형태).
export interface NotificationRow extends RowDataPacket {
  notification_id: number;
  recipient_id: number;
  actor_id: number | null;
  type: NotificationType;
  entity_id: number | null;
  is_read: 0 | 1;
  created_at: Date;
  // JOIN 된 컬럼들
  post_title: string | null;
  post_content: string | null;
  board_id: number | null;
  board_name: string | null;
}

// 애플리케이션 내부에서 사용할 도메인 모델(카멜 케이스 필드 등으로 정규화된 형태).
export interface Notification {
  id: number;
  recipientId: number;
  actorId: number | null;
  type: NotificationType;
  entityId: number | null;
  isRead: boolean;
  createdAt: Date;
  postTitle?: string | undefined;
  postContent?: string | undefined;
  boardId?: number | undefined;
  boardName?: string | undefined;
}

// DB에서 조회한 Raw 행을 도메인 모델로 변환해 애플리케이션이 바로 사용 가능하게 만듦.
export const toNotification = (row: NotificationRow): Notification => ({
  id: row.notification_id,
  recipientId: row.recipient_id,
  actorId: row.actor_id,
  type: row.type,
  entityId: row.entity_id,
  isRead: Boolean(row.is_read),
  createdAt: new Date(row.created_at),
  postTitle: row.post_title ?? undefined,
  postContent: row.post_content ?? undefined,
  boardId: row.board_id ?? undefined,
  boardName: row.board_name ?? undefined,
});

// 알림 생성
export async function createNotification(
  recipientId: number,
  actorId: number | null,
  type: NotificationType,
  entityId: number | null,
): Promise<number> {
  const sql = `
    INSERT INTO ${NOTIFICATIONS_TABLE} (recipient_id, actor_id, type, entity_id)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await pool.query<ResultSetHeader>(sql, [
    recipientId,
    actorId,
    type,
    entityId,
  ]);
  return result.insertId;
}

// 사용자의 읽지 않은 알림 조회
export async function findUnreadNotificationsByUserId(
  userId: number,
  limit: number = 50,
  offset: number = 0,
): Promise<Notification[]> {
  const sql = `
    SELECT 
      notification_id,
      recipient_id,
      actor_id,
      type,
      entity_id,
      is_read,
      created_at
    FROM ${NOTIFICATIONS_TABLE}
    WHERE recipient_id = ? AND is_read = FALSE
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query<NotificationRow[]>(sql, [
    userId,
    limit,
    offset,
  ]);
  return rows.map(toNotification);
}

// 사용자의 전체 알림 조회 (페이징, 정렬)
export async function findNotificationsByUserId(
  userId: number,
  limit: number = 50,
  offset: number = 0,
  isRead: boolean | null = null,
): Promise<Notification[]> {
  let sql = `
    SELECT 
      n.notification_id,
      n.recipient_id,
      n.actor_id,
      n.type,
      n.entity_id,
      n.is_read,
      n.created_at,
      p.title AS post_title,
      LEFT(p.content, 100) AS post_content,
      b.board_id,
      b.name AS board_name
    FROM ${NOTIFICATIONS_TABLE} n
    LEFT JOIN post p ON n.entity_id = p.post_id AND (
      n.type IN ('new_post_in_board', 'new_comment_on_post', 'new_reply_on_comment', 'new_reaction_on_post', 'new_reaction_on_comment')
    )
    LEFT JOIN board b ON p.board_id = b.board_id
    WHERE n.recipient_id = ?
  `;
  const params: (number | boolean)[] = [userId];

  if (isRead !== null) {
    sql += ` AND n.is_read = ?`;
    params.push(isRead);
  }

  sql += ` ORDER BY n.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query<NotificationRow[]>(sql, params);
  return rows.map(toNotification);
}

// 알림 읽음 처리
export async function markNotificationAsRead(
  notificationId: number,
  userId: number,
): Promise<boolean> {
  const sql = `
    UPDATE ${NOTIFICATIONS_TABLE}
    SET is_read = TRUE
    WHERE notification_id = ? AND recipient_id = ?
  `;
  const [result] = await pool.query<ResultSetHeader>(sql, [
    notificationId,
    userId,
  ]);
  return result.affectedRows > 0;
}

// 사용자의 모든 알림 읽음 처리
export async function markAllNotificationsAsRead(
  userId: number,
): Promise<number> {
  const sql = `
    UPDATE ${NOTIFICATIONS_TABLE}
    SET is_read = TRUE
    WHERE recipient_id = ? AND is_read = FALSE
  `;
  const [result] = await pool.query<ResultSetHeader>(sql, [userId]);
  return result.affectedRows;
}

// 읽지 않은 알림 개수 조회
export async function getUnreadNotificationCount(
  userId: number,
): Promise<number> {
  const sql = `
    SELECT COUNT(*) as count
    FROM ${NOTIFICATIONS_TABLE}
    WHERE recipient_id = ? AND is_read = FALSE
  `;
  const [rows] = await pool.query<RowDataPacket[]>(sql, [userId]);
  return rows[0]?.count ?? 0;
}

