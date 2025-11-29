import type { Request, Response, NextFunction } from 'express';
import {
  checkPostExists,
  createComment,
  createReply,
  toggleCommentReaction,
  updateComment,
  deleteComment,
} from '../../models/community/comment.model';
import { notifyPostAuthor, notifyCommentAuthor } from '../../services/community/notification.service';

// 댓글 생성 요청 본문(바디) 데이터 필드 정의
interface CreateCommentBody {
  content?: string;
  isAnonymous?: boolean;
  isSecret?: boolean;
}

// 댓글 반응 토글 요청 본문(바디) 데이터 필드 정의
interface ToggleCommentReactionBody {
  type?: unknown;
}

// 대댓글 생성 요청 본문(바디) 데이터 필드 정의
interface CreateReplyBody {
  content?: string;
  isAnonymous?: boolean;
  isSecret?: boolean;
}

// 댓글 수정 요청 본문(바디) 데이터 필드 정의
interface UpdateCommentBody {
  content?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> { // 값이 객체인지 확인하는 함수
  return typeof value === 'object' && value !== null; // value가 객체이고 null이 아닌지 확인
}

function isValidPostId(value: unknown): value is number { // 값이 유효한 게시글 ID인지 확인하는 함수
  return typeof value === 'number' && Number.isInteger(value) && value > 0; // value가 숫자이고 정수이고 0보다 큰지 확인
}

function isValidCommentId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string { // 값이 비어있지 않은 문자열인지 확인하는 함수
  return typeof value === 'string' && value.trim().length > 0; // value가 문자열이고 비어있지 않은지 확인
}

// 댓글 작성
// - 댓글 정보를 받아서 댓글을 생성하는 HTTP 핸들러
export async function createCommentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).userId;

    // 게시글 ID 파라미터 추출 및 검증
    const postId = Number.parseInt(req.params.postId ?? '', 10);

    if (!isValidPostId(postId)) {
      // 게시글 ID 유효성 검사 실패 시 400 응답
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

    // 게시글 존재 여부 확인 (DB 조회)
    const postExists = await checkPostExists(postId);

    if (!postExists) {
      // 게시글 존재 여부 확인 실패 시 404 응답
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

    // 필수 필드 (내용) 검사
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

    const body = req.body as CreateCommentBody; // 요청 본문을 CreateCommentBody 타입으로 단언
    const { content, isAnonymous, isSecret } = body; // 요청 본문에서 content, isAnonymous, isSecret 추출

    if (!isNonEmptyString(content)) {
      // 내용 누락 시 400 응답
      res.status(400).json({
        data: null,
        error: {
          message: '댓글 내용은 필수입니다.',
          code: 'INVALID_REQUEST_BODY',
        },
        meta: null,
      });
      return;
    }

    // 댓글 내용 길이 제한 (1-500자)
    const trimmedContent = content.trim(); // 댓글 내용 양쪽 공백 제거
    if (trimmedContent.length < 1 || trimmedContent.length > 500) { // 댓글 내용 길이 제한 (1-500자)
      res.status(400).json({
        data: null,
        error: {
          message: '댓글은 최소 1자, 최대 500자까지 입력 가능합니다.',
          code: 'INVALID_INPUT_VALUE',
        },
        meta: null,
      });
      return;
    }

    // isAnonymous, isSecret boolean 타입 검증
    if (typeof isAnonymous !== 'boolean' || typeof isSecret !== 'boolean') {
      res.status(400).json({
        data: null,
        error: {
          message: 'isAnonymous와 isSecret은 boolean 타입이어야 합니다.',
          code: 'INVALID_REQUEST_BODY',
        },
        meta: null,
      });
      return;
    }

    // 모델 함수 호출: 유효성 검사가 끝난 데이터를 모델 레이어로 전달
    const result = await createComment({
      postId,
      userId,
      content: trimmedContent,
      isAnonymous,
      isSecret,
    });

    // 댓글 생성 성공 시 게시글 작성자에게 알림 발송
    try {
      await notifyPostAuthor(postId, userId, result.commentId);
    } catch (error) {
      console.error('Failed to send notification:', error);
      // 알림 실패는 메인 로직에 영향 없도록 에러를 던지지 않음
    }

    // 댓글 생성 성공 시 201 응답
    res.status(201).json({
      data: {
        commentId: result.commentId,
        message: '댓글이 작성되었습니다.',
        status: result.status,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    next(error);
  }
}

// 댓글 좋아요/싫어요 토글
// - 댓글 반응 정보를 받아서 반응을 토글하는 HTTP 핸들러
export async function toggleCommentReactionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).userId;

    // 댓글 ID 파라미터 추출 및 검증
    const commentId = Number.parseInt(req.params.commentId ?? '', 10);

    if (!isValidCommentId(commentId)) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 댓글 ID입니다.',
          code: 'INVALID_COMMENT_ID',
        },
        meta: null,
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
        meta: null,
      });
      return;
    }

    const body = req.body as ToggleCommentReactionBody;
    const reactionType = body.type;

    // type 필드 검증
    if (reactionType === undefined || reactionType === null) {
      res.status(400).json({
        data: null,
        error: {
          message: '반응 타입(type)은 필수입니다.',
          code: 'MISSING_FIELD',
        },
        meta: null,
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
        meta: null,
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
        meta: null,
      });
      return;
    }

    // 모델 함수 호출
    try {
      const result = await toggleCommentReaction(
        commentId,
        userId,
        reactionType as 'like' | 'dislike',
      );

      // 댓글 반응 토글 성공 시 200 응답
      res.status(200).json({
        data: {
          commentId: result.commentId,
          likeCount: result.likesCount,
          dislikeCount: result.dislikesCount,
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
        if (error.message === 'COMMENT_NOT_FOUND') {
          res.status(404).json({
            data: null,
            error: {
              message: '해당 ID의 댓글을 찾을 수 없습니다.',
              code: 'COMMENT_NOT_FOUND',
            },
            meta: null,
          });
          return;
        }
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
}

// 대댓글 작성
// - 대댓글 정보를 받아서 대댓글을 생성하는 HTTP 핸들러
export async function createReplyHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).userId;

    // 댓글 ID 파라미터 추출 및 검증
    const commentId = Number.parseInt(req.params.commentId ?? '', 10);

    if (!isValidCommentId(commentId)) {
      // 댓글 ID 유효성 검사 실패 시 400 응답
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 댓글 ID입니다.',
          code: 'INVALID_COMMENT_ID',
        },
        meta: null,
      });
      return;
    }

    // 필수 필드 (내용) 검사
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

    const body = req.body as CreateReplyBody;
    const { content, isAnonymous, isSecret } = body; // 요청 본문에서 content, isAnonymous, isSecret 추출

    if (!isNonEmptyString(content)) {
      // 내용 누락 시 400 응답
      res.status(400).json({
        data: null,
        error: {
          message: '대댓글 내용은 필수입니다.',
          code: 'INVALID_REQUEST_BODY',
        },
        meta: null,
      });
      return;
    }

    // 대댓글 내용 길이 제한 (1-500자)
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 500) {
      res.status(400).json({
        data: null,
        error: {
          message: '대댓글은 최소 1자, 최대 500자까지 입력 가능합니다.',
          code: 'INVALID_INPUT_VALUE',
        },
        meta: null,
      });
      return;
    }

    // isAnonymous, isSecret boolean 타입 검증
    if (typeof isAnonymous !== 'boolean' || typeof isSecret !== 'boolean') {
      res.status(400).json({
        data: null,
        error: {
          message: 'isAnonymous와 isSecret은 boolean 타입이어야 합니다.',
          code: 'INVALID_REQUEST_BODY',
        },
        meta: null,
      });
      return;
    }

    // 모델 함수 호출: 유효성 검사가 끝난 데이터를 모델 레이어로 전달
    try {
      const result = await createReply({
        parentCommentId: commentId,
        userId,
        content: trimmedContent,
        isAnonymous,
        isSecret,
      });

      // 대댓글 생성 성공 시 댓글 작성자에게 알림 발송
      try {
        await notifyCommentAuthor(commentId, userId, result.commentId);
      } catch (error) {
        console.error('Failed to send notification:', error);
        // 알림 실패는 메인 로직에 영향 없도록 에러를 던지지 않음
      }

      // 대댓글 생성 성공 시 201 응답
      res.status(201).json({
        data: {
          commentId: result.commentId,
          parentCommentId: result.parentCommentId,
          message: '대댓글이 작성되었습니다.',
          status: result.status,
        },
        error: null,
        meta: null,
      });
    } catch (error: any) {
      // 모델 레이어에서 발생한 에러 처리
      if (error instanceof Error) {
        if (error.message === 'COMMENT_NOT_FOUND') {
          res.status(404).json({
            data: null,
            error: {
              message: '해당 ID의 댓글을 찾을 수 없습니다.',
              code: 'COMMENT_NOT_FOUND',
            },
            meta: null,
          });
          return;
        }
        if (error.message === 'INVALID_PARENT_COMMENT') {
          res.status(400).json({
            data: null,
            error: {
              message: '대댓글에 대댓글을 달 수 없습니다.',
              code: 'INVALID_PARENT_COMMENT',
            },
            meta: null,
          });
          return;
        }
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
}

// 댓글 수정
// - 댓글 정보를 받아서 댓글을 수정하는 HTTP 핸들러
export async function updateCommentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).userId;

    // 댓글 ID 파라미터 추출 및 검증
    const commentId = Number.parseInt(req.params.commentId ?? '', 10);

    if (!isValidCommentId(commentId)) {
      // 댓글 ID 유효성 검사 실패 시 400 응답
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 댓글 ID입니다.',
          code: 'INVALID_COMMENT_ID',
        },
        meta: null,
      });
      return;
    }

    // 필수 필드 (내용) 검사
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

    const body = req.body as UpdateCommentBody;
    const { content } = body;

    if (!isNonEmptyString(content)) {
      // 내용 누락 시 400 응답
      res.status(400).json({
        data: null,
        error: {
          message: '댓글 내용은 필수입니다.',
          code: 'INVALID_REQUEST_BODY',
        },
        meta: null,
      });
      return;
    }

    // 댓글 내용 길이 제한 (1-500자)
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 500) {
      res.status(400).json({
        data: null,
        error: {
          message: '댓글은 최소 1자, 최대 500자까지 입력 가능합니다.',
          code: 'INVALID_INPUT_VALUE',
        },
        meta: null,
      });
      return;
    }

    // 모델 함수 호출: 유효성 검사가 끝난 데이터를 모델 레이어로 전달
    try {
      const result = await updateComment(
        {
          commentId,
          content: trimmedContent,
        },
        userId,
      );

      // 댓글 수정 성공 시 200 응답
      res.status(200).json({
        data: {
          commentId: result.commentId,
          updatedAt: new Date().toISOString(),
          message: '댓글이 수정되었습니다.',
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
        if (error.message === 'COMMENT_NOT_FOUND') {
          res.status(404).json({
            data: null,
            error: {
              message: '해당 ID의 댓글을 찾을 수 없습니다.',
              code: 'COMMENT_NOT_FOUND',
            },
            meta: null,
          });
          return;
        }
        if (error.message === 'COMMENT_ALREADY_DELETED') {
          res.status(400).json({
            data: null,
            error: {
              message: '삭제된 댓글은 수정할 수 없습니다.',
              code: 'COMMENT_ALREADY_DELETED',
            },
            meta: null,
          });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({
            data: null,
            error: {
              message: '댓글을 수정할 권한이 없습니다.',
              code: 'FORBIDDEN',
            },
            meta: null,
          });
          return;
        }
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
}

// 댓글 삭제
// - 댓글을 삭제하는 HTTP 핸들러
export async function deleteCommentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).userId;

    // 댓글 ID 파라미터 추출 및 검증
    const commentId = Number.parseInt(req.params.commentId ?? '', 10);

    if (!isValidCommentId(commentId)) {
      // 댓글 ID 유효성 검사 실패 시 400 응답
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 댓글 ID입니다.',
          code: 'INVALID_COMMENT_ID',
        },
        meta: null,
      });
      return;
    }

    // 모델 함수 호출: 유효성 검사가 끝난 데이터를 모델 레이어로 전달
    try {
      const result = await deleteComment(commentId, userId);

      // 댓글 삭제 성공 시 200 응답
      res.status(200).json({
        data: {
          commentId: result.commentId,
          message: '댓글이 삭제되었습니다.',
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
        if (error.message === 'COMMENT_NOT_FOUND') {
          res.status(404).json({
            data: null,
            error: {
              message: '해당 ID의 댓글을 찾을 수 없습니다.',
              code: 'COMMENT_NOT_FOUND',
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
              message: '댓글을 삭제할 권한이 없습니다.',
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
    next(error);
  }
}
