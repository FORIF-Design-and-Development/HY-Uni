import { Router } from 'express';
import {
  getBoards,
  toggleBoardFavorite,
  toggleBoardSubscription,
} from '../../controllers/community/boards.controller';
import { getPopularSearch, logSearch, searchPostsHandler } from '../../controllers/community/search.controller';
import { createPost, getPostDetail } from '../../controllers/community/post.controller';

// 게시판 라우트
const router = Router();

// 게시판 목록 조회
router.get('/boards', getBoards);

// 인기 검색어 목록 조회
router.get('/search/popular', getPopularSearch);

// 검색어 로깅
router.post('/search/log', logSearch);

// 게시글 통합 검색
router.get('/search', searchPostsHandler);

// 게시판 즐겨찾기 토글
router.post('/boards/:boardId/favorite', toggleBoardFavorite);

// 게시판 알림 설정 토글
router.post('/boards/:boardId/subscribe', toggleBoardSubscription);
router.post('/boards/:boardId/posts', createPost);

// 게시글 상세 조회
router.get('/posts/:postId', getPostDetail);

export default router;

