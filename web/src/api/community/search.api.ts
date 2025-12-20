import { api } from '../axios';

// API 응답 래퍼
export interface ApiResponse<T> {
  data: T;
  error: null;
  meta: {
    timestamp: string;
  };
}

// 인기 검색어 랭킹 아이템
export interface PopularSearchRankingItem {
  rank: number;
  query: string;
  count: number;
}

// 인기 검색어 응답
export interface PopularSearchResponse {
  baseTime: string | null;
  rankings: PopularSearchRankingItem[];
}

// 검색 결과 태그
export interface SearchResultTag {
  id: number;
  name: string;
}

// 검색 결과 항목
export interface SearchResult {
  id: number;
  title: string;
  contentSnippet: string;
  board: {
    id: number;
    name: string;
  } | null;
  counts: {
    likes: number;
    comments: number;
    views: number;
  };
  createdAt: string;
  author: {
    nickname: string;
  };
  tags: SearchResultTag[];
  previews: {
    imageUrl: string | null;
    videoUrl: string | null;
  };
}

// 검색 결과 응답
export interface SearchResultsResponse {
  results: SearchResult[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalResults: number;
    totalPages: number;
  };
}

/**
 * 인기 검색어 목록 조회
 * @param limit 조회할 개수 (기본값: 10)
 * @returns 인기 검색어 목록
 */
export async function getPopularSearches(limit: number = 10): Promise<PopularSearchResponse> {
  const response = await api.get<ApiResponse<PopularSearchResponse>>(
    `/community/search/popular?limit=${limit}`
  );
  return response.data.data;
}

/**
 * 게시글 검색
 * @param query 검색어
 * @param page 페이지 번호 (기본값: 1)
 * @param pageSize 페이지 크기 (기본값: 20)
 * @param sortBy 정렬 기준 (기본값: 'relevance')
 * @returns 검색 결과
 */
export async function searchPosts(
  query: string,
  page: number = 1,
  pageSize: number = 20,
  sortBy: 'relevance' = 'relevance'
): Promise<SearchResultsResponse> {
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    pageSize: pageSize.toString(),
    sortBy,
  });

  const response = await api.get<ApiResponse<SearchResultsResponse>>(
    `/community/search?${params.toString()}`
  );
  return response.data.data;
}
