import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';
import { findBoardById } from './board.model';
import { findTagsByPostId } from './tag.model';
import { findCommentsByPostId, findCommentReaction } from './comment.model';

const POSTS_TABLE = 'post';
const POST_TAGS_TABLE = 'post_tag';
const ATTACHMENTS_TABLE = 'attachment';
const POLLS_TABLE = 'poll';
const POLL_OPTIONS_TABLE = 'poll_option';
const POST_REACTIONS_TABLE = 'post_reaction';
const SCRAPS_TABLE = 'scrap';
const USER_VOTES_TABLE = 'user_vote';

// 첨부파일 입력 타입 정의
export interface AttachmentPayload {
  images?: string[];
  video?: string | null;
}

// 투표 입력 타입 정의
export interface PollPayload {
  question: string;
  options: string[];
}

// 게시물 생성 요청 페이로드 타입 정의
export interface CreatePostPayload {
  userId: number;
  boardId: number;
  title: string;
  content: string;
  isAnonymous: boolean;
  tagIds?: number[];
  attachments?: AttachmentPayload | undefined;
  poll?: PollPayload | null | undefined;
}

// 게시물 생성 결과 타입 정의
export interface CreatedPostResult {
  postId: number;
  status: 'published';
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

type AttachmentType = 'image' | 'video';

interface AttachmentRecord {
  type: AttachmentType;
  url: string;
}

// 첨부파일 형태 변환 함수
function buildAttachmentRecords(
  attachments?: AttachmentPayload,
): AttachmentRecord[] {
  if (!attachments) return [];

  const records: AttachmentRecord[] = [];
  if (attachments.images?.length) {
    for (const url of attachments.images) {
      records.push({ type: 'image', url });
    }
  }

  if (attachments.video) {
    records.push({ type: 'video', url: attachments.video });
  }

  return records;
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

// 투표 삽입 함수
async function insertPoll(
  connection: PoolConnection,
  postId: number,
  poll?: PollPayload | null,
): Promise<number | null> {
  if (!poll) return null;

  const [pollResult] = await connection.execute<ResultSetHeader>(
    `
      INSERT INTO ${POLLS_TABLE}
        (post_id, question)
      VALUES
        (?, ?)
    `.trim(),
    [postId, poll.question],
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
}

export interface PollOptionRow extends RowDataPacket {
  option_id: number;
  poll_id: number;
  option_text: string;
  vote_count: number;
}

export interface UserVoteRow extends RowDataPacket {
  poll_option_id: number; // user_vote 테이블의 컬럼명
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
    SELECT poll_id, post_id, question
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
    SELECT poll_option_id
    FROM ${USER_VOTES_TABLE}
    WHERE poll_id = ? AND user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<UserVoteRow[]>(sql, [pollId, userId]);
  return rows.length > 0 && rows[0] ? rows[0].poll_option_id : null;
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

// 게시글 상세 조회 함수 (트랜잭션 통합 함수수)
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


