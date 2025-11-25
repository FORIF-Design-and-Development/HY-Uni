import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import {
  addPreferredKeywords,
  findPreferredKeywordsByUserId,
  deletePreferredKeywords,
} from '../../models/community/preferred-keyword.model';

interface UpdatePreferredKeywordsBody { // POST 요청 본문 데이터 필드 정의
  keywords?: unknown; // keywords: 선택적(?) 필드이고 타입은 unknown -> 나중에 배열 타입임이 확실해지면 배열 타입으로 변경
}

interface DeletePreferredKeywordsBody { // DELETE 요청 본문 데이터 필드 정의
  keywords?: unknown; // keywords: 선택적(?) 필드이고 타입은 unknown -> 나중에 배열 타입임이 확실해지면 배열 타입으로 변경
}

// 선호 키워드 추가
// - 사용자의 선호 키워드를 추가 (기존 키워드는 유지, 새 키워드만 추가)
// - 기존에 이미 있는 키워드는 중복 추가하지 않음
// - 최대 5개 제한: 기존 키워드 + 새로 추가할 키워드 합쳐서 체크
export async function updatePreferredKeywords(
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
    const body = req.body as UpdatePreferredKeywordsBody;

    // keywords 필드 체크
    if (body.keywords === undefined || body.keywords === null) { // keywords 필드가 없거나 null인 경우
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

    // 키워드 배열 처리: 앞뒤 공백 제거, 중복 제거, 빈 문자열 필터링
    const trimmedKeywords = (body.keywords as unknown[])
      .map((item) => {
        if (typeof item !== 'string') {
          return null;
        }
        return item.trim(); // 문자열이면 trim 처리(앞 뒤 공백 제거)
      })
      .filter((item): item is string => item !== null && item !== ''); // null과 빈 문자열 제거

    // 최소 개수 체크 (1개 이상)
    if (trimmedKeywords.length === 0) {
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

    // 중복 제거 (Set 사용)
    const uniqueKeywords = Array.from(new Set(trimmedKeywords)); // 중복 제거 후 배열로 변환

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

    // 기존 선호 키워드 조회
    const existingKeywords = await findPreferredKeywordsByUserId(userId);

    // 새로 추가할 키워드만 필터링 (기존에 없는 키워드만)
    const newKeywords = uniqueKeywords.filter(
      (keyword) => !existingKeywords.includes(keyword),
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
      const savedKeywords = await findPreferredKeywordsByUserId(userId);
      res.status(200).json({
        data: {
          userId: String(userId),
          preferredKeywords: savedKeywords,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 데이터베이스에 추가 (기존 키워드는 유지하고 새 키워드만 추가)
    await addPreferredKeywords(userId, newKeywords);

    // 저장된 키워드 조회
    const savedKeywords = await findPreferredKeywordsByUserId(userId);

    // 성공 응답
    res.status(200).json({
      data: {
        userId: String(userId),
        preferredKeywords: savedKeywords,
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

// 선호 키워드 조회
// - 사용자의 선호 키워드 목록을 조회
export async function getPreferredKeywords(
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

    // 사용자의 선호 키워드 조회
    const keywords = await findPreferredKeywordsByUserId(userId);

    // 성공 응답
    res.status(200).json({
      data: {
        userId: String(userId),
        preferredKeywords: keywords,
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

// 선호 키워드 선택적 삭제
// - 사용자가 선택한 키워드만 삭제하고 나머지는 유지
export async function deletePreferredKeywordsHandler(
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

    const body = req.body as DeletePreferredKeywordsBody;

    // keywords 필드 필수 체크
    if (body.keywords === undefined || body.keywords === null) {
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

    // 키워드 배열 처리: 앞뒤 공백 제거, 빈 문자열 필터링
    const trimmedKeywords = (body.keywords as unknown[])
      .map((item) => {
        if (typeof item !== 'string') {
          return null;
        }
        return item.trim(); // 앞뒤 공백 제거
      })
      .filter((item): item is string => item !== null && item !== ''); // null과 빈 문자열 제거

    // 중복 제거 (Set 사용)
    const uniqueKeywords = Array.from(new Set(trimmedKeywords)); // 중복 제거 후 배열로 변환

    // 삭제할 키워드가 없으면 성공 응답 반환
    if (uniqueKeywords.length === 0) {
      const savedKeywords = await findPreferredKeywordsByUserId(userId);
      res.status(200).json({
        data: {
          userId: String(userId),
          preferredKeywords: savedKeywords,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 선택한 키워드 삭제
    await deletePreferredKeywords(userId, uniqueKeywords);

    // 삭제 후 남은 키워드 조회
    const savedKeywords = await findPreferredKeywordsByUserId(userId);

    // 성공 응답
    res.status(200).json({
      data: {
        userId: String(userId),
        preferredKeywords: savedKeywords,
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

