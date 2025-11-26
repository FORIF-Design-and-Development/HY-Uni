import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import {
  addFilterKeywords,
  findFilterKeywordsByUserId,
  deleteFilterKeywords,
  deleteFilterKeywordsByIds,
} from '../../models/community/filter-keyword.model';

interface AddFilterKeywordsBody { // POST 요청 본문 데이터 필드 정의
  keywords?: unknown; // keywords: 선택적(?) 필드이고 타입은 unknown -> 나중에 배열 타입임이 확실해지면 배열 타입으로 변경
}

interface DeleteFilterKeywordsBody { // DELETE 요청 본문 데이터 필드 정의
  keywordIds?: unknown; // keywordIds: 선택적(?) 필드이고 타입은 unknown -> 나중에 배열 타입임이 확실해지면 배열 타입으로 변경
}

// 필터링 키워드 추가
// - 사용자의 필터링 키워드를 추가 (기존 키워드는 유지, 새 키워드만 추가)
// - 기존에 이미 있는 키워드는 중복 추가하지 않음
// - 최대 5개 제한: 기존 키워드 + 새로 추가할 키워드 합쳐서 체크
// - 빈 배열 허용: 빈 배열이면 아무것도 하지 않음 (기존 키워드 유지)
export async function addFilterKeywordsHandler(
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

    // 요청 본문 체크
    if (!req.body || Object.keys(req.body).length === 0) {
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

    // 요청 본문 데이터 필드 타입 단언
    // body: {keywords?: unknown}
    // body.keywords: unknown 타입
    const body = req.body as AddFilterKeywordsBody;

    // keywords 필드 체크
    if (body.keywords === undefined || body.keywords === null) { // keywords 필드가 없거나 필드에 값이 없는 경우
      res.status(400).json({
        data: null,
        error: {
          message: 'keywords 필드는 필수입니다.',
          code: 'MISSING_KEYWORDS_FIELD',
        },
        meta: null,
      });
      return;
    }

    // keywords가 배열인지 체크
    if (!Array.isArray(body.keywords)) {
      res.status(400).json({
        data: null,
        error: {
          message: 'keywords는 배열이어야 합니다.',
          code: 'INVALID_KEYWORDS_TYPE',
        },
        meta: null,
      });
      return;
    }

    // 키워드 배열 처리: 앞뒤 공백 제거, 빈 문자열 필터링, 중복 제거
    const trimmedKeywords = (body.keywords as unknown[])
      .map((item) => {
        if (typeof item !== 'string') {
          return null;
        }
        return item.trim(); // 앞뒤 공백 제거
      })
      .filter((item): item is string => item !== null && item !== ''); // 빈 문자열 필터링

    // 중복 제거 (Set 사용)
    const uniqueKeywords = Array.from(new Set(trimmedKeywords));

    // 빈 배열 허용: 빈 배열이면 아무것도 하지 않음 (기존 키워드 유지)
    if (uniqueKeywords.length === 0) {
      const savedKeywords = await findFilterKeywordsByUserId(userId);
      res.status(200).json({
        data: {
          userId: userId,
          filterKeywords: savedKeywords,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 최대 개수 체크 (5개)
    if (uniqueKeywords.length > 5) {
      res.status(400).json({
        data: null,
        error: {
          message: '키워드는 최대 5개까지 등록할 수 있습니다.',
          code: 'KEYWORDS_LIMIT_EXCEEDED',
        },
        meta: null,
      });
      return;
    }

    // 각 키워드 유효성 검사 (1자 이상 50자 이하)
    for (const keyword of uniqueKeywords) {
      if (keyword.length < 1 || keyword.length > 50) {
        res.status(400).json({
          data: null,
          error: {
            message: '키워드는 1자 이상 50자 이하여야 하며, 빈 문자열일 수 없습니다.',
            code: 'INVALID_KEYWORD_FORMAT',
          },
          meta: null,
        });
        return;
      }
    }

    // 기존 키워드 조회
    const existingKeywords = await findFilterKeywordsByUserId(userId);

    // 새로 추가할 키워드만 필터링 (기존에 없는 키워드만)
    const newKeywords = uniqueKeywords.filter(
      (keyword) => !existingKeywords.some((ek) => ek.name === keyword),
    );

    // 추가 후 총 개수 체크 (기존 + 새로운 키워드 합쳐서 최대 5개)
    if (existingKeywords.length + newKeywords.length > 5) {
      res.status(400).json({
        data: null,
        error: {
          message: `키워드는 최대 5개까지 등록할 수 있습니다. (현재: ${existingKeywords.length}개, 추가 시도: ${newKeywords.length}개)`,
          code: 'KEYWORDS_LIMIT_EXCEEDED',
        },
        meta: null,
      });
      return;
    }

    // 새로 추가할 키워드가 없으면 (모두 기존에 있는 키워드) 성공 응답 반환
    if (newKeywords.length === 0) {
      const savedKeywords = await findFilterKeywordsByUserId(userId); // 기존 키워드 조회
      res.status(200).json({
        data: {
          userId: userId,
          filterKeywords: savedKeywords,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 데이터베이스에 추가 (기존 키워드는 유지하고 새 키워드만 추가)
    await addFilterKeywords(userId, newKeywords);

    // 저장된 키워드 조회
    const savedKeywords = await findFilterKeywordsByUserId(userId);

    // 성공 응답
    res.status(200).json({
      data: {
        userId: userId,
        filterKeywords: savedKeywords,
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

// 필터링 키워드 조회
// - 사용자의 필터링 키워드 목록을 조회
export async function getFilterKeywords(
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

    // 사용자의 필터링 키워드 조회 (ID 포함)
    const keywords = await findFilterKeywordsByUserId(userId);

    // 성공 응답
    res.status(200).json({
      data: {
        userId: userId,
        filterKeywords: keywords,
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

// 필터링 키워드 선택적 삭제
// - 사용자가 선택한 키워드만 삭제하고 나머지는 유지
export async function deleteFilterKeywordsHandler(
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

    // 요청 본문 체크
    if (!req.body || Object.keys(req.body).length === 0) {
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

    const body = req.body as DeleteFilterKeywordsBody;

    // keywordIds 필드 필수 체크
    if (body.keywordIds === undefined || body.keywordIds === null) {
      res.status(400).json({
        data: null,
        error: {
          message: 'keywordIds 필드는 필수입니다.',
          code: 'MISSING_KEYWORD_IDS_FIELD',
        },
        meta: null,
      });
      return;
    }

    // keywordIds가 배열인지 체크
    if (!Array.isArray(body.keywordIds)) {
      res.status(400).json({
        data: null,
        error: {
          message: 'keywordIds는 배열이어야 합니다.',
          code: 'INVALID_KEYWORD_IDS_TYPE',
        },
        meta: null,
      });
      return;
    }

    // 숫자 배열로 변환 및 유효성 검사
    const keywordIds = (body.keywordIds as unknown[])
      .map((item) => {
        if (typeof item === 'number') {
          return item;
        }
        if (typeof item === 'string') {
          const parsed = parseInt(item, 10);
          return isNaN(parsed) ? null : parsed;
        }
        return null;
      })
      .filter((item): item is number => item !== null && item > 0);

    // 유효한 ID가 없으면 에러
    if (keywordIds.length === 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '유효한 keywordId가 필요합니다.',
          code: 'INVALID_KEYWORD_IDS',
        },
        meta: null,
      });
      return;
    }

    // 중복 제거
    const uniqueIds = Array.from(new Set(keywordIds));

    // ID로 키워드 삭제
    await deleteFilterKeywordsByIds(userId, uniqueIds);

    // 삭제 후 남은 키워드 조회
    const savedKeywords = await findFilterKeywordsByUserId(userId);

    // 성공 응답
    res.status(200).json({
      data: {
        userId: userId,
        filterKeywords: savedKeywords,
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

