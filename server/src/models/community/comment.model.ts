import type { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../../config/db';
import { notifyCommentReaction } from '../../services/community/notification.service';

// DB 테이블 이름을 상수로 관리
export const COMMENTS_TABLE = 'comment';
export const COMMENT_REACTIONS_TABLE = 'comment_reaction';

// MySQL이 반환한 RowDataPacket을 테이블 스키마에 맞춰 표현한 타입(= 원본 DB 레코드 형태).
export interface CommentRow extends RowDataPacket {
  comment_id: number;
  post_id: number;
  user_id: number;
  content: string;
  is_anonymous: 0 | 1;
  is_secret: 0 | 1;
  parent_comment_id: number | null;
  like_count: number;
  dislike_count: number;
  created_at: Date;
  updated_at: Date;
  status: 'active' | 'edited' | 'deleted' | 'blocked';
  user_nickname?: string | null;
}

// 애플리케이션 내부에서 사용할 도메인 모델(카멜 케이스 필드 등으로 정규화된 형태).
export interface Comment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  isAnonymous: boolean;
  isSecret: boolean;
  parentCommentId: number | null;
  likesCount: number;
  dislikesCount: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'edited' | 'deleted' | 'blocked';
  userNickname?: string | null;
}

// 댓글 생성 요청 페이로드 타입 정의
export interface CreateCommentPayload {
  postId: number;
  userId: number;
  content: string;
  isAnonymous: boolean;
  isSecret: boolean;
}

// 댓글 생성 결과 타입 정의
export interface CreatedCommentResult {
  commentId: number;
  status: 'active';
}

// 대댓글 생성 요청 페이로드 타입 정의
export interface CreateReplyPayload {
  parentCommentId: number;
  userId: number;
  content: string;
  isAnonymous: boolean;
  isSecret: boolean;
}

// 대댓글 생성 결과 타입 정의
export interface CreatedReplyResult {
  commentId: number;
  parentCommentId: number;
  status: 'active';
}

// 댓글 수정 요청 페이로드 타입 정의
export interface UpdateCommentPayload {
  commentId: number;
  content: string;
}

// 댓글 수정 결과 타입 정의
export interface UpdatedCommentResult {
  commentId: number;
  status: 'edited';
}

// 댓글 삭제 결과 타입 정의
export interface DeletedCommentResult {
  commentId: number;
  status: 'deleted';
}

// 댓글 반응 토글 결과 타입 정의
export interface CommentReactionResult {
  commentId: number;
  likesCount: number;
  dislikesCount: number;
  userReaction: 'like' | 'dislike' | null; // 사용자의 반응 상태 (좋아요, 싫어요, 없음)
}

// DB에서 조회한 Raw 행을 도메인 모델로 변환해 애플리케이션이 바로 사용 가능하게 만듦.
export const toComment = (row: CommentRow): Comment => ({
  id: row.comment_id,
  postId: row.post_id,
  userId: row.user_id,
  content: row.content,
  isAnonymous: Boolean(row.is_anonymous),
  isSecret: Boolean(row.is_secret),
  parentCommentId: row.parent_comment_id,
  likesCount: row.like_count,
  dislikesCount: row.dislike_count,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  status: row.status,
  userNickname: row.user_nickname || null,
});

// 댓글 내용에 필터링 키워드가 포함되어 있는지 확인하는 함수
export function containsFilterKeyword(
  content: string,
  filterKeywords: string[],
): boolean {
  if (filterKeywords.length === 0) return false; // 필터링키워드가 없으면 false 반환

  const lowerContent = content.toLowerCase(); //댓글 내용을 소문자로 반환
  return filterKeywords.some((keyword) =>
    lowerContent.includes(keyword.toLowerCase()), // 댓글 내용에 필터링 키워드가 포함되어 있는지 확인
  );
}

// 게시글 ID로 댓글 목록 조회 (계층 구조)
export async function findCommentsByPostId(
  postId: number,
  currentUserId: number | null,
  postAuthorId: number,
): Promise<Comment[]> {
  const sql = `
    SELECT 
      c.comment_id,
      c.post_id,
      c.user_id,
      c.content,
      c.is_anonymous,
      c.is_secret,
      c.parent_comment_id,
      c.like_count,
      c.dislike_count,
      c.created_at,
      c.updated_at,
      c.status,
      u.nickname AS user_nickname
    FROM ${COMMENTS_TABLE} AS c
    LEFT JOIN user AS u ON c.user_id = u.user_id
    WHERE c.post_id = ?
    ORDER BY 
      CASE WHEN c.parent_comment_id IS NULL THEN c.comment_id ELSE c.parent_comment_id END,
      c.comment_id ASC
  `;

  const [rows] = await pool.query<CommentRow[]>(sql, [postId]);
  const comments = rows.map(toComment);

  // 조회 시점에 비밀댓글/삭제댓글 처리 (필터링 키워드 체크는 findPostDetailById에서 처리)
  return comments.map((comment) => {
    // 삭제된 댓글 처리
    if (comment.status === 'deleted') {
      return {
        ...comment,
        content: '삭제된 댓글입니다.',
      };
    }

    // 비밀댓글 처리
    if (comment.isSecret) {
      // 비밀댓글은 게시글 작성자와 댓글 작성자만 볼 수 있음
      const canViewSecret =
        currentUserId === comment.userId || currentUserId === postAuthorId;

      if (!canViewSecret) {
        return {
          ...comment,
          content: '비밀댓글입니다.',
        };
      }
    }

    // 원본 댓글 반환 (필터링은 findPostDetailById에서 처리)
    return comment;
  });
}

// 게시글 존재 여부 확인
export async function checkPostExists(postId: number): Promise<boolean> {
  const sql = `
    SELECT post_id
    FROM post
    WHERE post_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [postId]);
  return rows.length > 0;
}

// 댓글 생성 함수
export async function createComment(
  payload: CreateCommentPayload,
): Promise<CreatedCommentResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 댓글 삽입
    const sql = `
      INSERT INTO ${COMMENTS_TABLE}
        (post_id, user_id, content, is_anonymous, is_secret, parent_comment_id, like_count, dislike_count, created_at, updated_at, status)
      VALUES
        (?, ?, ?, ?, ?, NULL, 0, 0, NOW(), NOW(), 'active')
    `;

    const [result] = await connection.execute<ResultSetHeader>(sql, [
      payload.postId,
      payload.userId,
      payload.content,
      payload.isAnonymous ? 1 : 0,
      payload.isSecret ? 1 : 0,
    ]);

    const commentId = result.insertId;
    if (!commentId) {
      throw new Error('댓글 생성에 실패했습니다.');
    }

    // post 테이블의 comment_count를 실제 댓글 수로 업데이트 (삭제되지 않은 댓글만 카운트)
    await connection.execute(
      `UPDATE post SET comment_count = (
        SELECT COUNT(*) 
        FROM ${COMMENTS_TABLE} 
        WHERE post_id = ? AND status != 'deleted'
      ) WHERE post_id = ?`,
      [payload.postId, payload.postId],
    );

    await connection.commit();
    return {
      commentId,
      status: 'active',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 댓글 존재 여부 확인
export async function checkCommentExists(commentId: number): Promise<CommentRow | null> {
  const sql = `
    SELECT 
      comment_id,
      post_id,
      user_id,
      content,
      is_anonymous,
      is_secret,
      parent_comment_id,
      like_count,
      dislike_count,
      created_at,
      updated_at,
      status
    FROM ${COMMENTS_TABLE}
    WHERE comment_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<CommentRow[]>(sql, [commentId]);
  return rows.length > 0 && rows[0] ? rows[0] : null; // 댓글이 존재하고 행이 있으면 행을 반환, 없으면 null 반환
}

// 대댓글 생성 함수
export async function createReply(
  payload: CreateReplyPayload,
): Promise<CreatedReplyResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 부모 댓글 존재 여부 확인
    const parentComment = await checkCommentExists(payload.parentCommentId);
    if (!parentComment) {
      throw new Error('COMMENT_NOT_FOUND');
    }

    // 부모 댓글이 이미 대댓글인지 확인 (depth 제한)
    if (parentComment.parent_comment_id !== null) {
      throw new Error('INVALID_PARENT_COMMENT');
    }

    // 부모 댓글의 isSecret 확인 및 로직 적용
    const finalIsSecret = parentComment.is_secret === 1 ? true : payload.isSecret;
    const postId = parentComment.post_id;

    // 대댓글 삽입
    const sql = `
      INSERT INTO ${COMMENTS_TABLE}
        (post_id, user_id, content, is_anonymous, is_secret, parent_comment_id, like_count, dislike_count, created_at, updated_at, status)
      VALUES
        (?, ?, ?, ?, ?, ?, 0, 0, NOW(), NOW(), 'active')
    `;

    const [result] = await connection.execute<ResultSetHeader>(sql, [
      postId,
      payload.userId,
      payload.content,
      payload.isAnonymous ? 1 : 0,
      finalIsSecret ? 1 : 0,
      payload.parentCommentId,
    ]);

    const commentId = result.insertId;
    if (!commentId) {
      throw new Error('대댓글 생성에 실패했습니다.');
    }

    // post 테이블의 comment_count를 실제 댓글 수로 업데이트 (삭제되지 않은 댓글만 카운트)
    await connection.execute(
      `UPDATE post SET comment_count = (
        SELECT COUNT(*) 
        FROM ${COMMENTS_TABLE} 
        WHERE post_id = ? AND status != 'deleted'
      ) WHERE post_id = ?`,
      [postId, postId],
    );

    await connection.commit();
    return {
      commentId,
      parentCommentId: payload.parentCommentId,
      status: 'active',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 댓글 ID로 댓글 조회
export async function findCommentById(commentId: number): Promise<Comment | null> {
  const sql = `
    SELECT 
      comment_id,
      post_id,
      user_id,
      content,
      is_anonymous,
      is_secret,
      parent_comment_id,
      like_count,
      dislike_count,
      created_at,
      updated_at,
      status
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

// 댓글 반응 토글 함수
export async function toggleCommentReaction(
  commentId: number,
  userId: number,
  reactionType: 'like' | 'dislike',
): Promise<CommentReactionResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // 댓글 존재 여부 확인
    const comment = await checkCommentExists(commentId);
    if (!comment) {
      throw new Error('COMMENT_NOT_FOUND'); // 댓글이 존재하지 않음
    }

    // 현재 사용자의 반응 상태 확인
    const currentReaction = await findCommentReaction(commentId, userId);

    let newReaction: 'like' | 'dislike' | null = null; // 좋아요/싫어요 토글 함수에서 사용하는 변수 초기화
    let likeCountDelta = 0; // 좋아요 카운트 변경 값
    let dislikeCountDelta = 0; // 싫어요 카운트 변경 값

    // case1: 현재 상태가 없음 -> 요청한 타입 추가 (INSERT)
    if (currentReaction === null) {
      await connection.execute(
        `INSERT INTO ${COMMENT_REACTIONS_TABLE} (comment_id, user_id, reaction) VALUES (?, ?, ?)`,
        [commentId, userId, reactionType],
      );
      newReaction = reactionType; // 새 반응 상태 설정
      // 요청한 타입이 좋아요인 경우
      if (reactionType === 'like') {
        likeCountDelta = 1; // 좋아요 카운트 변경 값
      // 요청한 타입이 싫어요인 경우
      } else {
        dislikeCountDelta = 1; // 싫어요 카운트 변경 값
      }
      // case2: 현재 상태가 요청한 타입과 같음 -> 취소 (DELETE)
    } else if (currentReaction === reactionType) {
      await connection.execute(
        `DELETE FROM ${COMMENT_REACTIONS_TABLE} WHERE comment_id = ? AND user_id = ?`,
        [commentId, userId],
      );
      // 새 반응 상태 초기화
      newReaction = null;
      if (reactionType === 'like') {
        likeCountDelta = -1; // 좋아요 카운트 1 감소
      } else {
        dislikeCountDelta = -1; // 싫어요 카운트 1 감소
      }
    } else {
      // case3: 현재 상태가 요청한 타입과 다름 -> 변경 (UPDATE)
      await connection.execute(
        `UPDATE ${COMMENT_REACTIONS_TABLE} SET reaction = ? WHERE comment_id = ? AND user_id = ?`,
        [reactionType, commentId, userId],
      );
      newReaction = reactionType; // 새 반응 상태를 요청한 타입으로 설정
      // 기존 타입 카운트 -1, 새 타입 카운트 +1
      if (currentReaction === 'like') {
        likeCountDelta = -1; // 좋아요 카운트 1 감소
        dislikeCountDelta = 1; // 싫어요 카운트 1 증가
      } else {
        likeCountDelta = 1; // 좋아요 카운트 1 증가
        dislikeCountDelta = -1; // 싫어요 카운트 1 감소
      }
    }

    // comment 테이블의 카운트 업데이트
    const newLikeCount = Math.max(0, comment.like_count + likeCountDelta);
    const newDislikeCount = Math.max(0, comment.dislike_count + dislikeCountDelta);

    await connection.execute(
      `UPDATE ${COMMENTS_TABLE} SET like_count = ?, dislike_count = ? WHERE comment_id = ?`,
      [newLikeCount, newDislikeCount, commentId],
    );

    await connection.commit();

    // 반응 추가 시에만 알림 발송 (취소/변경 시에는 발송하지 않음)
    if (currentReaction === null && newReaction) {
      try {
        await notifyCommentReaction(commentId, userId);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    return {
      commentId,
      likesCount: newLikeCount,
      dislikesCount: newDislikeCount,
      userReaction: newReaction,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 댓글 수정 함수
export async function updateComment(
  payload: UpdateCommentPayload,
  userId: number,
): Promise<UpdatedCommentResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // 댓글 존재 여부 확인
    const comment = await checkCommentExists(payload.commentId);
    if (!comment) {
      throw new Error('COMMENT_NOT_FOUND'); // 댓글이 존재하지 않음
    }

    // 삭제된 댓글인지 확인
    if (comment.status === 'deleted') {
      throw new Error('COMMENT_ALREADY_DELETED'); // 이미 삭제된 댓글
    }

    // 작성자 권한 확인
    if (comment.user_id !== userId) {
      throw new Error('FORBIDDEN'); // 수정 권한 없음
    }

    // 댓글 내용만 수정 (isAnonymous, isSecret은 수정하지 않음)
    // status는 'edited'로 변경
    await connection.execute(
      `UPDATE ${COMMENTS_TABLE} SET content = ?, status = 'edited', updated_at = NOW() WHERE comment_id = ?`,
      [payload.content, payload.commentId],
    );

    await connection.commit();
    return {
      commentId: payload.commentId,
      status: 'edited',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 댓글 삭제 함수
export async function deleteComment(
  commentId: number,
  userId: number,
): Promise<DeletedCommentResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 댓글 존재 여부 확인
    const comment = await checkCommentExists(commentId);
    if (!comment) {
      throw new Error('COMMENT_NOT_FOUND');
    }

    // 작성자 권한 확인
    if (comment.user_id !== userId) {
      throw new Error('FORBIDDEN');
    }

    // 소프트 삭제: content는 그대로 유지하고 status만 'deleted'로 설정
    await connection.execute(
      `UPDATE ${COMMENTS_TABLE} SET status = 'deleted', updated_at = NOW() WHERE comment_id = ?`,
      [commentId],
    );

    // post 테이블의 comment_count를 실제 댓글 수로 업데이트 (삭제되지 않은 댓글만 카운트)
    await connection.execute(
      `UPDATE post SET comment_count = (
        SELECT COUNT(*) 
        FROM ${COMMENTS_TABLE} 
        WHERE post_id = ? AND status != 'deleted'
      ) WHERE post_id = ?`,
      [comment.post_id, comment.post_id],
    );

    await connection.commit();
    return {
      commentId,
      status: 'deleted',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
