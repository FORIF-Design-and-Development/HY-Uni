import { Router } from 'express';
import {
  getBoards,
  toggleBoardFavorite,
  toggleBoardSubscription,
} from '../../controllers/community/boards.controller';
import { getPopularSearch, logSearch, searchPostsHandler } from '../../controllers/community/search.controller';
import {
  createPost,
  getPostDetail,
  updatePost,
  deletePost,
  togglePostReactionHandler,
  togglePostScrapHandler,
} from '../../controllers/community/post.controller';
import { uploadFiles } from '../../controllers/community/upload.controller';
import { uploadFiles as uploadFilesMiddleware } from '../../middlewares/upload';
import {
  getPreferredKeywords,
  updatePreferredKeywords,
  deletePreferredKeywordsHandler,
} from '../../controllers/community/preferred-keyword.controller';
import {
  getFilterKeywords,
  addFilterKeywordsHandler,
  deleteFilterKeywordsHandler,
} from '../../controllers/community/filter-keyword.controller';
import {
  addPreferredTagsHandler,
  deletePreferredTagsHandler,
  getPreferredTagsHandler,
  getBoardTagsHandler,
} from '../../controllers/community/preferred-tag.controller';

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

// 파일 업로드
router.post('/upload', uploadFilesMiddleware, uploadFiles);

// 게시판 즐겨찾기 토글
router.post('/boards/:boardId/favorite', toggleBoardFavorite);

// 게시판 알림 설정 토글
router.post('/boards/:boardId/subscribe', toggleBoardSubscription);

// 게시글 생성
router.post('/boards/:boardId/posts', createPost);

// 게시글 상세 조회
router.get('/posts/:postId', getPostDetail);

// 게시글 수정
router.patch('/posts/:postId', updatePost);

// 게시글 삭제
router.delete('/posts/:postId', deletePost);

// 게시글 좋아요/싫어요 토글
router.post('/posts/:postId/reaction', togglePostReactionHandler);

// 게시글 스크랩 토글
router.post('/posts/:postId/scrap', togglePostScrapHandler);

// 선호 키워드 목록 조회
router.get('/me/preferred-keywords', getPreferredKeywords);

// 선호 키워드 등록
router.post('/me/preferred-keywords', updatePreferredKeywords);

// 선호 키워드 삭제
router.delete('/me/preferred-keywords', deletePreferredKeywordsHandler);

// 필터링 키워드 목록 조회
router.get('/me/filter-keywords', getFilterKeywords);

// 필터링 키워드 등록
router.post('/me/filter-keywords', addFilterKeywordsHandler);

// 필터링 키워드 삭제
router.delete('/me/filter-keywords', deleteFilterKeywordsHandler);

// 게시판별 사용 가능한 태그 목록 조회
router.get('/boards/:boardId/tags', getBoardTagsHandler);

// 게시판별 선호 태그 목록 조회
router.get('/boards/:boardId/me/preferred-tags', getPreferredTagsHandler);

// 게시판별 선호 태그 등록
router.post('/boards/:boardId/me/preferred-tags', addPreferredTagsHandler);

// 게시판별 선호 태그 삭제
router.delete('/boards/:boardId/me/preferred-tags', deletePreferredTagsHandler);

export default router;

