import { api } from '../axios';

// 게시글 목록 정렬 기준
export type BoardPostSortBy = 'latest' | 'likes' | 'comments' | 'views';

// 게시글 목록 조회 옵션
export interface GetBoardPostsOptions {
  boardId: number;
  page?: number;
  pageSize?: number;
  sortBy?: BoardPostSortBy;
}

// 게시글 태그
export interface PostTag {
  id: number;
  name: string;
}

// 게시글 목록 항목
export interface BoardPostListItem {
  id: number;
  title: string;
  content: string;
  contentSnippet: string;
  board: {
    id: number;
    name: string;
  };
  recommendationReason?: {
    matchedKeywords: string[];
    matchedTags: string[];
  };
  counts: {
    likes: number;
    comments: number;
    views: number;
  };
  createdAt: string;
  author: {
    nickname: string;
  };
  tags: PostTag[];
  previews: {
    imageUrl: string | null;
    videoUrl: string | null;
  };
}

// 게시판 정보
export interface BoardInfo {
  id: number;
  name: string;
  description: string | null;
}

// 페이지네이션 정보
export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
}

// 게시글 목록 응답
export interface BoardPostListResponse {
  boardInfo: BoardInfo;
  posts: BoardPostListItem[];
  pagination: Pagination;
}

// API 응답 래퍼
export interface ApiResponse<T> {
  data: T;
  error: null;
  meta: {
    timestamp: string;
  };
}

/**
 * 게시판별 게시글 목록 조회
 * @param options 게시글 목록 조회 옵션
 * @returns 게시글 목록 응답
 */
export async function getBoardPosts(
  options: GetBoardPostsOptions
): Promise<BoardPostListResponse> {
  const { boardId, page = 1, pageSize = 20, sortBy = 'latest' } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    sortBy,
  });

  const response = await api.get<ApiResponse<BoardPostListResponse>>(
    `/community/boards/${boardId}/posts?${params.toString()}`
  );

  return response.data.data;
}

