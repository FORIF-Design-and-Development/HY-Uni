import type { NextFunction, Request, Response } from 'express';
import { findPopularSearchRankings } from '../../models/community/popular-search.model';
import { createSearchLog } from '../../models/community/search-log.model';
import { searchPosts, type SortBy } from '../../models/community/search.model';

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

    // 인기 검색어 목록 조회(개수 제한)
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

// 검색어를 로깅하는 HTTP 핸들러
export async function logSearch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).userId;

    // Request body에서 query 추출
    const { query } = req.body;

    // 필수 필드 확인
    // TODO: middleware로 refactoring
    if (!query) {
      res.status(400).json({
        data: null,
        error: {
          message: '검색어(query)는 필수입니다.',
          code: 'MISSING_FIELD',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 검색어 앞뒤 공백 제거
    const trimmedQuery = typeof query === 'string' ? query.trim() : '';

    // 빈 문자열 또는 공백만 있는지 확인
    // TODO: middleware로 refactoring
    if (trimmedQuery.length === 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '검색어는 1자 이상 255자 이하여야 합니다.',
          code: 'VALIDATION_ERROR',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 길이 검증 (1-255자)
    // TODO: middleware로 refactoring
    if (trimmedQuery.length > 255) {
      res.status(400).json({
        data: null,
        error: {
          message: '검색어는 1자 이상 255자 이하여야 합니다.',
          code: 'VALIDATION_ERROR',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 검색어 로그 생성
    const searchLog = await createSearchLog(trimmedQuery, userId);

    // 응답 반환
    res.status(200).json({
      data: {
        searchId: searchLog.search_id,
        userId: searchLog.user_id,
        query: searchLog.query,
        createdAt: new Date(searchLog.created_at).toISOString(),
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // 서버 오류 처리
    // TODO: middleware로 refactoring
    res.status(500).json({
      data: null,
      error: {
        message: '검색어 로깅 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    next(error);
  }
}

// 게시글 통합 검색 HTTP 핸들러
export async function searchPostsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).userId;

    // 검색어 파라미터 추출 및 검증
    // TODO: middleware로 refactoring
    const query = req.query.q;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({
        data: null,
        error: {
          message: '검색어(q)를 입력해주세요.',
          code: 'SEARCH-001',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // 페이지 파라미터 파싱
    // TODO: middleware로 refactoring
    const pageParam = req.query.page;
    let page = 1;
    if (pageParam) {
      const parsedPage = Number.parseInt(String(pageParam), 10);
      if (Number.isInteger(parsedPage) && parsedPage >= 1) {
        page = parsedPage;
      } else {
        res.status(400).json({
          data: null,
          error: {
            message: '페이지 번호는 1 이상이어야 합니다.',
            code: 'VALIDATION_ERROR',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    // 페이지 크기 파라미터 파싱
    // TODO: middleware로 refactoring
    const pageSizeParam = req.query.pageSize;
    let pageSize = 20;
    if (pageSizeParam) {
      const parsedPageSize = Number.parseInt(String(pageSizeParam), 10);
      if (Number.isInteger(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= 100) {
        pageSize = parsedPageSize;
      } else {
        res.status(400).json({
          data: null,
          error: {
            message: '페이지 크기는 1 이상 100 이하여야 합니다.',
            code: 'VALIDATION_ERROR',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    // 정렬 기준 파라미터 파싱 (기본값: relevance)
    const sortByParam = req.query.sortBy;
    let sortBy: SortBy = 'relevance';
    if (sortByParam) {
      const sortByValue = String(sortByParam);
      if (sortByValue === 'relevance') {
        sortBy = sortByValue as SortBy;
      }
    }

    // 게시판 ID 파라미터 파싱 (optional), 특정 게시판 내에서 검색할 경우 사용
    const boardIdParam = req.query.boardId;
    let boardId: number | undefined;
    if (boardIdParam) {
      const parsedBoardId = Number.parseInt(String(boardIdParam), 10);
      if (Number.isInteger(parsedBoardId) && parsedBoardId > 0) {
        boardId = parsedBoardId;
      }
    }

    // 검색 실행
    const searchOptions: Parameters<typeof searchPosts>[0] = {
      query: query.trim(),
      page,
      pageSize,
      sortBy,
      userId,
    };
    if (boardId !== undefined) {
      searchOptions.boardId = boardId;
    }
    const searchResult = await searchPosts(searchOptions);

    // 응답 반환
    res.status(200).json({
      data: searchResult,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // 서버 오류 처리
    // TODO: middleware로 refactoring
    res.status(500).json({
      data: null,
      error: {
        message: '검색 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    next(error);
  }
}

