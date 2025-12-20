import { api } from '../axios';

// 추천 게시글 타입
export interface RecommendedPost {
  id: number;
  title: string;
  contentPreview: string;
  likesCount: number;
  commentCount: number;
  originalBoard: {
    id: number;
    name: string;
  };
  createdAt: string;
  recommendationReason?: {
    matchedKeywords: string[];
    matchedTags: string[];
  };
}

// 즐겨찾기 게시판의 최신 게시글 타입
export interface LatestPost {
  id: number;
  title: string;
  contentPreview: string;
  likesCount: number;
  commentCount: number;
  createdAt: string;
}

// 즐겨찾기 게시판 타입
export interface FavoriteBoardWithLatestPost {
  id: number;
  name: string;
  latestPost: LatestPost | null;
}

// 홈 화면 데이터 응답 타입
export interface HomeDataResponse {
  unReadNotificationCount: number;
  userPreferences: {
    keywords: Array<{ name: string }>;
    tags: Array<{ id: number; name: string }>;
  };
  recommendedPosts: RecommendedPost[];
  favoriteBoards: FavoriteBoardWithLatestPost[];
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
 * 커뮤니티 홈 화면 데이터 조회
 * @returns 홈 화면 데이터
 */
export async function getHomeData(): Promise<HomeDataResponse> {
  const response = await api.get<ApiResponse<HomeDataResponse>>(
    '/community/home'
  );
  return response.data.data;
}

