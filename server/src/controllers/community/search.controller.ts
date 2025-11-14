import type { NextFunction, Request, Response } from 'express';
import { findPopularSearchRankings } from '../../models/community/popular-search.model';

const DEFAULT_LIMIT = 10;

function parseLimit(limitParam: unknown): number {

  // 파라미터가 문자열이 아니면 DEFAULT_LIMIT 반환
  if (typeof limitParam !== 'string') {
    return DEFAULT_LIMIT;
  }

  // 파라미터를 숫자로 변환
  const parsed = Number.parseInt(limitParam, 10);

  // 파라미터가 숫자가 아니거나 0보다 작으면 DEFAULT_LIMIT 반환
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return parsed;
}

// 인기 검색어 목록 조회
// - 가장 최근 기준 시점의 인기 검색어 순위를 반환하는 HTTP 핸들러
export async function getPopularSearch(
  req: Request, // 요청 객체
  res: Response, // 응답 객체
  next: NextFunction,
): Promise<void> {
  try {
    // 파라미터(인기 검색어 개수) 추출
    const limit = parseLimit(req.query.limit);

    // 인기 검색어 목록 조회(개수 제한))
    const result = await findPopularSearchRankings(limit);

    // 응답 객체에 인기 검색어 목록 추가
    res.status(200).json({
      data: {
        baseTime: result ? result.baseTime.toISOString() : null,
        rankings: result?.rankings ?? [],
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error); // 예외 처리
  }
}

