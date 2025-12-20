import { api } from '../axios';

// 선호 키워드 타입
export interface PreferredKeyword {
  id: number;
  name: string;
}

// 선호 키워드 목록 조회 응답 타입
export interface GetPreferredKeywordsResponse {
  userId: number;
  preferredKeywords: PreferredKeyword[];
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
 * 선호 키워드 목록 조회
 * @returns 선호 키워드 목록
 */
export async function getPreferredKeywords(): Promise<GetPreferredKeywordsResponse> {
  const response = await api.get<ApiResponse<GetPreferredKeywordsResponse>>(
    '/community/me/preferred-keywords'
  );
  return response.data.data;
}

/**
 * 선호 키워드 추가
 * @param keywords 추가할 키워드 배열
 * @returns 업데이트된 선호 키워드 목록
 */
export async function addPreferredKeywords(
  keywords: string[]
): Promise<GetPreferredKeywordsResponse> {
  const response = await api.post<ApiResponse<GetPreferredKeywordsResponse>>(
    '/community/me/preferred-keywords',
    { keywords }
  );
  return response.data.data;
}

/**
 * 선호 키워드 삭제
 * @param keywordIds 삭제할 키워드 ID 배열
 * @returns 삭제 후 남은 선호 키워드 목록
 */
export async function deletePreferredKeywords(
  keywordIds: number[]
): Promise<GetPreferredKeywordsResponse> {
  const response = await api.delete<ApiResponse<GetPreferredKeywordsResponse>>(
    '/community/me/preferred-keywords',
    { data: { keywordIds } }
  );
  return response.data.data;
}
