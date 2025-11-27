import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';
import { findBoardById } from './board.model';
import { findTagsByPostId } from './tag.model';
import { findCommentsByPostId, findCommentReaction, COMMENTS_TABLE, COMMENT_REACTIONS_TABLE } from './comment.model';
import { findFilterKeywordsByUserId } from './filter-keyword.model';
import { findPreferredKeywordsByUserId } from './preferred-keyword.model';
import { findAllPreferredTagsByUserId } from './preferred-tag.model';
import {
  notifyBoardSubscribers,
  notifyPostReaction,
} from '../../services/community/notification.service';
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
const BOARDS_TABLE = 'board';
const USERS_TABLE = 'user';
const TAGS_TABLE = 'tag';

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
  // TODO: 필요하다면 poll 수정 가능하도록 구현 필요
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

// 게시글 투표 결과 타입 정의
export interface PostVoteResult {
  pollId: number;
  userVote: {
    selectedOptionId: number;
  };
  results: Array<{
    id: number;
    text: string;
    voteCount: number;
  }>;
}

// 게시글 상세 조회를 위한 타입 정의
export interface PostDetailRow extends RowDataPacket {
  post_id: number;
  user_id: number;
  board_id: number;
  title: string;
  content: string;
  is_anonymous: 0 | 1;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  scrap_count: number;
  created_at: Date;
  updated_at: Date;
}

// 게시글 상세 조회를 위한 첨부파일 타입 정의
export interface AttachmentRow extends RowDataPacket {
  attachment_id: number;
  post_id: number;
  type: 'image' | 'video';
  url: string;
}

// 게시글 상세 조회를 위한 투표 정보 타입 정의
export interface PollRow extends RowDataPacket {
  poll_id: number;
  post_id: number;
  question: string;
  expired_at: Date | null;
}

// 게시글 상세 조회를 위한 투표 옵션 정보 타입 정의
export interface PollOptionRow extends RowDataPacket {
  option_id: number;
  poll_id: number;
  option_text: string;
  vote_count: number;
}

// 게시글 상세 조회를 위한 사용자 투표 정보 타입 정의
export interface UserVoteRow extends RowDataPacket {
  option_id: number;
}

// 게시글 상세 조회를 위한 응답 타입 정의
export interface PostDetailResponse {
  id: number;
  board: {
    id: number;
    name: string;
  };
  title: string;
  content: string;
  author: {
    id: number;
    nickname: string;
    isMine: boolean;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
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
    replies: Array<any>;
  }>;
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
        (user_id, board_id, title, content, is_anonymous, status)
      VALUES
        (?, ?, ?, ?, ?, 'published') 
    `.trim(), // 게시글 상태는 항상 'published'로 설정
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

// 첨부파일 형태 변환 함수 (외부 API 타입을 DB 저장 타입으로 변환)
function buildAttachmentRecords(
  attachments?: AttachmentItem[],
): Array<{ type: 'image' | 'video'; url: string }> {
  if (!attachments || !attachments.length) return [];

  return attachments.map((item) => ({
    type: item.type === 'IMAGE' ? 'image' : 'video',
    url: item.url,
  }));
}

// 첨부파일 삽입 함수(DB에 첨부파일 정보 삽입)
async function insertAttachments(
  connection: PoolConnection,
  postId: number,
  records: Array<{ type: 'image' | 'video'; url: string }>,
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

// 투표 삽입 함수(DB에 투표 정보 삽입)
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

  // DB에 투표 정보 삽입
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

// 투표 옵션 삽입 함수(DB에 투표 옵션 정보 삽입)
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

// 게시글 생성 함수 (트랜잭션 통합 함수) - 게시글, 태그, 첨부파일, 투표 관련 데이터 삽입
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

    // 첨부파일이 있는 경우 첨부파일 삽입
    if (payload.attachments && payload.attachments.length > 0) {
      await insertAttachments(
        connection,
        postId,
        buildAttachmentRecords(payload.attachments),
      );
    }

    // 투표가 있는 경우 투표 삽입
    if (payload.poll) {
      const pollId = await insertPoll(connection, postId, payload.poll);
      if (pollId) {
        // 투표 옵션 삽입
        await insertPollOptions(connection, pollId, payload.poll.options ?? []);
      }
    }

    await connection.commit();

    // 알림 발송 (트랜잭션 외부에서 실행)
    try {
      await notifyBoardSubscribers(payload.boardId, payload.userId, postId);
    } catch (error) {
      console.error('Failed to send notifications:', error);
      // 알림 실패는 게시글 생성 실패로 처리하지 않음
    }

    return { postId, status: 'published' }; 
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
    // TODO: 필요하다면 투표 수정 가능하도록 구현 필요
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
    // TODO: 댓글 기능 구현 후 검토
    // 4. comment_reaction 삭제 (comment 참조)
    await connection.execute(
      `
        DELETE cr FROM ${COMMENT_REACTIONS_TABLE} cr
        INNER JOIN ${COMMENTS_TABLE} c ON cr.comment_id = c.comment_id
        WHERE c.post_id = ?
      `,
      [postId],
    );

    // TODO: 댓글 기능 구현 후 검토
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

// 게시글 기본 정보 조회 함수(DB에서 게시글 기본 정보 조회)
async function findPostById(postId: number): Promise<PostDetailRow | null> {
  const sql = `
    SELECT 
      post_id,
      user_id,
      board_id,
      title,
      content,
      is_anonymous,
      like_count,
      dislike_count,
      comment_count,
      scrap_count,
      created_at,
      updated_at
    FROM ${POSTS_TABLE}
    WHERE post_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<PostDetailRow[]>(sql, [postId]);
  return rows.length > 0 && rows[0] ? rows[0] : null;
}

// 게시글 작성자 ID만 조회 (알림 발송용)
export async function findPostAuthorId(postId: number): Promise<number | null> {
  const sql = `
    SELECT user_id
    FROM ${POSTS_TABLE}
    WHERE post_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.query<RowDataPacket[]>(sql, [postId]);
  return rows.length > 0 && rows[0] ? rows[0].user_id : null;
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
    SELECT option_id
    FROM ${POLL_VOTES_TABLE}
    WHERE poll_id = ? AND user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<UserVoteRow[]>(sql, [pollId, userId]);
  return rows.length > 0 && rows[0] ? rows[0].option_id : null;
}

// 게시글 투표 함수 (트랜잭션 통합 함수)
export async function votePostPoll(
  postId: number,
  userId: number,
  optionId: number,
): Promise<PostVoteResult> {
  const connection = await pool.getConnection();
  try {
    // 트랜잭션 시작
    await connection.beginTransaction();

    // 게시글 존재 여부 확인
    const post = await findPostById(postId);
    if (!post) {
      throw new Error('POST_NOT_FOUND');
    }

    // 투표 존재 여부 확인
    const poll = await findPollByPostId(postId);
    if (!poll) {
      throw new Error('POLL_NOT_FOUND');
    }

    // 투표 만료 여부 확인
    if (poll.expired_at) {
      const expiredAt = new Date(poll.expired_at);
      const now = new Date();
      if (now > expiredAt) {
        throw new Error('POLL_EXPIRED');
      }
    }

    // 사용자 기존 투표 확인
    const existingVote = await findUserVote(poll.poll_id, userId);
    if (existingVote !== null) {
      throw new Error('ALREADY_VOTED');
    }

    // 투표 옵션 유효성 확인 (해당 poll_id에 속한 option_id인지)
    const [optionRows] = await connection.query<PollOptionRow[]>(
      `SELECT option_id, poll_id, option_text, vote_count FROM ${POLL_OPTIONS_TABLE} WHERE option_id = ? AND poll_id = ?`,
      [optionId, poll.poll_id],
    );

    if (optionRows.length === 0) {
      throw new Error('INVALID_OPTION');
    }

    // poll_vote 테이블에 INSERT
    await connection.execute(
      `INSERT INTO ${POLL_VOTES_TABLE} (poll_id, user_id, option_id) VALUES (?, ?, ?)`,
      [poll.poll_id, userId, optionId],
    );

    // poll_options 테이블에서 최신 vote_count 조회 (트리거로 자동 업데이트됨) - 트랜잭션 내에서 조회
    const [pollOptionRows] = await connection.query<PollOptionRow[]>(
      `
        SELECT option_id, poll_id, option_text, vote_count
        FROM ${POLL_OPTIONS_TABLE}
        WHERE poll_id = ?
        ORDER BY option_id ASC
      `,
      [poll.poll_id],
    );
    const pollOptions = pollOptionRows;

    await connection.commit();

    return {
      pollId: poll.poll_id,
      userVote: {
        selectedOptionId: optionId,
      },
      results: pollOptions.map((option) => ({
        id: option.option_id,
        text: option.option_text,
        voteCount: option.vote_count,
      })),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

    // 반응 추가 시에만 알림 발송 (취소/변경 시에는 발송하지 않음)
    if (currentReaction === null && newReaction) {
      try {
        await notifyPostReaction(postId, userId);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

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

    // 스크랩 추가 시에만 알림 발송
    if (!isCurrentlyScrapped && isScrapped) {
      try {
        await notifyPostReaction(postId, userId); // 스크랩도 반응으로 처리
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

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

// TODO: 댓글 기능 구현 후 다시 검토
// 게시글 상세 조회 함수 (트랜잭션 통합 함수)
export async function findPostDetailById(
  postId: number,
  currentUserId: number | null,
): Promise<PostDetailResponse | null> {
  // 게시글 기본 정보 조회
  const post = await findPostById(postId);
  if (!post) return null;

  // 게시판 정보 조회
  const board = await findBoardById(post.board_id);
  if (!board) return null;

  // 작성자 정보 조회 (하드코딩)
  const authorUserId = post.user_id;
  const authorNickname = '사용자';

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

  // 댓글 조회
  const comments = await findCommentsByPostId(postId, currentUserId, post.user_id);

  // 댓글 계층 구조 구성
  const commentMap = new Map<number, any>();
  const rootComments: any[] = [];

  for (const comment of comments) {
    const commentReaction = await findCommentReaction(comment.id, currentUserId);

    const commentData = {
      id: comment.id,
      content: comment.content,
      isSecret: comment.isSecret,
      isBlockedByFilter: false, // TODO: 키워드 필터 로직 구현 필요
      author: {
        id: comment.userId,
        nickname: comment.isSecret
          ? '익명'
          : '사용자',
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
      replies: [] as any[],
    };

    // 비밀 댓글 권한 체크
    if (comment.isSecret && currentUserId !== post.user_id && currentUserId !== comment.userId) {
      commentData.content = '글쓴이와 댓글 작성자만 볼 수 있는 비밀 댓글입니다.';
    }

    commentMap.set(comment.id, commentData);

    if (comment.parentCommentId === null) {
      rootComments.push(commentData);
    } else {
      const parent = commentMap.get(comment.parentCommentId);
      if (parent) {
        parent.replies.push(commentData);
      }
    }
  }

  // 익명 처리
  const displayAuthorNickname = post.is_anonymous ? '익명' : authorNickname;

  return {
    id: post.post_id,
    board: {
      id: board.boardId,
      name: board.name,
    },
    title: post.title,
    content: post.content,
    author: {
      id: authorUserId,
      nickname: displayAuthorNickname,
      isMine: currentUserId === post.user_id,
    },
    timestamps: {
      createdAt: new Date(post.created_at).toISOString(),
      updatedAt: new Date(post.updated_at).toISOString(),
    },
    counts: {
      likes: post.like_count,
      dislikes: post.dislike_count,
      comments: post.comment_count, // TODO: 댓글 생성/삭제 시 comment_count 업데이트 로직 구현 필요
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

// 게시판별 게시글 목록 조회를 위한 타입 정의
export type BoardPostSortBy = 'latest' | 'likes' | 'comments' | 'views';

// 게시판별 게시글 목록 조회를 위한 옵션 타입 정의
export interface BoardPostListOptions {
  boardId: number;
  page: number;
  pageSize: number;
  sortBy: BoardPostSortBy;
  userId?: number; // 필터 키워드 적용을 위한 사용자 ID (선택적)
}

// 게시판별 게시글 목록 Row 타입
interface BoardPostListRow extends RowDataPacket {
  post_id: number;
  title: string;
  content: string;
  is_anonymous: 0 | 1;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: Date;
  board_id: number;
  board_name: string;
  user_id: number | null;
  user_nickname: string | null;
  tag_ids: string | null; // GROUP_CONCAT 결과
  tag_names: string | null; // GROUP_CONCAT 결과
  image_url: string | null;
  video_url: string | null;
}

// 게시판별 게시글 목록 항목 타입
export interface BoardPostListItem {
  id: number;
  title: string;
  contentSnippet: string;
  board: {
    id: number;
    name: string;
  };
  recommendationReason?: {
    matchedKeywords: string[];
    matchedTags: string[];
  };
  counts: {
    likes: number;
    comments: number;
    views: number;
  };
  createdAt: string;
  author: {
    nickname: string;
  };
  tags: Array<{
    id: number;
    name: string;
  }>;
  previews: {
    imageUrl: string | null;
    videoUrl: string | null;
  };
}

// 게시판별 게시글 목록 응답 타입
export interface BoardPostListResponse {
  boardInfo: {
    id: number;
    name: string;
    description: string | null;
  };
  posts: BoardPostListItem[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalResults: number;
    totalPages: number;
  };
}

// TODO: 글자수 조정
// content의 처음 15자를 추출하는 함수
function extractContentSnippet(content: string): string {
  if (!content) return '';
  return content.length > 15 ? content.substring(0, 15) : content;
}

// tag_ids와 tag_names 문자열을 파싱하여 배열로 변환
function parseTags(tagIds: string | null, tagNames: string | null): Array<{ id: number; name: string }> {
  if (!tagIds || !tagNames) return [];
  
  const ids = tagIds.split(',').map(id => Number.parseInt(id.trim(), 10));
  const names = tagNames.split(',');
  
  return ids.map((id, index) => ({
    id,
    name: names[index]?.trim() || '',
  })).filter(tag => tag.id && tag.name);
}

// Row를 BoardPostListItem으로 변환
function toBoardPostListItem(row: BoardPostListRow): BoardPostListItem {
  return {
    id: row.post_id,
    title: row.title,
    contentSnippet: extractContentSnippet(row.content),
    board: {
      id: row.board_id,
      name: row.board_name,
    },
    counts: {
      likes: row.like_count,
      comments: row.comment_count, // TODO: 댓글 생성/삭제 시 comment_count 업데이트 로직 구현 필요
      views: row.view_count,
    },
    createdAt: new Date(row.created_at).toISOString(),
    author: {
      nickname: row.is_anonymous ? '익명' : (row.user_nickname || '익명'),
    },
    tags: parseTags(row.tag_ids, row.tag_names),
    previews: {
      imageUrl: row.image_url || null,
      videoUrl: row.video_url || null,
    },
  };
}

// 게시판별 게시글 목록 조회 함수
export async function findPostsByBoardId(
  options: BoardPostListOptions,
): Promise<BoardPostListResponse> {
  const { boardId, page, pageSize, sortBy, userId } = options;
  const offset = (page - 1) * pageSize;

  // 게시판 정보 조회
  const board = await findBoardById(boardId);
  if (!board) {
    throw new Error('BOARD_NOT_FOUND');
  }

  // 추천 게시판 (board_id = 2) 특별 처리
  // TODO: 하드 코딩 수정
  if (boardId === 2) {
    if (!userId) {
      // userId가 없으면 빈 결과 반환
      return {
        boardInfo: {
          id: board.boardId,
          name: board.name,
          description: board.description,
        },
        posts: [],
        pagination: {
          currentPage: page,
          pageSize,
          totalResults: 0,
          totalPages: 0,
        },
      };
    }

    // 선호 키워드 조회
    const preferredKeywords = await findPreferredKeywordsByUserId(userId);
    // 모든 선호 태그 조회
    const preferredTags = await findAllPreferredTagsByUserId(userId);

    // 선호 키워드/태그가 없으면 빈 결과 반환
    if (preferredKeywords.length === 0 && preferredTags.length === 0) {
      return {
        boardInfo: {
          id: board.boardId,
          name: board.name,
          description: board.description,
        },
        posts: [],
        pagination: {
          currentPage: page,
          pageSize,
          totalResults: 0,
          totalPages: 0,
        },
      };
    }

    // 사용자의 필터 키워드 조회
    const filterKeywordsWithId = await findFilterKeywordsByUserId(userId);
    const filterKeywords = filterKeywordsWithId.map((k) => k.name);

    // 필터 키워드 제외 조건 생성
    let filterKeywordConditions = '';
    const filterParams: any[] = [];
    if (filterKeywords.length > 0) {
      const conditions: string[] = [];
      for (const keyword of filterKeywords) {
        const keywordPattern = `%${keyword}%`;
        conditions.push('(p.title NOT LIKE ? AND p.content NOT LIKE ?)');
        filterParams.push(keywordPattern, keywordPattern);
      }
      if (conditions.length > 0) {
        filterKeywordConditions = `AND ${conditions.join(' AND ')}`;
      }
    }

    // 선호 키워드 매칭 조건 생성
    let preferredKeywordConditions = '';
    const preferredKeywordParams: any[] = [];
    if (preferredKeywords.length > 0) {
      const conditions: string[] = [];
      for (const keyword of preferredKeywords) {
        const keywordPattern = `%${keyword.name}%`;
        conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
        preferredKeywordParams.push(keywordPattern, keywordPattern);
      }
      if (conditions.length > 0) {
        preferredKeywordConditions = `(${conditions.join(' OR ')})`;
      }
    }

    // 선호 태그 매칭 조건 생성
    let preferredTagConditions = '';
    const preferredTagParams: any[] = [];
    if (preferredTags.length > 0) {
      const preferredTagIds = preferredTags.map((tag: { id: number; name: string }) => tag.id);
      const placeholders = preferredTagIds.map(() => '?').join(', ');
      preferredTagConditions = `pt.tag_id IN (${placeholders})`;
      preferredTagParams.push(...preferredTagIds);
    }

    // 키워드 또는 태그 매칭 조건 결합
    let matchingConditions = '';
    if (preferredKeywordConditions && preferredTagConditions) {
      matchingConditions = `AND (${preferredKeywordConditions} OR ${preferredTagConditions})`;
    } else if (preferredKeywordConditions) {
      matchingConditions = `AND ${preferredKeywordConditions}`;
    } else if (preferredTagConditions) {
      matchingConditions = `AND ${preferredTagConditions}`;
    }

    // 정렬 조건 생성
    let orderBy = '';
    if (sortBy === 'likes') {
      orderBy = 'ORDER BY p.like_count DESC, p.created_at DESC';
    } else if (sortBy === 'comments') {
      orderBy = 'ORDER BY p.comment_count DESC, p.created_at DESC';
    } else if (sortBy === 'views') {
      orderBy = 'ORDER BY p.view_count DESC, p.created_at DESC';
    } else {
      // latest (default)
      orderBy = 'ORDER BY p.created_at DESC';
    }

    // 추천 게시판 조회 쿼리 (board_id 조건 제거, 여러 게시판의 게시글 포함)
    // TODO: 성능 문제 개선
    const sql = `
      SELECT DISTINCT
        p.post_id,
        p.title,
        p.content,
        p.is_anonymous,
        p.like_count,
        p.comment_count, -- TODO: 댓글 생성/삭제 시 comment_count 업데이트 로직 구현 필요
        p.view_count,
        p.created_at,
        b.board_id,
        b.name AS board_name,
        u.user_id,
        u.nickname AS user_nickname,
        GROUP_CONCAT(DISTINCT t.tag_id ORDER BY t.tag_id) AS tag_ids,
        GROUP_CONCAT(DISTINCT t.name ORDER BY t.tag_id) AS tag_names,
        (SELECT url FROM ${ATTACHMENTS_TABLE} WHERE post_id = p.post_id AND type = 'image' LIMIT 1) AS image_url,
        (SELECT url FROM ${ATTACHMENTS_TABLE} WHERE post_id = p.post_id AND type = 'video' LIMIT 1) AS video_url
      FROM ${POSTS_TABLE} AS p
      LEFT JOIN ${BOARDS_TABLE} AS b ON p.board_id = b.board_id
      LEFT JOIN ${USERS_TABLE} AS u ON p.user_id = u.user_id
      LEFT JOIN ${POST_TAGS_TABLE} AS pt ON p.post_id = pt.post_id
      LEFT JOIN ${TAGS_TABLE} AS t ON pt.tag_id = t.tag_id
      WHERE p.status IN ('published', 'edited')
        ${matchingConditions}
        ${filterKeywordConditions}
      GROUP BY p.post_id
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    // 쿼리 파라미터 구성
    const queryParams: any[] = [];
    queryParams.push(...preferredKeywordParams);
    queryParams.push(...preferredTagParams);
    queryParams.push(...filterParams);
    queryParams.push(pageSize, offset);

    const [rows] = await pool.query<BoardPostListRow[]>(sql, queryParams);
    
    // 매칭 정보 수집 (애플리케이션 레벨)
    const postsWithRecommendation = rows.map((row) => {
      const post = toBoardPostListItem(row);
      
      // 매칭된 키워드 찾기
      const matchedKeywords: string[] = [];
      if (row.title && row.content) {
        for (const keyword of preferredKeywords) {
          if (
            row.title.includes(keyword.name) ||
            row.content.includes(keyword.name)
          ) {
            matchedKeywords.push(keyword.name);
          }
        }
      }

      // 매칭된 태그 찾기
      const matchedTags: string[] = [];
      if (row.tag_names) {
        const postTagNames = row.tag_names.split(',').map((name) => name.trim());
        for (const preferredTag of preferredTags) {
          if (postTagNames.includes(preferredTag.name)) {
            matchedTags.push(preferredTag.name);
          }
        }
      }

      // recommendationReason 추가
      if (matchedKeywords.length > 0 || matchedTags.length > 0) {
        post.recommendationReason = {
          matchedKeywords,
          matchedTags,
        };
      }

      return post;
    });

    // 총 게시글 수 계산
    const countSql = `
      SELECT COUNT(DISTINCT p.post_id) AS total
      FROM ${POSTS_TABLE} AS p
      LEFT JOIN ${POST_TAGS_TABLE} AS pt ON p.post_id = pt.post_id
      WHERE p.status IN ('published', 'edited')
        ${matchingConditions}
        ${filterKeywordConditions}
    `;

    const countParams: any[] = [];
    countParams.push(...preferredKeywordParams);
    countParams.push(...preferredTagParams);
    countParams.push(...filterParams);

    const [countRows] = await pool.query<RowDataPacket[]>(countSql, countParams);
    const totalResults = (countRows[0]?.total as number) || 0;
    const totalPages = Math.ceil(totalResults / pageSize);

    return {
      boardInfo: {
        id: board.boardId,
        name: board.name,
        description: board.description,
      },
      posts: postsWithRecommendation,
      pagination: {
        currentPage: page,
        pageSize,
        totalResults,
        totalPages,
      },
    };
  }

  // 일반 게시판 처리 (기존 로직)
  // 사용자의 필터 키워드 조회 (userId가 있는 경우)
  let filterKeywords: string[] = [];
  if (userId) {
    const filterKeywordsWithId = await findFilterKeywordsByUserId(userId);
    filterKeywords = filterKeywordsWithId.map((k) => k.name);
  }

  // 필터 키워드 제외 조건 생성
  // TODO: 성능 문제 발생 가능
  let filterKeywordConditions = '';
  const filterParams: any[] = [];
  if (filterKeywords.length > 0) {
    // 각 필터 키워드에 대해 제목과 내용에서 제외
    const conditions: string[] = [];
    for (const keyword of filterKeywords) {
      const keywordPattern = `%${keyword}%`;
      conditions.push('(p.title NOT LIKE ? AND p.content NOT LIKE ?)');
      filterParams.push(keywordPattern, keywordPattern);
    }
    if (conditions.length > 0) {
      filterKeywordConditions = `AND ${conditions.join(' AND ')}`;
    }
  }

  // 게시판별 필터 조건 적용(HOT/BEST 게시판 필터 조건 적용)
  // TODO: 하드 코딩 수정
  let boardFilterCondition = '';
  let boardIdCondition = 'WHERE p.board_id = ?'; // 기본: 특정 게시판만 조회
  if (boardId === 3) {
    // HOT/BEST 게시판: 여러 게시판의 게시글 중 like_count >= 10인 것만 조회
    boardFilterCondition = 'AND p.like_count >= 10';
    boardIdCondition = 'WHERE 1 = 1'; // board_id 조건 제거
  }

  // 사용자별 게시판 필터 조건 적용
  // TODO: 하드 코딩 수정
  let userBoardJoinCondition = '';
  let userBoardWhereCondition = '';
  
  if (boardId === 83) {
    // 내가 쓴 게시글만 조회 (여러 게시판의 게시글 포함)
    boardIdCondition = 'WHERE 1 = 1'; // board_id 조건 제거
    if (!userId) {
      // userId가 없으면 빈 결과 반환
      userBoardWhereCondition = 'AND 1 = 0'; // 항상 false 조건
    } else {
      userBoardWhereCondition = 'AND p.user_id = ?';
    }
  } else if (boardId === 84) {
    // 내가 스크랩한 게시글 조회 (여러 게시판의 게시글 포함)
    boardIdCondition = 'WHERE 1 = 1'; // board_id 조건 제거
    if (!userId) {
      userBoardWhereCondition = 'AND 1 = 0';
    } else {
      userBoardJoinCondition = `INNER JOIN ${SCRAPS_TABLE} AS s ON p.post_id = s.post_id AND s.user_id = ?`;
    }
  } else if (boardId === 85) {
    // 내가 좋아요한 게시글 조회 (여러 게시판의 게시글 포함)
    boardIdCondition = 'WHERE 1 = 1'; // board_id 조건 제거
    if (!userId) {
      userBoardWhereCondition = 'AND 1 = 0';
    } else {
      userBoardJoinCondition = `INNER JOIN ${POST_REACTIONS_TABLE} AS pr ON p.post_id = pr.post_id AND pr.user_id = ? AND pr.reaction = 'like'`;
    }
  } else if (boardId === 86) {
    // 내가 댓글단 게시글 조회 (여러 게시판의 게시글 포함)
    boardIdCondition = 'WHERE 1 = 1'; // board_id 조건 제거
    if (!userId) {
      userBoardWhereCondition = 'AND 1 = 0';
    } else {
      userBoardJoinCondition = `INNER JOIN ${COMMENTS_TABLE} AS c ON p.post_id = c.post_id AND c.user_id = ?`;
    }
  }

  // 정렬 조건 생성
  let orderBy = '';
  if (sortBy === 'likes') {
    orderBy = 'ORDER BY p.like_count DESC, p.created_at DESC';
  } else if (sortBy === 'comments') {
    orderBy = 'ORDER BY p.comment_count DESC, p.created_at DESC';
  } else if (sortBy === 'views') {
    orderBy = 'ORDER BY p.view_count DESC, p.created_at DESC';
  } else {
    // latest (default)
    orderBy = 'ORDER BY p.created_at DESC';
  }

  // 메인 조회 쿼리
  // TODO: 성능 문제 발생 가능
  const sql = `
    SELECT
      p.post_id,
      p.title,
      p.content,
      p.is_anonymous,
      p.like_count,
      p.comment_count, -- TODO: 댓글 생성/삭제 시 comment_count 업데이트 로직 구현 필요
      p.view_count,
      p.created_at,
      b.board_id,
      b.name AS board_name,
      u.user_id,
      u.nickname AS user_nickname,
      GROUP_CONCAT(DISTINCT t.tag_id ORDER BY t.tag_id) AS tag_ids,
      GROUP_CONCAT(DISTINCT t.name ORDER BY t.tag_id) AS tag_names,
      (SELECT url FROM ${ATTACHMENTS_TABLE} WHERE post_id = p.post_id AND type = 'image' LIMIT 1) AS image_url,
      (SELECT url FROM ${ATTACHMENTS_TABLE} WHERE post_id = p.post_id AND type = 'video' LIMIT 1) AS video_url
    FROM ${POSTS_TABLE} AS p
    LEFT JOIN ${BOARDS_TABLE} AS b ON p.board_id = b.board_id
    LEFT JOIN ${USERS_TABLE} AS u ON p.user_id = u.user_id
    LEFT JOIN ${POST_TAGS_TABLE} AS pt ON p.post_id = pt.post_id
    LEFT JOIN ${TAGS_TABLE} AS t ON pt.tag_id = t.tag_id
    ${userBoardJoinCondition}
    ${boardIdCondition}
      AND p.status IN ('published', 'edited')
      ${filterKeywordConditions}
      ${boardFilterCondition}
      ${userBoardWhereCondition}
    GROUP BY p.post_id
    ${orderBy}
    LIMIT ? OFFSET ?
  `;

  // 게시글 목록 조회 - 쿼리 파라미터 구성
  const queryParams: any[] = [];
  
  // board_id 조건이 필요한 경우 (일반 게시판)
  if (boardId !== 3 && boardId !== 83 && boardId !== 84 && boardId !== 85 && boardId !== 86) {
    queryParams.push(boardId);
  }
  
  // JOIN 조건에 userId가 필요한 경우 파라미터 추가
  if (boardId === 84 || boardId === 85 || boardId === 86) {
    if (userId) {
      queryParams.push(userId);
    }
  }
  
  // 필터 키워드 파라미터 추가
  queryParams.push(...filterParams);
  
  // WHERE 조건에 userId가 필요한 경우 (board_id = 83)
  // TODO: 하드 코딩 수정
  if (boardId === 83 && userId) {
    queryParams.push(userId);
  }
  
  // 페이지네이션 파라미터 추가
  queryParams.push(pageSize, offset);
  const [rows] = await pool.query<BoardPostListRow[]>(sql, queryParams);
  const posts = rows.map(toBoardPostListItem);

  // 총 게시글 수 계산
  const countSql = `
    SELECT COUNT(DISTINCT p.post_id) AS total
    FROM ${POSTS_TABLE} AS p
    ${userBoardJoinCondition}
    ${boardIdCondition}
      AND p.status IN ('published', 'edited')
      ${filterKeywordConditions}
      ${boardFilterCondition}
      ${userBoardWhereCondition}
  `;

  // COUNT 쿼리 파라미터 구성
  const countParams: any[] = [];
  
  // board_id 조건이 필요한 경우 (일반 게시판)
  if (boardId !== 3 && boardId !== 83 && boardId !== 84 && boardId !== 85 && boardId !== 86) {
    countParams.push(boardId);
  }
  
  // JOIN 조건에 userId가 필요한 경우 파라미터 추가
  if (boardId === 84 || boardId === 85 || boardId === 86) {
    if (userId) {
      countParams.push(userId);
    }
  }
  
  // 필터 키워드 파라미터 추가
  countParams.push(...filterParams);
  
  // WHERE 조건에 userId가 필요한 경우 (board_id = 83)
  // TODO: 하드 코딩 수정
  if (boardId === 83 && userId) {
    countParams.push(userId);
  }
  const [countRows] = await pool.query<RowDataPacket[]>(countSql, countParams);
  const totalResults = (countRows[0]?.total as number) || 0;
  const totalPages = Math.ceil(totalResults / pageSize);

  return {
    boardInfo: {
      id: board.boardId,
      name: board.name,
      description: board.description,
    },
    posts,
    pagination: {
      currentPage: page,
      pageSize,
      totalResults,
      totalPages,
    },
  };
}


