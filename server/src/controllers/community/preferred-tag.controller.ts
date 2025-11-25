import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import { findBoardById } from '../../models/community/board.model';
import {
  findPreferredTagsByUserIdAndBoardId,
  countPreferredTagsByUserIdAndBoardId,
  validateTagIdsExist,
  validateTagsBelongToBoard,
  addPreferredTags,
  deletePreferredTags,
  findTagsByBoardId,
} from '../../models/community/preferred-tag.model';

// 선호 태그 추가 요청 본문(바디) 데이터 필드 정의
interface AddPreferredTagsBody {
  tagIds?: unknown;
}

// 선호 태그 삭제 요청 본문(바디) 데이터 필드 정의
interface DeletePreferredTagsBody {
  tagIds?: unknown;
}

// 선호 태그 추가
// - 사용자의 선호 태그를 추가 (기존 태그는 유지, 새 태그만 추가)
// - 기존에 이미 있는 태그는 중복 추가하지 않음
// - 게시판별 최대 5개 제한: 해당 게시판의 기존 태그 + 새로 추가할 태그 합쳐서 체크
export async function addPreferredTagsHandler(
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

    // boardId 파라미터 검증
    const boardId = Number.parseInt(req.params.boardId ?? '', 10); // URL경로에서 boardId 정수로 변환
    if (!Number.isInteger(boardId) || boardId <= 0) {
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

    // 게시판 존재 여부 확인
    const board = await findBoardById(boardId);
    if (!board) {
      res.status(404).json({
        data: null,
        error: {
          message: '해당 ID의 게시판을 찾을 수 없습니다.',
          code: 'BOARD_NOT_FOUND',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 요청 본문 체크
    if (!req.body || Object.keys(req.body).length === 0) { // 요청 본문이 없거나 빈 객체인 경우
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

    // 선호 태그 추가 요청 본문 데이터 필드 타입 단언
    // body: {tagIds?: unknown}
    // body.tagIds: unknown 타입
    const body = req.body as AddPreferredTagsBody;

    // tagIds 필드 체크
    if (body.tagIds === undefined || body.tagIds === null) { // tagIds 필드가 없거나 null인 경우
      res.status(400).json({
        data: null,
        error: {
          message: 'tagIds 필드는 필수입니다.',
          code: 'MISSING_TAG_IDS_FIELD',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // tagIds가 배열인지 체크
    if (!Array.isArray(body.tagIds)) {
      res.status(400).json({
        data: null,
        error: {
          message: 'tagIds는 배열이어야 합니다.',
          code: 'INVALID_TAG_IDS_TYPE',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // tagIds 배열 검증 및 정제
    const tagIds: number[] = [];
    for (const item of body.tagIds as unknown[]) {
      if (typeof item !== 'number' || !Number.isInteger(item) || item <= 0) { // 태그 ID가 숫자가 아니거나 정수가 아니거나 양수가 아닌 경우
        res.status(400).json({
          data: null,
          error: {
            message: '태그 ID는 양의 정수여야 합니다.',
            code: 'INVALID_TAG_ID_FORMAT',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
      tagIds.push(item);
    }

    // 중복 제거
    const uniqueTagIds = Array.from(new Set(tagIds));

    // 빈 배열 처리: 변경사항 없음
    if (uniqueTagIds.length === 0) {
      const existingTags =
        await findPreferredTagsByUserIdAndBoardId(userId, boardId); // 특정 게시판의 기존 사용자의 선호 태그 목록 조회
      res.status(200).json({
        data: {
          boardId,
          preferredTags: existingTags,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 태그 ID 존재 여부 검증
    const tagIdsExist = await validateTagIdsExist(uniqueTagIds);
    if (!tagIdsExist) { // 검증할 태그 중 존재하지 않는 태그가 있으면 오류 응답
      res.status(400).json({
        data: null,
        error: {
          message: '존재하지 않는 태그 ID가 포함되어 있습니다.',
          code: 'TAG_NOT_FOUND',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 태그가 게시판에 속하는지 검증
    const tagsBelongToBoard = await validateTagsBelongToBoard(
      uniqueTagIds,
      boardId,
    );
    if (!tagsBelongToBoard) { // 검증할 태그 중 해당 게시판에 속하지 않는 태그가 있으면 오류 응답
      res.status(400).json({
        data: null,
        error: {
          message: '존재하지 않는 태그 ID가 포함되어 있습니다.',
          code: 'TAG_NOT_FOUND',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 해당 게시판의 기존 선호 태그 개수 조회
    const existingCount =
      await countPreferredTagsByUserIdAndBoardId(userId, boardId);

    // 게시판별 최대 5개 제한 검증
    // 기존 태그 중에서 새로 추가할 태그와 중복되는 것은 제외하고 계산
    const existingTags =
      await findPreferredTagsByUserIdAndBoardId(userId, boardId);
    const existingTagIds = new Set(existingTags.map((tag) => tag.id)); // 선호 태그 목록에서 id만 추출하고 Set으로 중복 제거
    const newTagIds = uniqueTagIds.filter( // uniqueTagIds(요청으로 받은 중복 제거된 tag id 배열)에서 filter을 통해 기존에 없는 태그만 추출
      (tagId) => !existingTagIds.has(tagId), // existingTagIds(기존 선호 태그 id 목록)에 없는 태그만 추출
    );

    if (existingCount + newTagIds.length > 5) {
      res.status(400).json({
        data: null,
        error: {
          message: '선호 해시태그는 게시판별로 최대 5개까지 등록할 수 있습니다.',
          code: 'TAG_LIMIT_EXCEEDED',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 태그 추가
    await addPreferredTags(userId, boardId, uniqueTagIds); // uniqueTagIds(기존에 없는 새로운 태그 id 배열열)

    // 최종 선호 태그 조회
    const savedTags = await findPreferredTagsByUserIdAndBoardId( // 특정 게시판의 사용자의 선호 태그 목록(태그 id, 태그 이름) 조회
      userId,
      boardId,
    );

    // 성공 응답
    res.status(200).json({
      data: {
        boardId,
        preferredTags: savedTags,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// 선호 태그 선택적 삭제
// - 사용자가 선택한 태그만 삭제하고 나머지는 유지
export async function deletePreferredTagsHandler(
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

    // boardId 파라미터 검증
    const boardId = Number.parseInt(req.params.boardId ?? '', 10);
    if (!Number.isInteger(boardId) || boardId <= 0) {
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

    // 게시판 존재 여부 확인
    const board = await findBoardById(boardId);
    if (!board) {
      res.status(404).json({
        data: null,
        error: {
          message: '해당 ID의 게시판을 찾을 수 없습니다.',
          code: 'BOARD_NOT_FOUND',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 요청 본문 체크
    if (!req.body || Object.keys(req.body).length === 0) {
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

    const body = req.body as DeletePreferredTagsBody; // 삭제 요청 본문 데이터 필드 타입 단언언

    // tagIds 필드 필수 체크
    if (body.tagIds === undefined || body.tagIds === null) {
      res.status(400).json({
        data: null,
        error: {
          message: 'tagIds 필드는 필수입니다.',
          code: 'MISSING_TAG_IDS_FIELD',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // tagIds가 배열인지 체크
    if (!Array.isArray(body.tagIds)) {
      res.status(400).json({
        data: null,
        error: {
          message: 'tagIds는 배열이어야 합니다.',
          code: 'INVALID_TAG_IDS_TYPE',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // tagIds 배열 검증 및 정제
    const tagIds: number[] = [];
    for (const item of body.tagIds as unknown[]) {
      if (typeof item !== 'number' || !Number.isInteger(item) || item <= 0) {
        res.status(400).json({
          data: null,
          error: {
            message: '태그 ID는 양의 정수여야 합니다.',
            code: 'INVALID_TAG_ID_FORMAT',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
      tagIds.push(item);
    }

    // 중복 제거
    const uniqueTagIds = Array.from(new Set(tagIds));

    // 태그 삭제
    await deletePreferredTags(userId, boardId, uniqueTagIds);

    // 최종 선호 태그 조회
    const savedTags = await findPreferredTagsByUserIdAndBoardId(
      userId,
      boardId,
    );

    // 성공 응답
    res.status(200).json({
      data: {
        boardId,
        preferredTags: savedTags,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// 게시판별 선호 태그 조회
// - 특정 게시판에 대해 사용자가 설정한 선호 태그 목록을 반환
export async function getPreferredTagsHandler(
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

    // boardId 파라미터 검증
    const boardId = Number.parseInt(req.params.boardId ?? '', 10);
    if (!Number.isInteger(boardId) || boardId <= 0) { // 게시판 ID가 정수가 아니거나 양수가 아닌 경우우
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시판 ID입니다.',
          code: 'INVALID_BOARD_ID',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 게시판 존재 여부 확인
    const board = await findBoardById(boardId);
    if (!board) {
      res.status(404).json({
        data: null,
        error: {
          message: '해당 ID의 게시판을 찾을 수 없습니다.',
          code: 'BOARD_NOT_FOUND',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 선호 태그 조회
    const preferredTags =
      await findPreferredTagsByUserIdAndBoardId(userId, boardId); // 특정 게시판에 대한 사용자의 선호 태그 id, 태그 이름 목록 조회

    // 성공 응답
    res.status(200).json({
      data: {
        boardId,
        preferredTags,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// 게시판별 사용 가능한 태그 목록 조회
// - 특정 게시판에 사용 가능한 모든 해시태그 목록을 반환
export async function getBoardTagsHandler(
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
    try {
      const payload = verifyAccessToken(token);
      // userId는 여기서 사용되지 않지만, 인증 여부 확인을 위해 필요
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

    // boardId 파라미터 검증
    const boardId = Number.parseInt(req.params.boardId ?? '', 10);
    if (!Number.isInteger(boardId) || boardId <= 0) { // 게시판 ID가 정수가 아니거나 양수가 아닌 경우
      res.status(400).json({
        data: null,
        error: {
          message: '유효하지 않은 게시판 ID입니다.',
          code: 'INVALID_BOARD_ID',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 게시판 존재 여부 확인
    const board = await findBoardById(boardId);
    if (!board) {
      res.status(404).json({
        data: null,
        error: {
          message: '해당 ID의 게시판을 찾을 수 없습니다.',
          code: 'BOARD_NOT_FOUND',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 게시판별 사용 가능한 태그 목록 조회
    const availableTags = await findTagsByBoardId(boardId); // 특정 게시판에 사용 가능한 모든 태그 id, 태그 이름 목록 조회

    // 성공 응답
    res.status(200).json({
      data: {
        boardId,
        availableTags,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

