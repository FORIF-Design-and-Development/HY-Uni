import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import { findBoardById } from '../../models/community/board.model';
import type {
  AttachmentItem,
  PollPayload,
} from '../../models/community/post.model';
import {
  createPostWithRelations,
  findPostDetailById,
  updatePostWithRelations,
  deletePostWithRelations,
  togglePostReaction,
  togglePostScrap,
} from '../../models/community/post.model';

// 게시물 생성 요청 본문(바디) 데이터 필드 정의
interface CreatePostBody {
  title?: string;
  content?: string;
  isAnonymous?: boolean;
  tagIds?: unknown;
  attachments?: AttachmentItem[];
  poll?: PollPayload | null;
}

// 게시물 수정 요청 본문(바디) 데이터 필드 정의
interface UpdatePostBody {
  title?: string;
  content?: string;
  isAnonymous?: boolean;
  tagIds?: unknown;
  attachments?: AttachmentItem[];
  // poll은 수정 불가
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

// 첨부파일 정리 및 검증
function normalizeAttachments(
  attachments?: unknown,
): AttachmentItem[] | undefined {
  // 배열 검증
  if (!Array.isArray(attachments)) return undefined;

  const normalized: AttachmentItem[] = [];
  let imageCount = 0;
  let videoCount = 0;

  for (const item of attachments) {
    // 객체 검증
    if (!isRecord(item)) continue;

    const type = item.type;
    const url = item.url;

    if (typeof url !== 'string' || url.trim().length === 0) continue; // url 검증

    if (type === 'IMAGE') {
      if (imageCount < 5) { // 이미지 개수 제한
        normalized.push({ type: 'IMAGE', url: url.trim() });
        imageCount++;
      }
    } else if (type === 'VIDEO') {
      if (videoCount < 1) { // 비디오 개수 제한
        normalized.push({ type: 'VIDEO', url: url.trim() });
        videoCount++;
      }
    }
  }

  return normalized.length > 0 ? normalized : undefined;
}


function normalizePoll(poll?: PollPayload | null): PollPayload | null {
  if (!poll) return null;

  if (!isNonEmptyString(poll.question)) {
    return null;
  }

  if (!Array.isArray(poll.options) || poll.options.length < 2) {
    return null;
  }

  // 옵션 개수 제한 (최대 5개)
  if (poll.options.length > 5) {
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
    expiredAt: poll.expiredAt ?? null,
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
    // TODO: JWT 토큰 추출 로직을 미들웨어로 리팩토링 예정
    // Authorization 헤더에서 JWT 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        data: null,
        error: {
          message: '인증 토큰이 필요합니다.',
          code: 'MISSING_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Bearer 토큰 추출
    const token = authHeader.substring(7); // 'Bearer ' 제거

    // 토큰 검증 및 user_id 추출
    // TODO: middleware로 refactoring
    let userId: number;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.userId;
    } catch (error) {
      res.status(401).json({
        data: null,
        error: {
          message: '유효하지 않은 인증 토큰입니다.',
          code: 'INVALID_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

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

    // 제목 길이 제한 (100자)
    if (title.length > 100) {
      res.status(400).json({
        data: null,
        error: {
          message: '제목은 최대 100자까지 입력 가능합니다.',
          code: 'INVALID_INPUT_VALUE',
        },
        meta: null,
      });
      return;
    }

    // 본문 길이 제한 (500자)
    if (content.length > 500) {
      res.status(400).json({
        data: null,
        error: {
          message: '본문은 최대 500자까지 입력 가능합니다.',
          code: 'INVALID_INPUT_VALUE',
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

    // 태그 개수 제한 (5개)
    if (tagIds.length > 5) {
      res.status(400).json({
        data: null,
        error: {
          message: '태그는 최대 5개까지만 설정 가능합니다.',
          code: 'INVALID_INPUT_VALUE',
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

    //모델 함수 호출: 유효성 검사가 끝난 데이터를 모델 레이어로 전달    
    const result = await createPostWithRelations({
      userId,
      boardId,
      title: title.trim(),
      content: content.trim(),
      isAnonymous: typeof body.isAnonymous === 'boolean' ? body.isAnonymous : true,
      tagIds,
      attachments: attachments ?? [],
      poll,
    });

    const location = `/posts/${result.postId}`;

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

// 게시글 수정
// - 게시글 정보를 받아서 게시글을 수정하는 HTTP 핸들러
export async function updatePost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: JWT 토큰 추출 로직을 미들웨어로 리팩토링 예정
    // Authorization 헤더에서 JWT 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        data: null,
        error: {
          message: '인증 토큰이 필요합니다.',
          code: 'MISSING_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Bearer 토큰 추출
    const token = authHeader.substring(7); // 'Bearer ' 제거

    // 토큰 검증 및 user_id 추출
    // TODO: middleware로 refactoring
    let userId: number;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.userId;
    } catch (error) {
      res.status(401).json({
        data: null,
        error: {
          message: '유효하지 않은 인증 토큰입니다.',
          code: 'INVALID_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 게시글 ID 파라미터 추출 및 검증
    const postId = Number.parseInt(req.params.postId ?? '', 10);

    if (!Number.isInteger(postId) || postId <= 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시글 ID입니다.',
          code: 'INVALID_POST_ID',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 필수 필드 검사 (요청 본문이 있는지 확인)
    if (!isRecord(req.body)) {
      res.status(400).json({
        data: null,
        error: {
          message: '요청 본문이 필요합니다.',
          code: 'EMPTY_REQUEST_BODY',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const body = req.body as UpdatePostBody;

    // 제목 검증 (제공된 경우)
    if (body.title !== undefined) {
      if (!isNonEmptyString(body.title)) {
        res.status(400).json({
          data: null,
          error: {
            message: '제목은 필수입니다.',
            code: 'INVALID_REQUEST_BODY',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // 제목 길이 제한 (100자)
      if (body.title.length > 100) {
        res.status(400).json({
          data: null,
          error: {
            message: '제목은 최대 100자까지 입력 가능합니다.',
            code: 'INVALID_INPUT_VALUE',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    // 본문 검증 (제공된 경우)
    if (body.content !== undefined) {
      if (!isNonEmptyString(body.content)) {
        res.status(400).json({
          data: null,
          error: {
            message: '내용은 필수입니다.',
            code: 'INVALID_REQUEST_BODY',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // 본문 길이 제한 (500자)
      if (body.content.length > 500) {
        res.status(400).json({
          data: null,
          error: {
            message: '본문은 최대 500자까지 입력 가능합니다.',
            code: 'INVALID_INPUT_VALUE',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    // 태그 ID 목록 검사 (제공된 경우)
    let tagIds: number[] | undefined = undefined;
    if (body.tagIds !== undefined) {
      const parsedTagIds = parseTagIds(body.tagIds);
      if (parsedTagIds === null) {
        res.status(400).json({
          data: null,
          error: {
            message: '태그 ID 목록이 유효하지 않습니다.',
            code: 'INVALID_TAG_IDS',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // 태그 개수 제한 (5개)
      if (parsedTagIds.length > 5) {
        res.status(400).json({
          data: null,
          error: {
            message: '태그는 최대 5개까지만 설정 가능합니다.',
            code: 'INVALID_INPUT_VALUE',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      tagIds = parsedTagIds;
    }

    // 첨부파일 정리 (제공된 경우)
    let attachments: AttachmentItem[] | undefined = undefined;
    if (body.attachments !== undefined) {
      // 빈 배열도 명시적으로 처리 (기존 파일 삭제를 위해)
      if (Array.isArray(body.attachments) && body.attachments.length === 0) {
        attachments = [];
      } else {
        const normalizedAttachments = normalizeAttachments(body.attachments);
        attachments = normalizedAttachments ?? [];
      }
    }

    // 모델 함수 호출: 유효성 검사가 끝난 데이터를 모델 레이어로 전달
    try {
      // UpdatePostPayload 구성 (undefined 필드는 제외)
      const updatePayload: {
        postId: number;
        title?: string;
        content?: string;
        isAnonymous?: boolean;
        tagIds?: number[];
        attachments?: AttachmentItem[];
      } = {
        postId,
      };

      if (body.title !== undefined) {
        updatePayload.title = body.title.trim();
      }

      if (body.content !== undefined) {
        updatePayload.content = body.content.trim();
      }

      if (body.isAnonymous !== undefined) {
        updatePayload.isAnonymous = body.isAnonymous;
      }

      if (tagIds !== undefined) {
        updatePayload.tagIds = tagIds;
      }

      if (attachments !== undefined) {
        updatePayload.attachments = attachments;
      }

      const result = await updatePostWithRelations(updatePayload, userId);

      // 게시물 수정 성공 시 200 응답
      res.status(200).json({
        data: {
          postId: result.postId,
          message: '게시글이 성공적으로 수정되었습니다.',
          status: result.status,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      // 모델 레이어에서 발생한 에러 처리
      if (error instanceof Error) {
        if (error.message === 'POST_NOT_FOUND') {
          res.status(404).json({
            data: null,
            error: {
              message: '해당 ID의 게시글을 찾을 수 없습니다.',
              code: 'POST_NOT_FOUND',
            },
            meta: {
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            data: null,
            error: {
              message: '게시글을 수정할 권한이 없습니다.',
              code: 'FORBIDDEN',
            },
            meta: {
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
      }

      throw error;
    }
  } catch (error) {
    // 서버 오류 처리
    // TODO: middleware로 refactoring
    res.status(500).json({
      data: null,
      error: {
        message: '게시글 수정 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
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
    // TODO: JWT 토큰 추출 로직을 미들웨어로 리팩토링 예정
    // Authorization 헤더에서 JWT 토큰 추출 (optional)
    let currentUserId: number | null = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Bearer 토큰 추출
      const token = authHeader.substring(7); // 'Bearer ' 제거

      // 토큰 검증 및 user_id 추출
      // TODO: middleware로 refactoring
      try {
        const payload = verifyAccessToken(token);
        currentUserId = payload.userId;
      } catch (error) {
        // 토큰이 유효하지 않으면 currentUserId는 null로 유지 (비인증 사용자로 처리)
        // 에러를 반환하지 않고 게시글 조회는 계속 진행
      }
    }

    // 게시글 ID 파라미터 추출 및 검증
    const postId = Number.parseInt(req.params.postId ?? '', 10);

    if (!Number.isInteger(postId) || postId <= 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시글 ID입니다.',
          code: 'INVALID_POST_ID',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

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

// 게시글 삭제
// - 게시글 ID를 받아서 게시글을 삭제하는 HTTP 핸들러
export async function deletePost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: JWT 토큰 추출 로직을 미들웨어로 리팩토링 예정
    // Authorization 헤더에서 JWT 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        data: null,
        error: {
          message: '인증 토큰이 필요합니다.',
          code: 'MISSING_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Bearer 토큰 추출
    const token = authHeader.substring(7); // 'Bearer ' 제거

    // 토큰 검증 및 user_id 추출
    // TODO: middleware로 refactoring
    let userId: number;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.userId;
    } catch (error) {
      res.status(401).json({
        data: null,
        error: {
          message: '유효하지 않은 인증 토큰입니다.',
          code: 'INVALID_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 게시글 ID 파라미터 추출 및 검증
    const postId = Number.parseInt(req.params.postId ?? '', 10);

    if (!Number.isInteger(postId) || postId <= 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시글 ID입니다.',
          code: 'INVALID_POST_ID',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 모델 함수 호출
    try {
      const result = await deletePostWithRelations(postId, userId);

      // 게시글 삭제 성공 시 200 응답
      res.status(200).json({
        data: {
          postId: result.postId,
          message: '게시글이 성공적으로 삭제되었습니다.',
          status: result.status,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      // 모델 레이어에서 발생한 에러 처리
      if (error instanceof Error) {
        if (error.message === 'POST_NOT_FOUND') {
          res.status(404).json({
            data: null,
            error: {
              message: '해당 ID의 게시글을 찾을 수 없습니다.',
              code: 'POST_NOT_FOUND',
            },
            meta: {
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            data: null,
            error: {
              message: '게시글을 삭제할 권한이 없습니다.',
              code: 'FORBIDDEN',
            },
            meta: {
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
      }

      throw error;
    }
  } catch (error) {
    // 서버 오류 처리
    // TODO: middleware로 refactoring
    res.status(500).json({
      data: null,
      error: {
        message: '게시글 삭제 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    next(error);
  }
}

// 게시글 좋아요/싫어요 토글
// - 게시글 ID와 반응 타입을 받아서 좋아요/싫어요를 토글하는 HTTP 핸들러
export async function togglePostReactionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: JWT 토큰 추출 로직을 미들웨어로 리팩토링 예정
    // Authorization 헤더에서 JWT 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        data: null,
        error: {
          message: '인증 토큰이 필요합니다.',
          code: 'MISSING_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Bearer 토큰 추출
    const token = authHeader.substring(7); // 'Bearer ' 제거

    // 토큰 검증 및 user_id 추출
    // TODO: middleware로 refactoring
    let userId: number;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.userId;
    } catch (error) {
      res.status(401).json({
        data: null,
        error: {
          message: '유효하지 않은 인증 토큰입니다.',
          code: 'INVALID_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 게시글 ID 파라미터 추출 및 검증
    const postId = Number.parseInt(req.params.postId ?? '', 10);

    if (!Number.isInteger(postId) || postId <= 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시글 ID입니다.',
          code: 'INVALID_POST_ID',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 요청 본문 검증
    if (!isRecord(req.body)) {
      res.status(400).json({
        data: null,
        error: {
          message: '요청 본문이 필요합니다.',
          code: 'EMPTY_REQUEST_BODY',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const body = req.body as { type?: unknown };
    const reactionType = body.type;

    // type 필드 검증
    if (reactionType === undefined || reactionType === null) {
      res.status(400).json({
        data: null,
        error: {
          message: '반응 타입(type)은 필수입니다.',
          code: 'MISSING_FIELD',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (typeof reactionType !== 'string') {
      res.status(400).json({
        data: null,
        error: {
          message: '반응 타입(type)은 문자열이어야 합니다.',
          code: 'INVALID_REQUEST_BODY',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (reactionType !== 'like' && reactionType !== 'dislike') {
      res.status(400).json({
        data: null,
        error: {
          message: "반응 타입(type)은 'like' 또는 'dislike'여야 합니다.",
          code: 'INVALID_REQUEST_BODY',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 모델 함수 호출
    try {
      const result = await togglePostReaction(postId, userId, reactionType);

      // 게시글 반응 토글 성공 시 200 응답
      res.status(200).json({
        data: {
          postId: result.postId,
          likesCount: result.likesCount,
          dislikesCount: result.dislikesCount,
          userReaction: result.userReaction,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      // 모델 레이어에서 발생한 에러 처리
      if (error instanceof Error) {
        if (error.message === 'POST_NOT_FOUND') {
          res.status(404).json({
            data: null,
            error: {
              message: '해당 ID의 게시글을 찾을 수 없습니다.',
              code: 'POST_NOT_FOUND',
            },
            meta: {
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
      }

      throw error;
    }
  } catch (error) {
    // 서버 오류 처리
    // TODO: middleware로 refactoring
    res.status(500).json({
      data: null,
      error: {
        message: '게시글 반응 처리 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    next(error);
  }
}

// 게시글 스크랩 토글
// - 게시글 ID를 받아서 스크랩을 토글하는 HTTP 핸들러
export async function togglePostScrapHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: JWT 토큰 추출 로직을 미들웨어로 리팩토링 예정
    // Authorization 헤더에서 JWT 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        data: null,
        error: {
          message: '인증 토큰이 필요합니다.',
          code: 'MISSING_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Bearer 토큰 추출
    const token = authHeader.substring(7); // 'Bearer ' 제거

    // 토큰 검증 및 user_id 추출
    // TODO: middleware로 refactoring
    let userId: number;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.userId;
    } catch (error) {
      res.status(401).json({
        data: null,
        error: {
          message: '유효하지 않은 인증 토큰입니다.',
          code: 'INVALID_TOKEN',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 게시글 ID 파라미터 추출 및 검증
    const postId = Number.parseInt(req.params.postId ?? '', 10);

    if (!Number.isInteger(postId) || postId <= 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시글 ID입니다.',
          code: 'INVALID_POST_ID',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 모델 함수 호출
    try {
      const result = await togglePostScrap(postId, userId);

      // 게시글 스크랩 토글 성공 시 200 응답
      res.status(200).json({
        data: {
          postId: result.postId,
          scrapCount: result.scrapCount,
          isScrapped: result.isScrapped,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      // 모델 레이어에서 발생한 에러 처리
      if (error instanceof Error) {
        if (error.message === 'POST_NOT_FOUND') {
          res.status(404).json({
            data: null,
            error: {
              message: '해당 ID의 게시글을 찾을 수 없습니다.',
              code: 'POST_NOT_FOUND',
            },
            meta: {
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }
      }

      throw error;
    }
  } catch (error) {
    // 서버 오류 처리
    // TODO: middleware로 refactoring
    res.status(500).json({
      data: null,
      error: {
        message: '게시글 스크랩 처리 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    next(error);
  }
}


