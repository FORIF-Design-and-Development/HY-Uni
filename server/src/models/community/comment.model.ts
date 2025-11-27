import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';

// DB 테이블 이름을 상수로 관리
export const COMMENTS_TABLE = 'comment';
export const COMMENT_REACTIONS_TABLE = 'comment_reaction';

// MySQL이 반환한 RowDataPacket을 테이블 스키마에 맞춰 표현한 타입(= 원본 DB 레코드 형태).
export interface CommentRow extends RowDataPacket {
  comment_id: number;
  post_id: number;
  user_id: number;
  content: string;
  is_secret: 0 | 1;
  parent_comment_id: number | null;
  like_count: number;
  dislike_count: number;
  created_at: Date;
  updated_at: Date;
}

// 애플리케이션 내부에서 사용할 도메인 모델(카멜 케이스 필드 등으로 정규화된 형태).
export interface Comment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  isSecret: boolean;
  parentCommentId: number | null;
  likesCount: number;
  dislikesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// DB에서 조회한 Raw 행을 도메인 모델로 변환해 애플리케이션이 바로 사용 가능하게 만듦.
export const toComment = (row: CommentRow): Comment => ({
  id: row.comment_id,
  postId: row.post_id,
  userId: row.user_id,
  content: row.content,
  isSecret: Boolean(row.is_secret),
  parentCommentId: row.parent_comment_id,
  likesCount: row.like_count,
  dislikesCount: row.dislike_count,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// 게시글 ID로 댓글 목록 조회 (계층 구조)
export async function findCommentsByPostId(
  postId: number,
  currentUserId: number | null,
  postAuthorId: number,
): Promise<Comment[]> {
  const sql = `
    SELECT 
      comment_id,
      post_id,
      user_id,
      content,
      is_secret,
      parent_comment_id,
      like_count,
      dislike_count,
      created_at,
      updated_at
    FROM ${COMMENTS_TABLE}
    WHERE post_id = ?
    ORDER BY 
      CASE WHEN parent_comment_id IS NULL THEN comment_id ELSE parent_comment_id END,
      comment_id ASC
  `;

  const [rows] = await pool.query<CommentRow[]>(sql, [postId]);
  return rows.map(toComment);
}

// 댓글 ID로 댓글 조회
// TODO: 댓글 기능 구현 후 개편필요
export async function findCommentById(commentId: number): Promise<Comment | null> {
  const sql = `
    SELECT 
      comment_id,
      post_id,
      user_id,
      content,
      is_secret,
      parent_comment_id,
      like_count,
      dislike_count,
      created_at,
      updated_at
    FROM ${COMMENTS_TABLE}
    WHERE comment_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<CommentRow[]>(sql, [commentId]);
  return rows.length > 0 && rows[0] ? toComment(rows[0]) : null;
}

// 댓글 반응 조회
export async function findCommentReaction(
  commentId: number,
  userId: number | null,
): Promise<'like' | 'dislike' | null> {
  if (!userId) return null;

  const sql = `
    SELECT reaction
    FROM ${COMMENT_REACTIONS_TABLE}
    WHERE comment_id = ? AND user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [commentId, userId]);
  if (rows.length === 0 || !rows[0]) return null;

  const reaction = rows[0].reaction;
  return reaction === 'like' || reaction === 'dislike' ? reaction : null;
}

