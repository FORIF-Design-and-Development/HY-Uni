import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import { getUnreadNotificationCount } from '../../models/community/notification.model';
import { findPreferredKeywordsByUserId } from '../../models/community/preferred-keyword.model';
import { findAllPreferredTagsByUserId } from '../../models/community/preferred-tag.model';
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
    // TODO: 개발용 임시 하드코딩 - 프로덕션 배포 전 제거 필요
    const userId = 14;

    // 아래 토큰 검증 코드는 임시로 주석 처리
    /*
    // JWT 토큰 추출
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
    */

    // 데이터 조회
    const [unReadNotificationCount, preferredKeywords, preferredTags, recommendedPosts, favoriteBoardsList] = await Promise.all([
      getUnreadNotificationCount(userId), // 읽지 않은 알림 개수 조회
      findPreferredKeywordsByUserId(userId), // 사용자의 선호키워드 조회
      findAllPreferredTagsByUserId(userId), // 사용자의 선호태그 조회
      findRecommendedPostsByUserId(userId, 10), // 사용자의 추천게시글 조회(추천로직 기반의)
      findFavoriteBoardsByUserId(userId, 5), // 사용자의 즐겨찾기 게시판 목록 조회(created_at 기준 정렬)
    ]);

    // 즐겨찾기 게시판의 최신 게시글 조회
    const favoriteBoards = await findFavoriteBoardsWithLatestPost(favoriteBoardsList);

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

