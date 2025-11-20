import type { Request, Response, NextFunction } from 'express';
import { findBoardById } from '../../models/community/board.model';
import type {
  AttachmentPayload,
  PollPayload,
} from '../../models/community/post.model';
import { createPostWithRelations, findPostDetailById } from '../../models/community/post.model';

// 요청 객체에 사용자 정보 추가
interface RequestWithUser extends Request {
  user?: { id?: number };
}

// 게시물 생성 요청 본문(바디) 데이터 필드 정의
interface CreatePostBody {
  title?: string;
  content?: string;
  isAnonymous?: boolean;
  tagIds?: unknown;
  attachments?: AttachmentPayload;
  poll?: PollPayload | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidBoardId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// 태그 ID 목록 검사 및 정제
function parseTagIds(raw: unknown): number[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;

  const parsed: number[] = [];
  for (const tagId of raw) {
    if (typeof tagId !== 'number' || !Number.isInteger(tagId) || tagId <= 0) {
      return null;
    }
    parsed.push(tagId);
  }
  return parsed;
}

// 첨부파일 정리
function normalizeAttachments(
  attachments?: AttachmentPayload,
): AttachmentPayload | undefined {
  if (!attachments) return undefined;

  const normalized: AttachmentPayload = {};
  if (Array.isArray(attachments.images)) {
    normalized.images = attachments.images.filter(
      (url): url is string => typeof url === 'string' && url.trim().length > 0,
    );
  }

  if (
    attachments.video &&
    typeof attachments.video === 'string' &&
    attachments.video.trim().length > 0
  ) {
    normalized.video = attachments.video;
  }

  if (!normalized.images?.length && !normalized.video) {
    return undefined;
  }
  return normalized;
}


function normalizePoll(poll?: PollPayload | null): PollPayload | null {
  if (!poll) return null;

  if (!isNonEmptyString(poll.question)) {
    return null;
  }

  if (!Array.isArray(poll.options) || poll.options.length < 2) {
    return null;
  }

  const options = poll.options
    .map((option) => (typeof option === 'string' ? option.trim() : ''))
    .filter((option) => option.length > 0);

  if (options.length < 2) {
    return null;
  }

  return {
    question: poll.question.trim(),
    options,
  };
}

// 게시물 생성
// - 게시물 정보를 받아서 게시물을 생성하는 HTTP 핸들러
export async function createPost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 게시판 ID 파라미터 추출 및 검증
    const boardId = Number.parseInt(req.params.boardId ?? '', 10);

    if (!isValidBoardId(boardId)) {
        // 게시판 ID 유효성 검사 실패 시 400 응답
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시판 ID입니다.',
          code: 'INVALID_BOARD_ID',
        },
        meta: null,
      });
      return;
    }

    // 게시판 존재 여부 확인 (DB 조회회)
    const board = await findBoardById(boardId);

    if (!board) {
        // 게시판 존재 여부 확인 실패 시 404 응답
      res.status(404).json({
        data: null,
        error: {
          message: '해당 ID의 게시판을 찾을 수 없습니다.',
          code: 'BOARD_NOT_FOUND',
        },
        meta: null,
      });
      return;
    }

    // 필수 필드 (제목, 내용) 검사
    if (!isRecord(req.body)) {
      res.status(400).json({
        data: null,
        error: {
          message: '요청 본문이 필요합니다.',
          code: 'EMPTY_REQUEST_BODY',
        },
        meta: null,
      });
      return;
    }

    const body = req.body as CreatePostBody;
    const { title, content } = body;

    if (!isNonEmptyString(title) || !isNonEmptyString(content)) {
        // 제목 또는 내용 누락 시 400 응답
        res.status(400).json({
        data: null,
        error: {
          message: '제목과 내용은 필수입니다.',
          code: 'INVALID_REQUEST_BODY',
        },
        meta: null,
      });
      return;
    }

    // 태그 ID 목록 검사
    const tagIds = parseTagIds(body.tagIds);
    if (tagIds === null) {
        // 태그 ID 목록 유효성 실패 시 400 응답
      res.status(400).json({
        data: null,
        error: {
          message: '태그 ID 목록이 유효하지 않습니다.',
          code: 'INVALID_TAG_IDS',
        },
        meta: null,
      });
      return;
    }

    // 첨부파일 정리
    const attachments = normalizeAttachments(body.attachments);
    
    // 투표 정보 정리 및 검사
    const poll = body.poll ? normalizePoll(body.poll) : null;
    if (body.poll && !poll) {
        // 투표 정보 유효성 실패 시 400 응답
      res.status(400).json({
        data: null,
        error: {
          message: '투표 정보가 유효하지 않습니다.',
          code: 'INVALID_POLL_PAYLOAD',
        },
        meta: null,
      });
      return;
    }

    const requestWithUser = req as RequestWithUser;
    // TODO: 인증 로직 연동 필요
    const userId =
      typeof requestWithUser.user?.id === 'number'
        ? requestWithUser.user.id
        : 1;

    //모델 함수 호출: 유효성 검사가 끝난 데이터를 모델 레이어로 전달    
    const result = await createPostWithRelations({
      userId,
      boardId,
      title: title.trim(),
      content: content.trim(),
      isAnonymous: typeof body.isAnonymous === 'boolean' ? body.isAnonymous : true,
      tagIds,
      attachments,
      poll,
    });

    const location = `/boards/${boardId}/posts/${result.postId}`;

    // 게시물 생성 성공 시 201 응답
    res.status(201).location(location).json({
      data: {
        postId: result.postId,
        message: '게시물이 성공적으로 작성되었습니다.',
        status: result.status,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
}

// 게시글 상세 조회
// - 게시글 ID를 받아서 게시글 상세 정보를 반환하는 HTTP 핸들러
export async function getPostDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 게시글 ID 파라미터 추출 및 검증
    const postId = Number.parseInt(req.params.postId ?? '', 10);

    if (!Number.isInteger(postId) || postId <= 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시글 ID입니다.',
          code: 'INVALID_POST_ID',
        },
        meta: null,
      });
      return;
    }

    const requestWithUser = req as RequestWithUser;
    // TODO: 인증 로직 연동 필요
    const currentUserId =
      typeof requestWithUser.user?.id === 'number'
        ? requestWithUser.user.id
        : null;

    // 게시글 상세 정보 조회
    const postDetail = await findPostDetailById(postId, currentUserId);

    if (!postDetail) {
      res.status(404).json({
        data: null,
        error: {
          message: '해당 ID의 게시글을 찾을 수 없습니다.',
          code: 'POST_NOT_FOUND',
        },
        meta: null,
      });
      return;
    }

    // 게시글 상세 조회 성공 시 200 응답
    res.status(200).json({
      data: postDetail,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}


