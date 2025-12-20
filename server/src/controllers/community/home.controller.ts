import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import { getUnreadNotificationCount } from '../../models/community/notification.model';
import { findPreferredKeywordsByUserId } from '../../models/community/preferred-keyword.model';
import { findAllPreferredTagsByUserId } from '../../models/community/preferred-tag.model';
import { findFilterKeywordsByUserId } from '../../models/community/filter-keyword.model';
import {
  findRecommendedPostsByUserId,
  findFavoriteBoardsWithLatestPost,
} from '../../models/community/post.model';
import { findFavoriteBoardsByUserId } from '../../models/community/board-favorite.model';

// 홈 화면 데이터 조회
export async function getHomeData(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // req.userId는 requireAuth 미들웨어에서 설정해줌
    const userId = (req as any).userId;

    // 혹시라도 userId가 없으면 401 에러 (미들웨어에서 걸러지겠지만 안전 장치)
    if (!userId) {
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

    // 1단계: 기본 데이터 조회 (병렬 실행)
    const [unReadNotificationCount, preferredKeywords, preferredTags, filterKeywordsWithId, favoriteBoardsList] = await Promise.all([
      getUnreadNotificationCount(userId), // 읽지 않은 알림 개수 조회
      findPreferredKeywordsByUserId(userId), // 사용자의 선호키워드 조회
      findAllPreferredTagsByUserId(userId), // 사용자의 선호태그 조회
      findFilterKeywordsByUserId(userId), // 사용자의 필터 키워드 조회
      findFavoriteBoardsByUserId(userId, 5), // 사용자의 즐겨찾기 게시판 목록 조회(created_at 기준 정렬)
    ]);

    // 필터 키워드 변환
    const filterKeywords = filterKeywordsWithId.map((k) => k.name);

    // 2단계: 추천 게시글과 즐겨찾기 게시판 최신 게시글 조회 (병렬 실행, 이미 조회한 키워드/태그 재사용)
    const [recommendedPosts, favoriteBoards] = await Promise.all([
      findRecommendedPostsByUserId(userId, 3, preferredKeywords, preferredTags, filterKeywords), // 상위 3개만 조회, 이미 조회한 키워드/태그 전달
      findFavoriteBoardsWithLatestPost(favoriteBoardsList), // 배치 쿼리로 최적화됨
    ]);

    // 응답 데이터 구성
    res.status(200).json({
      data: {
        unReadNotificationCount,
        userPreferences: {
          keywords: preferredKeywords.map((keyword) => ({
            name: keyword.name,
          })),
          tags: preferredTags.map((tag) => ({
            id: tag.id,
            name: tag.name,
          })),
        },
        recommendedPosts,
        favoriteBoards,
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // 서버 오류 처리
    res.status(500).json({
      data: null,
      error: {
        message: '서버 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    next(error);
  }
}

