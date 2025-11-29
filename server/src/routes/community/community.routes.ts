import { Router } from 'express';
import {
  getBoards,
  toggleBoardFavorite,
  toggleBoardSubscription,
  getAllBoardsTagsHandler,
} from '../../controllers/community/boards.controller';
import { getPopularSearch, logSearch, searchPostsHandler } from '../../controllers/community/search.controller';
import {
  createPost,
  getPostDetail,
  updatePost,
  deletePost,
  togglePostReactionHandler,
  togglePostScrapHandler,
  votePostPollHandler,
  getBoardPostsHandler,
} from '../../controllers/community/post.controller';
import { uploadFiles } from '../../controllers/community/upload.controller';
import { uploadFiles as uploadFilesMiddleware } from '../../middlewares/upload';
import { requireAuth } from '../../middlewares/error';
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
import {
  createCommentHandler,
  createReplyHandler,
  toggleCommentReactionHandler,
  updateCommentHandler,
  deleteCommentHandler,
} from '../../controllers/community/comment.controller';
import {
  connectSSE,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../../controllers/community/notification.controller';
import { getHomeData } from '../../controllers/community/home.controller';

// 게시판 라우트
const router = Router();

// 홈 화면 데이터 조회
router.get('/home', getHomeData);

// 게시판 목록 조회
router.get('/boards', requireAuth, getBoards);

// 모든 게시판의 태그 목록 조회
router.get('/boards/tags', requireAuth, getAllBoardsTagsHandler);

// 인기 검색어 목록 조회
router.get('/search/popular', requireAuth, getPopularSearch);

// 검색어 로깅
router.post('/search/log', requireAuth, logSearch);

// 게시글 통합 검색
router.get('/search', requireAuth, searchPostsHandler);

// 파일 업로드
router.post('/upload', requireAuth, uploadFilesMiddleware, uploadFiles);

// 게시판 즐겨찾기 토글
router.post('/boards/:boardId/favorite', requireAuth, toggleBoardFavorite);

// 게시판 알림 설정 토글
router.post('/boards/:boardId/subscribe', requireAuth, toggleBoardSubscription);

// 게시판별 게시글 목록 조회
router.get('/boards/:boardId/posts', requireAuth, getBoardPostsHandler);

// 게시글 생성
router.post('/boards/:boardId/posts', requireAuth, createPost);

// 게시글 상세 조회
router.get('/posts/:postId', requireAuth, getPostDetail);

// 댓글 작성
router.post('/posts/:postId/comments', requireAuth, createCommentHandler);

// 댓글 좋아요/싫어요 토글
router.post('/comments/:commentId/reaction', requireAuth, toggleCommentReactionHandler);

// 대댓글 작성
router.post('/comments/:commentId/replies', requireAuth, createReplyHandler);

// 댓글 수정
router.patch('/comments/:commentId', requireAuth, updateCommentHandler);

// 댓글 삭제
router.delete('/comments/:commentId', requireAuth, deleteCommentHandler);

// 게시글 수정
router.patch('/posts/:postId', requireAuth, updatePost);

// 게시글 삭제
router.delete('/posts/:postId', requireAuth, deletePost);

// 게시글 좋아요/싫어요 토글
router.post('/posts/:postId/reaction', requireAuth, togglePostReactionHandler);

// 게시글 스크랩 토글
router.post('/posts/:postId/scrap', requireAuth, togglePostScrapHandler);

// 게시글 투표
router.post('/posts/:postId/vote', requireAuth, votePostPollHandler);

// 선호 키워드 목록 조회
router.get('/me/preferred-keywords', requireAuth, getPreferredKeywords);

// 선호 키워드 등록
router.post('/me/preferred-keywords', requireAuth, updatePreferredKeywords);

// 선호 키워드 삭제
router.delete('/me/preferred-keywords', requireAuth, deletePreferredKeywordsHandler);

// 필터링 키워드 목록 조회
router.get('/me/filter-keywords', requireAuth, getFilterKeywords);

// 필터링 키워드 등록
router.post('/me/filter-keywords', requireAuth, addFilterKeywordsHandler);

// 필터링 키워드 삭제
router.delete('/me/filter-keywords', requireAuth, deleteFilterKeywordsHandler);

// 게시판별 사용 가능한 태그 목록 조회
router.get('/boards/:boardId/tags', requireAuth, getBoardTagsHandler);

// 게시판별 선호 태그 목록 조회
router.get('/boards/:boardId/me/preferred-tags', requireAuth, getPreferredTagsHandler);

// 게시판별 선호 태그 등록
router.post('/boards/:boardId/me/preferred-tags', requireAuth, addPreferredTagsHandler);

// 게시판별 선호 태그 삭제
router.delete('/boards/:boardId/me/preferred-tags', requireAuth, deletePreferredTagsHandler);

// SSE 연결
router.get('/notifications/stream', requireAuth, connectSSE);

// 알림 목록 조회
router.get('/notifications', requireAuth, getNotifications);

// 모든 알림 읽음 처리
router.patch('/notifications/read-all', requireAuth, markAllAsRead);

// 읽지 않은 알림 개수
router.get('/notifications/unread-count', requireAuth, getUnreadCount);

// 알림 읽음 처리
router.patch('/notifications/:notificationId/read', requireAuth, markAsRead);

export default router;

