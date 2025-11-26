import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';
import { findBoardById } from './board.model';
import { findTagsByPostId } from './tag.model';
import { findCommentsByPostId, findCommentReaction, COMMENTS_TABLE, COMMENT_REACTIONS_TABLE } from './comment.model';
import { findFilterKeywordsByUserId } from './filter-keyword.model';
import fs from 'fs/promises';
import path from 'path';
import {
  UPLOAD_IMAGES_DIR,
  UPLOAD_VIDEOS_DIR,
  UPLOAD_IMAGES_URL,
  UPLOAD_VIDEOS_URL,
} from '../../config/upload';

const POSTS_TABLE = 'post';
const POST_TAGS_TABLE = 'post_tag';
const ATTACHMENTS_TABLE = 'attachment';
const POLLS_TABLE = 'poll';
const POLL_OPTIONS_TABLE = 'poll_option';
const POST_REACTIONS_TABLE = 'post_reaction';
const SCRAPS_TABLE = 'scrap';
const POLL_VOTES_TABLE = 'poll_vote';
const USERS_TABLE = 'user';

// 첨부파일 입력 타입 정의
// 첨부파일 입력 타입 정의
export interface AttachmentItem {
  type: 'IMAGE' | 'VIDEO';
  url: string;
}

// 투표 입력 타입 정의
export interface PollPayload {
  question: string;
  options: string[];
  expiredAt?: string | null;
}

// 게시물 생성 요청 페이로드 타입 정의
export interface CreatePostPayload {
  userId: number;
  boardId: number;
  title: string;
  content: string;
  isAnonymous: boolean;
  tagIds?: number[];
  attachments?: AttachmentItem[];
  poll?: PollPayload | null | undefined;
}

// 게시물 생성 결과 타입 정의
export interface CreatedPostResult {
  postId: number;
  status: 'published';
}

// 게시물 수정 요청 페이로드 타입 정의
export interface UpdatePostPayload {
  postId: number;
  title?: string;
  content?: string;
  isAnonymous?: boolean;
  tagIds?: number[];
  attachments?: AttachmentItem[];
  // poll은 수정 불가
}

// 게시글 삽입 함수
async function insertPost(
  connection: PoolConnection,
  payload: CreatePostPayload,
): Promise<number> {
  const { userId, boardId, title, content, isAnonymous } = payload;
  const [result] = await connection.execute<ResultSetHeader>(
    `
      INSERT INTO ${POSTS_TABLE}
        (user_id, board_id, title, content, is_anonymous)
      VALUES
        (?, ?, ?, ?, ?)
    `.trim(),
    [userId, boardId, title, content, isAnonymous],
  );
  return result.insertId;
}

// 게시글 업데이트 함수
async function updatePost(
  connection: PoolConnection,
  payload: UpdatePostPayload,
): Promise<void> {
  const { postId, title, content, isAnonymous } = payload;
  
  // 업데이트할 필드만 동적으로 구성
  const updates: string[] = [];
  const params: any[] = [];
  
  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  
  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content);
  }
  
  if (isAnonymous !== undefined) {
    updates.push('is_anonymous = ?');
    params.push(isAnonymous);
  }
  
  // updated_at과 status는 항상 갱신
  updates.push('updated_at = NOW()');
  updates.push("status = 'edited'");
  
  params.push(postId);
  
  await connection.execute(
    `
      UPDATE ${POSTS_TABLE}
      SET ${updates.join(', ')}
      WHERE post_id = ?
    `.trim(),
    params,
  );
}

// 게시글 태그 삽입 함수
async function insertPostTags(
  connection: PoolConnection,
  postId: number,
  tagIds: number[],
): Promise<void> {
  if (!tagIds.length) return;

  const valuesPlaceholders = tagIds.map(() => '(?, ?)').join(', ');
  const params = tagIds.flatMap((tagId) => [postId, tagId]);

  await connection.execute(
    `
      INSERT INTO ${POST_TAGS_TABLE}
        (post_id, tag_id)
      VALUES
        ${valuesPlaceholders}
    `.trim(),
    params,
  );
}

// 게시글 태그 업데이트 함수 (기존 태그 삭제 후 새 태그 삽입)
async function updatePostTags(
  connection: PoolConnection,
  postId: number,
  tagIds: number[],
): Promise<void> {
  // 기존 태그 삭제
  await connection.execute(
    `DELETE FROM ${POST_TAGS_TABLE} WHERE post_id = ?`,
    [postId],
  );
  
  // 새 태그 삽입
  if (tagIds.length > 0) {
    await insertPostTags(connection, postId, tagIds);
  }
}

type AttachmentType = 'image' | 'video';

interface AttachmentRecord {
  type: AttachmentType;
  url: string;
}

// 첨부파일 형태 변환 함수
// 첨부파일 형태 변환 함수
function buildAttachmentRecords(
  attachments?: AttachmentItem[],
): AttachmentRecord[] {
  if (!attachments || !attachments.length) return [];

  return attachments.map((item) => ({
    type: item.type === 'IMAGE' ? 'image' : 'video',
    url: item.url,
  }));
}

// 첨부파일 삽입 함수
async function insertAttachments(
  connection: PoolConnection,
  postId: number,
  records: AttachmentRecord[],
): Promise<void> {
  if (!records.length) return;

  const placeholders = records.map(() => '(?, ?, ?)').join(', ');
  const params = records.flatMap((record) => [postId, record.type, record.url]);

  await connection.execute(
    `
      INSERT INTO ${ATTACHMENTS_TABLE}
        (post_id, type, url)
      VALUES
        ${placeholders}
    `.trim(),
    params,
  );
}

// 게시글 첨부파일 업데이트 함수 (기존 첨부파일 삭제 후 새 첨부파일 삽입)
async function updatePostAttachments(
  connection: PoolConnection,
  postId: number,
  attachments: AttachmentItem[],
): Promise<void> {
  // 기존 첨부파일 조회 (파일 시스템에서 삭제하기 위해) - 트랜잭션 내에서 조회
  const [existingRows] = await connection.query<AttachmentRow[]>(
    `
      SELECT attachment_id, post_id, type, url
      FROM ${ATTACHMENTS_TABLE}
      WHERE post_id = ?
      ORDER BY 
        CASE type 
          WHEN 'image' THEN 1 
          WHEN 'video' THEN 2 
        END,
        attachment_id ASC
    `,
    [postId],
  );
  const existingAttachments = existingRows;
  
  // 기존 첨부파일을 파일 시스템에서 삭제
  for (const attachment of existingAttachments) {
    try {
      let filePath: string;
      
      if (attachment.type === 'image') {
        // URL에서 파일명 추출: /uploads/images/filename.jpg -> filename.jpg
        const filename = attachment.url.replace(`${UPLOAD_IMAGES_URL}/`, '');
        filePath = path.join(UPLOAD_IMAGES_DIR, filename);
      } else if (attachment.type === 'video') {
        // URL에서 파일명 추출: /uploads/videos/filename.mp4 -> filename.mp4
        const filename = attachment.url.replace(`${UPLOAD_VIDEOS_URL}/`, '');
        filePath = path.join(UPLOAD_VIDEOS_DIR, filename);
      } else {
        continue; // 알 수 없는 타입은 스킵
      }
      
      // 파일이 존재하면 삭제
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
      } catch (error) {
        // 파일이 없어도 에러로 처리하지 않음 (이미 삭제된 경우)
        // 로그만 남기고 계속 진행
        console.warn(`파일 삭제 실패 (파일이 존재하지 않을 수 있음): ${filePath}`);
      }
    } catch (error) {
      // 파일 삭제 실패해도 DB 삭제는 계속 진행
      console.error(`첨부파일 삭제 중 오류 발생: ${attachment.url}`, error);
    }
  }
  
  // DB에서 기존 첨부파일 삭제
  await connection.execute(
    `DELETE FROM ${ATTACHMENTS_TABLE} WHERE post_id = ?`,
    [postId],
  );
  
  // 새 첨부파일 삽입
  if (attachments.length > 0) {
    await insertAttachments(
      connection,
      postId,
      buildAttachmentRecords(attachments),
    );
  }
}

// 투표 삽입 함수
async function insertPoll(
  connection: PoolConnection,
  postId: number,
  poll?: PollPayload | null,
): Promise<number | null> {
  if (!poll) return null;

  // ISO 8601 형식을 MySQL datetime 형식으로 변환
  let expiredAt: string | null = null;
  if (poll.expiredAt) {
    try {
      const date = new Date(poll.expiredAt);
      if (!isNaN(date.getTime())) {
        // MySQL datetime 형식: 'YYYY-MM-DD HH:MM:SS'
        expiredAt = date.toISOString().slice(0, 19).replace('T', ' ');
      }
    } catch (error) {
      // 날짜 파싱 실패 시 null로 처리
      expiredAt = null;
    }
  }

  const [pollResult] = await connection.execute<ResultSetHeader>(
    `
      INSERT INTO ${POLLS_TABLE}
        (post_id, question, expired_at)
      VALUES
        (?, ?, ?)
    `.trim(),
    [postId, poll.question, expiredAt],
  );

  return pollResult.insertId ?? null;
}

// 투표 옵션 삽입 함수
async function insertPollOptions(
  connection: PoolConnection,
  pollId: number,
  options: string[],
): Promise<void> {
  if (!options.length) return;

  const placeholders = options.map(() => '(?, ?)').join(', ');
  const params = options.flatMap((option) => [pollId, option]);

  await connection.execute(
    `
      INSERT INTO ${POLL_OPTIONS_TABLE}
        (poll_id, option_text)
      VALUES
        ${placeholders}
    `.trim(),
    params,
  );
}

// 게시글 생성 함수 (트랜잭션 통합 함수)
export async function createPostWithRelations(
  payload: CreatePostPayload,
): Promise<CreatedPostResult> {
  const connection = await pool.getConnection();
  try {
    // 트랜잭션 시작
    await connection.beginTransaction();

    // 게시글 삽입
    const postId = await insertPost(connection, payload);

    // 게시글 태그 삽입
    await insertPostTags(connection, postId, payload.tagIds ?? []);

    // 첨부파일 삽입
    await insertAttachments(
      connection,
      postId,
      buildAttachmentRecords(payload.attachments),
    );

    // 투표가 있는 경우 투표 삽입
    if (payload.poll) {
      const pollId = await insertPoll(connection, postId, payload.poll);
      if (pollId) {
        // 투표 옵션 삽입
        await insertPollOptions(connection, pollId, payload.poll.options ?? []);
      }
    }

    await connection.commit();
    return { postId, status: 'published' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 게시글 수정 결과 타입 정의
export interface UpdatedPostResult {
  postId: number;
  status: 'edited';
}

// 게시글 삭제 결과 타입 정의
export interface DeletedPostResult {
  postId: number;
  status: 'deleted';
}

// 게시글 반응 결과 타입 정의
export interface PostReactionResult {
  postId: number;
  likesCount: number;
  dislikesCount: number;
  userReaction: 'like' | 'dislike' | null;
}

// 게시글 스크랩 결과 타입 정의
export interface PostScrapResult {
  postId: number;
  scrapCount: number;
  isScrapped: boolean;
}

// 게시글 수정 함수 (트랜잭션 통합 함수)
export async function updatePostWithRelations(
  payload: UpdatePostPayload,
  userId: number,
): Promise<UpdatedPostResult> {
  const connection = await pool.getConnection();
  try {
    // 트랜잭션 시작
    await connection.beginTransaction();

    // 게시글 존재 여부 및 소유자 확인
    const post = await findPostById(payload.postId);
    if (!post) {
      throw new Error('POST_NOT_FOUND');
    }

    if (post.user_id !== userId) {
      throw new Error('FORBIDDEN');
    }

    // 게시글 업데이트 (제공된 필드만)
    await updatePost(connection, payload);

    // 태그 업데이트 (제공된 경우)
    if (payload.tagIds !== undefined) {
      await updatePostTags(connection, payload.postId, payload.tagIds);
    }

    // 첨부파일 업데이트 (제공된 경우)
    if (payload.attachments !== undefined) {
      await updatePostAttachments(
        connection,
        payload.postId,
        payload.attachments,
      );
    }

    // 투표는 수정 불가 (기존 투표 유지)

    await connection.commit();
    return { postId: payload.postId, status: 'edited' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 게시글 삭제 함수 (트랜잭션 통합 함수)
export async function deletePostWithRelations(
  postId: number,
  userId: number,
): Promise<DeletedPostResult> {
  const connection = await pool.getConnection();
  try {
    // 트랜잭션 시작
    await connection.beginTransaction();

    // 게시글 존재 여부 및 소유자 확인
    const post = await findPostById(postId);
    if (!post) {
      throw new Error('POST_NOT_FOUND');
    }

    if (post.user_id !== userId) {
      throw new Error('FORBIDDEN');
    }

    // 투표 관련 데이터 삭제 (외래키 제약조건 순서 고려)
    // 1. poll_vote 삭제 (poll_option 참조)
    const poll = await findPollByPostId(postId);
    if (poll) {
      // poll_option의 poll_id를 통해 poll_vote 삭제
      await connection.execute(
        `
          DELETE pv FROM ${POLL_VOTES_TABLE} pv
          INNER JOIN ${POLL_OPTIONS_TABLE} po ON pv.option_id = po.option_id
          WHERE po.poll_id = ?
        `,
        [poll.poll_id],
      );

      // 2. poll_option 삭제
      await connection.execute(
        `DELETE FROM ${POLL_OPTIONS_TABLE} WHERE poll_id = ?`,
        [poll.poll_id],
      );

      // 3. poll 삭제
      await connection.execute(
        `DELETE FROM ${POLLS_TABLE} WHERE post_id = ?`,
        [postId],
      );
    }

    // 댓글 관련 데이터 삭제
    // 4. comment_reaction 삭제 (comment 참조)
    await connection.execute(
      `
        DELETE cr FROM ${COMMENT_REACTIONS_TABLE} cr
        INNER JOIN ${COMMENTS_TABLE} c ON cr.comment_id = c.comment_id
        WHERE c.post_id = ?
      `,
      [postId],
    );

    // 5. comment 삭제
    await connection.execute(
      `DELETE FROM ${COMMENTS_TABLE} WHERE post_id = ?`,
      [postId],
    );

    // 게시글 관련 데이터 삭제
    // 6. post_reaction 삭제
    await connection.execute(
      `DELETE FROM ${POST_REACTIONS_TABLE} WHERE post_id = ?`,
      [postId],
    );

    // 7. scrap 삭제
    await connection.execute(
      `DELETE FROM ${SCRAPS_TABLE} WHERE post_id = ?`,
      [postId],
    );

    // 8. 첨부파일 삭제 (파일 시스템에서도 삭제)
    // 트랜잭션 내에서 첨부파일 조회
    const [attachmentRows] = await connection.query<AttachmentRow[]>(
      `
        SELECT attachment_id, post_id, type, url
        FROM ${ATTACHMENTS_TABLE}
        WHERE post_id = ?
        ORDER BY 
          CASE type 
            WHEN 'image' THEN 1 
            WHEN 'video' THEN 2 
          END,
          attachment_id ASC
      `,
      [postId],
    );
    for (const attachment of attachmentRows) {
      try {
        let filePath: string;

        if (attachment.type === 'image') {
          const filename = attachment.url.replace(`${UPLOAD_IMAGES_URL}/`, '');
          filePath = path.join(UPLOAD_IMAGES_DIR, filename);
        } else if (attachment.type === 'video') {
          const filename = attachment.url.replace(`${UPLOAD_VIDEOS_URL}/`, '');
          filePath = path.join(UPLOAD_VIDEOS_DIR, filename);
        } else {
          continue;
        }

        // 파일이 존재하면 삭제
        try {
          await fs.access(filePath);
          await fs.unlink(filePath);
        } catch (error) {
          // 파일이 없어도 에러로 처리하지 않음
          console.warn(`파일 삭제 실패 (파일이 존재하지 않을 수 있음): ${filePath}`);
        }
      } catch (error) {
        // 파일 삭제 실패해도 DB 삭제는 계속 진행
        console.error(`첨부파일 삭제 중 오류 발생: ${attachment.url}`, error);
      }
    }

    // DB에서 첨부파일 삭제
    await connection.execute(
      `DELETE FROM ${ATTACHMENTS_TABLE} WHERE post_id = ?`,
      [postId],
    );

    // 9. post_tag 삭제
    await connection.execute(
      `DELETE FROM ${POST_TAGS_TABLE} WHERE post_id = ?`,
      [postId],
    );

    // 10. 게시글 status를 'deleted'로 변경 (soft delete)
    await connection.execute(
      `UPDATE ${POSTS_TABLE} SET status = 'deleted', updated_at = NOW() WHERE post_id = ?`,
      [postId],
    );

    await connection.commit();
    return { postId, status: 'deleted' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 게시글 상세 조회를 위한 타입 정의
export interface PostDetailRow extends RowDataPacket {
  post_id: number;
  user_id: number;
  board_id: number;
  title: string;
  content: string;
  is_anonymous: 0 | 1;
  status: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  scrap_count: number;
  view_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserRow extends RowDataPacket {
  user_id: number;
  nickname: string;
}

export interface AttachmentRow extends RowDataPacket {
  attachment_id: number;
  post_id: number;
  type: 'image' | 'video';
  url: string;
}

export interface PollRow extends RowDataPacket {
  poll_id: number;
  post_id: number;
  question: string;
  expired_at: Date | null;
}

export interface PollOptionRow extends RowDataPacket {
  option_id: number;
  poll_id: number;
  option_text: string;
  vote_count: number;
}

export interface UserVoteRow extends RowDataPacket {
  option_id: number; // poll_vote 테이블의 컬럼명
}

// 응답 타입 정의
export interface PostDetailResponse {
  id: number;
  board: {
    id: number;
    name: string;
  };
  title: string;
  content: string;
  status: string;
  author: {
    id: number;
    nickname: string;
    isMine: boolean;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  isEdited: boolean;
  counts: {
    likes: number;
    dislikes: number;
    comments: number;
    scraps: number;
  };
  tags: Array<{
    id: number;
    name: string;
  }>;
  userInteraction: {
    reaction: 'like' | 'dislike' | null;
    isScrapped: boolean;
  };
  attachments: {
    images: Array<{ url: string }>;
    videos: Array<{ url: string }>;
  };
  poll: {
    id: number;
    question: string;
    userVote: {
      selectedOptionId: number | null;
    };
    expiredAt: string | null;
    options: Array<{
      id: number;
      text: string;
      voteCount: number;
    }>;
  } | null;
  comments: Array<{
    id: number;
    content: string;
    status: string;
    isSecret: boolean;
    isBlockedByFilter: boolean;
    author: {
      id: number;
      nickname: string;
      isPostAuthor: boolean;
    };
    timestamps: {
      createdAt: string;
      updatedAt: string;
    };
    counts: {
      likes: number;
      dislikes: number;
    };
    userInteraction: {
      reaction: 'like' | 'dislike' | null;
    };
    parentCommentId: number | null;
    isEdited: boolean;
    replies: Array<any>;
  }>;
}

// 게시글 기본 정보 조회
async function findPostById(postId: number): Promise<PostDetailRow | null> {
  const sql = `
    SELECT 
      post_id,
      user_id,
      board_id,
      title,
      content,
      is_anonymous,
      status,
      like_count,
      dislike_count,
      comment_count,
      scrap_count,
      view_count,
      created_at,
      updated_at
    FROM ${POSTS_TABLE}
    WHERE post_id = ? AND status IN ('published', 'edited')
    LIMIT 1
  `;

  const [rows] = await pool.query<PostDetailRow[]>(sql, [postId]);
  return rows.length > 0 && rows[0] ? rows[0] : null;
}

// 작성자 정보 조회
async function findUserById(userId: number): Promise<UserRow | null> {
  const sql = `
    SELECT user_id, nickname
    FROM ${USERS_TABLE}
    WHERE user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<UserRow[]>(sql, [userId]);
  return rows.length > 0 && rows[0] ? rows[0] : null;
}

// 조회수 증가 (중복 방지: 간단한 메모리 기반 캐시 사용)
const viewCountCache = new Map<string, number>();
const VIEW_COUNT_CACHE_TTL = 60 * 1000; // 1분

// 조회수 증가 함수
async function incrementPostViewCount(
  postId: number,
  userId: number | null,
): Promise<void> {
  // 캐시 키 생성 (사용자별 또는 IP별)
  const cacheKey = userId ? `user:${userId}:post:${postId}` : `post:${postId}`;
  const now = Date.now();
  
  // 캐시 확인
  const lastViewTime = viewCountCache.get(cacheKey);
  if (lastViewTime && now - lastViewTime < VIEW_COUNT_CACHE_TTL) {
    // 1분 내 중복 조회는 무시
    return;
  }

  // 조회수 증가
  await pool.execute(
    `UPDATE ${POSTS_TABLE} SET view_count = view_count + 1 WHERE post_id = ?`,
    [postId],
  );

  // 캐시 업데이트
  viewCountCache.set(cacheKey, now);

  // 오래된 캐시 정리 (간단한 구현)
  if (viewCountCache.size > 10000) {
    const entries = Array.from(viewCountCache.entries());
    const expiredKeys = entries
      .filter(([_, time]) => now - time >= VIEW_COUNT_CACHE_TTL)
      .map(([key]) => key);
    expiredKeys.forEach((key) => viewCountCache.delete(key));
  }
}

// 첨부파일 조회
async function findAttachmentsByPostId(postId: number): Promise<AttachmentRow[]> {
  const sql = `
    SELECT attachment_id, post_id, type, url
    FROM ${ATTACHMENTS_TABLE}
    WHERE post_id = ?
    ORDER BY 
      CASE type 
        WHEN 'image' THEN 1 
        WHEN 'video' THEN 2 
      END,
      attachment_id ASC
  `;

  const [rows] = await pool.query<AttachmentRow[]>(sql, [postId]);
  return rows;
}

// 투표 정보 조회
async function findPollByPostId(postId: number): Promise<PollRow | null> {
  const sql = `
    SELECT poll_id, post_id, question, expired_at
    FROM ${POLLS_TABLE}
    WHERE post_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<PollRow[]>(sql, [postId]);
  return rows.length > 0 && rows[0] ? rows[0] : null;
}

// 투표 옵션 조회
async function findPollOptionsByPollId(pollId: number): Promise<PollOptionRow[]> {
  const sql = `
    SELECT option_id, poll_id, option_text, vote_count
    FROM ${POLL_OPTIONS_TABLE}
    WHERE poll_id = ?
    ORDER BY option_id ASC
  `;

  const [rows] = await pool.query<PollOptionRow[]>(sql, [pollId]);
  return rows;
}

// 사용자 투표 조회
async function findUserVote(pollId: number, userId: number | null): Promise<number | null> {
  if (!userId) return null;

  const sql = `
    SELECT pv.option_id
    FROM ${POLL_VOTES_TABLE} pv
    INNER JOIN ${POLL_OPTIONS_TABLE} po ON pv.option_id = po.option_id
    WHERE po.poll_id = ? AND pv.user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<UserVoteRow[]>(sql, [pollId, userId]);
  return rows.length > 0 && rows[0] ? rows[0].option_id : null;
}

// 게시글 반응 조회
async function findPostReaction(
  postId: number,
  userId: number | null,
): Promise<'like' | 'dislike' | null> {
  if (!userId) return null;

  const sql = `
    SELECT reaction
    FROM ${POST_REACTIONS_TABLE}
    WHERE post_id = ? AND user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [postId, userId]);
  if (rows.length === 0 || !rows[0]) return null;

  const reaction = rows[0].reaction;
  return reaction === 'like' || reaction === 'dislike' ? reaction : null;
}

// 게시글 반응 토글 함수 (트랜잭션 통합 함수)
export async function togglePostReaction(
  postId: number,
  userId: number,
  reactionType: 'like' | 'dislike',
): Promise<PostReactionResult> {
  const connection = await pool.getConnection();
  try {
    // 트랜잭션 시작
    await connection.beginTransaction();

    // 게시글 존재 여부 확인
    const post = await findPostById(postId);
    if (!post) {
      throw new Error('POST_NOT_FOUND');
    }

    // 현재 사용자의 반응 상태 확인
    const currentReaction = await findPostReaction(postId, userId);

    let newReaction: 'like' | 'dislike' | null = null;
    let likeCountDelta = 0;
    let dislikeCountDelta = 0;

    if (currentReaction === null) {
      // 현재 상태가 없음 -> 요청한 타입 추가 (INSERT)
      await connection.execute(
        `INSERT INTO ${POST_REACTIONS_TABLE} (post_id, user_id, reaction) VALUES (?, ?, ?)`,
        [postId, userId, reactionType],
      );
      newReaction = reactionType;
      if (reactionType === 'like') {
        likeCountDelta = 1;
      } else {
        dislikeCountDelta = 1;
      }
    } else if (currentReaction === reactionType) {
      // 현재 상태가 요청한 타입과 같음 -> 취소 (DELETE)
      await connection.execute(
        `DELETE FROM ${POST_REACTIONS_TABLE} WHERE post_id = ? AND user_id = ?`,
        [postId, userId],
      );
      newReaction = null;
      if (reactionType === 'like') {
        likeCountDelta = -1;
      } else {
        dislikeCountDelta = -1;
      }
    } else {
      // 현재 상태가 요청한 타입과 다름 -> 변경 (UPDATE)
      await connection.execute(
        `UPDATE ${POST_REACTIONS_TABLE} SET reaction = ? WHERE post_id = ? AND user_id = ?`,
        [reactionType, postId, userId],
      );
      newReaction = reactionType;
      // 기존 타입 카운트 -1, 새 타입 카운트 +1
      if (currentReaction === 'like') {
        likeCountDelta = -1;
        dislikeCountDelta = 1;
      } else {
        likeCountDelta = 1;
        dislikeCountDelta = -1;
      }
    }

    // posts 테이블의 카운트 업데이트
    const newLikeCount = Math.max(0, post.like_count + likeCountDelta);
    const newDislikeCount = Math.max(0, post.dislike_count + dislikeCountDelta);

    await connection.execute(
      `UPDATE ${POSTS_TABLE} SET like_count = ?, dislike_count = ? WHERE post_id = ?`,
      [newLikeCount, newDislikeCount, postId],
    );

    await connection.commit();
    return {
      postId,
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

// 스크랩 여부 조회
async function isPostScrapped(postId: number, userId: number | null): Promise<boolean> {
  if (!userId) return false;

  const sql = `
    SELECT 1
    FROM ${SCRAPS_TABLE}
    WHERE post_id = ? AND user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [postId, userId]);
  return rows.length > 0;
}

// 게시글 스크랩 토글 함수 (트랜잭션 통합 함수)
export async function togglePostScrap(
  postId: number,
  userId: number,
): Promise<PostScrapResult> {
  const connection = await pool.getConnection();
  try {
    // 트랜잭션 시작
    await connection.beginTransaction();

    // 게시글 존재 여부 확인
    const post = await findPostById(postId);
    if (!post) {
      throw new Error('POST_NOT_FOUND');
    }

    // 현재 사용자의 스크랩 상태 확인 (트랜잭션 내에서 조회)
    const [scrapRows] = await connection.query<RowDataPacket[]>(
      `
        SELECT 1
        FROM ${SCRAPS_TABLE}
        WHERE post_id = ? AND user_id = ?
        LIMIT 1
      `,
      [postId, userId],
    );
    const isCurrentlyScrapped = scrapRows.length > 0;

    let newScrapCount: number;
    let isScrapped: boolean;

    if (isCurrentlyScrapped) {
      // 현재 스크랩 있음 -> 스크랩 취소 (DELETE)
      await connection.execute(
        `DELETE FROM ${SCRAPS_TABLE} WHERE post_id = ? AND user_id = ?`,
        [postId, userId],
      );
      isScrapped = false;
      newScrapCount = Math.max(0, post.scrap_count - 1);
    } else {
      // 현재 스크랩 없음 -> 스크랩 추가 (INSERT)
      await connection.execute(
        `INSERT INTO ${SCRAPS_TABLE} (post_id, user_id) VALUES (?, ?)`,
        [postId, userId],
      );
      isScrapped = true;
      newScrapCount = post.scrap_count + 1;
    }

    // posts 테이블의 카운트 업데이트
    await connection.execute(
      `UPDATE ${POSTS_TABLE} SET scrap_count = ? WHERE post_id = ?`,
      [newScrapCount, postId],
    );

    await connection.commit();
    return {
      postId,
      scrapCount: newScrapCount,
      isScrapped,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 게시글 상세 조회 함수 (트랜잭션 통합 함수)
export async function findPostDetailById(
  postId: number,
  currentUserId: number | null,
): Promise<PostDetailResponse | null> {
  // 게시글 기본 정보 조회
  const post = await findPostById(postId);
  if (!post) return null;

  // 조회수 증가
  await incrementPostViewCount(postId, currentUserId);

  // 게시판 정보 조회
  const board = await findBoardById(post.board_id);
  if (!board) return null;

  // 작성자 정보 조회
  const authorUser = await findUserById(post.user_id);
  const authorUserId = post.user_id;
  const authorNickname = authorUser?.nickname || '사용자';

  // 태그 조회
  const tags = await findTagsByPostId(postId);

  // 첨부파일 조회
  const attachments = await findAttachmentsByPostId(postId);
  const images = attachments
    .filter((a) => a.type === 'image')
    .map((a) => ({ url: a.url }));
  const videos = attachments
    .filter((a) => a.type === 'video')
    .map((a) => ({ url: a.url }));

  // 사용자 상호작용 조회
  const reaction = await findPostReaction(postId, currentUserId);
  const isScrapped = await isPostScrapped(postId, currentUserId);

  // 투표 정보 조회
  let pollData = null;
  const poll = await findPollByPostId(postId);
  if (poll) {
    const pollOptions = await findPollOptionsByPollId(poll.poll_id);
    const userVoteOptionId = await findUserVote(poll.poll_id, currentUserId);

    pollData = {
      id: poll.poll_id,
      question: poll.question,
      userVote: {
        selectedOptionId: userVoteOptionId,
      },
      expiredAt: poll.expired_at ? poll.expired_at.toISOString() : null,
      options: pollOptions.map((option) => ({
        id: option.option_id,
        text: option.option_text,
        voteCount: option.vote_count,
      })),
    };
  }

  // 사용자 필터 키워드 조회
  const filterKeywords = currentUserId
    ? await findFilterKeywordsByUserId(currentUserId)
    : [];

  // 댓글 조회
  const comments = await findCommentsByPostId(postId, currentUserId, post.user_id);

  // 댓글 작성자 정보 조회 (한 번에 조회)
  const commentUserIds = [...new Set(comments.map((c) => c.userId))];
  const commentUsersMap = new Map<number, string>();
  if (commentUserIds.length > 0) {
    const placeholders = commentUserIds.map(() => '?').join(', ');
    const [userRows] = await pool.query<UserRow[]>(
      `SELECT user_id, nickname FROM ${USERS_TABLE} WHERE user_id IN (${placeholders})`,
      commentUserIds,
    );
    userRows.forEach((user) => {
      commentUsersMap.set(user.user_id, user.nickname);
    });
  }

  // 댓글 계층 구조 구성 및 필터링
  const commentMap = new Map<number, any>();
  const rootComments: any[] = [];

  // 비밀댓글 체크를 위한 맵 (부모가 비밀댓글이면 자식도 비밀댓글)
  const secretCommentMap = new Map<number, boolean>();

  // 먼저 모든 댓글의 비밀댓글 여부 결정
  // 최상위 댓글은 직접 isSecret 설정 가능, 대댓글은 부모를 따라감
  for (const comment of comments) {
    if (comment.parentCommentId === null) {
      // 최상위 댓글만 isSecret 설정 가능
      secretCommentMap.set(comment.id, comment.isSecret);
    } else {
      // 대댓글은 부모의 비밀댓글 여부를 따라감
      // 부모가 아직 처리되지 않았을 수 있으므로, 나중에 다시 처리
      secretCommentMap.set(comment.id, false); // 임시값
    }
  }

  // 대댓글의 비밀댓글 여부를 부모로부터 결정
  for (const comment of comments) {
    if (comment.parentCommentId !== null) {
      const parentIsSecret = secretCommentMap.get(comment.parentCommentId);
      if (parentIsSecret !== undefined) {
        // 부모가 비밀댓글이면 자식도 비밀댓글
        secretCommentMap.set(comment.id, parentIsSecret);
      }
    }
  }

  // 모든 댓글 처리
  for (const comment of comments) {
    // 댓글 삭제 체크 (status가 'deleted'인 경우)
    const isDeleted = comment.status === 'deleted';

    // 비밀댓글 여부 (이미 결정됨)
    const isSecret = secretCommentMap.get(comment.id) || false;

    // 댓글 필터링 체크
    let isBlockedByFilter = false;
    if (!isDeleted && filterKeywords.length > 0) {
      isBlockedByFilter = filterKeywords.some((keyword) =>
        comment.content.includes(keyword.name),
      );
    }

    // 댓글 작성자 정보
    const commentUserNickname = commentUsersMap.get(comment.userId) || '사용자';

    const commentReaction = await findCommentReaction(comment.id, currentUserId);

    // 댓글 수정 여부 확인 (status가 'edited'인 경우)
    const isEdited = comment.status === 'edited';

    const commentData = {
      id: comment.id,
      content: isDeleted
        ? '삭제된 댓글입니다.'
        : isBlockedByFilter
          ? '사용자 설정에 의해 차단된 댓글입니다.'
          : comment.content,
      status: comment.status,
      isSecret,
      isBlockedByFilter,
      author: {
        id: comment.userId,
        nickname: isSecret ? '익명' : commentUserNickname,
        isPostAuthor: comment.userId === post.user_id,
      },
      timestamps: {
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      },
      counts: {
        likes: comment.likesCount,
        dislikes: comment.dislikesCount,
      },
      userInteraction: {
        reaction: commentReaction,
      },
      parentCommentId: comment.parentCommentId,
      isEdited,
      replies: [] as any[],
    };

    // 비밀 댓글 권한 체크
    if (
      isSecret &&
      currentUserId !== post.user_id &&
      currentUserId !== comment.userId
    ) {
      commentData.content = '글쓴이와 댓글 작성자만 볼 수 있는 비밀 댓글입니다.';
    }

    commentMap.set(comment.id, commentData);

    // 댓글 계층 구조 구성 (최대 2단계)
    if (comment.parentCommentId === null) {
      // 최상위 댓글
      rootComments.push(commentData);
    } else {
      // 대댓글 (2단계까지만 허용)
      const parent = commentMap.get(comment.parentCommentId);
      if (parent) {
        parent.replies.push(commentData);
      }
      // 3단계 이상은 무시 (parent가 replies에 있는 경우는 이미 2단계)
    }
  }

  // 익명 처리
  const displayAuthorNickname = post.is_anonymous ? '익명' : authorNickname;

  // 게시글 수정 여부 확인
  const isEdited = post.status === 'edited';

  return {
    id: post.post_id,
    board: {
      id: board.boardId,
      name: board.name,
    },
    title: post.title,
    content: post.content,
    status: post.status,
    author: {
      id: authorUserId,
      nickname: displayAuthorNickname,
      isMine: currentUserId === post.user_id,
    },
    timestamps: {
      createdAt: new Date(post.created_at).toISOString(),
      updatedAt: new Date(post.updated_at).toISOString(),
    },
    isEdited,
    counts: {
      likes: post.like_count,
      dislikes: post.dislike_count,
      comments: post.comment_count,
      scraps: post.scrap_count,
    },
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
    })),
    userInteraction: {
      reaction,
      isScrapped,
    },
    attachments: {
      images,
      videos,
    },
    poll: pollData,
    comments: rootComments,
  };
}


