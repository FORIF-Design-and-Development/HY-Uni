import { Router } from 'express';
import {
  getBoards,
  toggleBoardFavorite,
  toggleBoardSubscription,
} from '../../controllers/community/boards.controller.js';
import { getPopularSearch } from '../../controllers/community/search.controller.js';

// 게시판 라우트
const router = Router();

// 게시판 목록 조회
router.get('/boards', getBoards);

// 인기 검색어 목록 조회
router.get('/search/popular', getPopularSearch);

// 게시판 즐겨찾기 토글
router.post('/boards/:boardId/favorite', toggleBoardFavorite);

// 게시판 알림 설정 토글
router.post('/boards/:boardId/subscribe', toggleBoardSubscription);

export default router;

