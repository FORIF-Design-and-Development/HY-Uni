import { api } from '../axios';

// 필터링 키워드 타입
export interface FilterKeyword {
  id: number;
  name: string;
}

// 필터링 키워드 목록 조회 응답 타입
export interface GetFilterKeywordsResponse {
  userId: number;
  filterKeywords: FilterKeyword[];
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
 * 필터링 키워드 목록 조회
 * @returns 필터링 키워드 목록
 */
export async function getFilterKeywords(): Promise<GetFilterKeywordsResponse> {
  const response = await api.get<ApiResponse<GetFilterKeywordsResponse>>(
    '/community/me/filter-keywords'
  );
  return response.data.data;
}

/**
 * 필터링 키워드 추가
 * @param keywords 추가할 키워드 배열
 * @returns 업데이트된 필터링 키워드 목록
 */
export async function addFilterKeywords(
  keywords: string[]
): Promise<GetFilterKeywordsResponse> {
  const response = await api.post<ApiResponse<GetFilterKeywordsResponse>>(
    '/community/me/filter-keywords',
    { keywords }
  );
  return response.data.data;
}

/**
 * 필터링 키워드 삭제
 * @param keywordIds 삭제할 키워드 ID 배열
 * @returns 삭제 후 남은 필터링 키워드 목록
 */
export async function deleteFilterKeywords(
  keywordIds: number[]
): Promise<GetFilterKeywordsResponse> {
  const response = await api.delete<ApiResponse<GetFilterKeywordsResponse>>(
    '/community/me/filter-keywords',
    { data: { keywordIds } }
  );
  return response.data.data;
}

