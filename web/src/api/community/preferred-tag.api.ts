import { api } from '../axios';

// 태그 타입
export interface Tag {
  id: number;
  name: string;
}

// 게시판별 사용 가능한 태그 목록 조회 응답 타입
export interface GetBoardTagsResponse {
  boardId: number;
  availableTags: Tag[];
}

// 게시판별 선호 태그 목록 조회 응답 타입
export interface GetPreferredTagsResponse {
  boardId: number;
  preferredTags: Tag[];
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
 * 게시판별 사용 가능한 태그 목록 조회
 * @param boardId 게시판 ID
 * @returns 사용 가능한 태그 목록
 */
export async function getBoardTags(boardId: number): Promise<GetBoardTagsResponse> {
  const response = await api.get<ApiResponse<GetBoardTagsResponse>>(
    `/community/boards/${boardId}/tags`
  );
  return response.data.data;
}

/**
 * 게시판별 선호 태그 목록 조회
 * @param boardId 게시판 ID
 * @returns 선호 태그 목록
 */
export async function getPreferredTags(boardId: number): Promise<GetPreferredTagsResponse> {
  const response = await api.get<ApiResponse<GetPreferredTagsResponse>>(
    `/community/boards/${boardId}/me/preferred-tags`
  );
  return response.data.data;
}

/**
 * 게시판별 선호 태그 추가
 * @param boardId 게시판 ID
 * @param tagIds 추가할 태그 ID 배열
 * @returns 업데이트된 선호 태그 목록
 */
export async function addPreferredTags(
  boardId: number,
  tagIds: number[]
): Promise<GetPreferredTagsResponse> {
  const response = await api.post<ApiResponse<GetPreferredTagsResponse>>(
    `/community/boards/${boardId}/me/preferred-tags`,
    { tagIds }
  );
  return response.data.data;
}

/**
 * 게시판별 선호 태그 삭제
 * @param boardId 게시판 ID
 * @param tagIds 삭제할 태그 ID 배열
 * @returns 삭제 후 남은 선호 태그 목록
 */
export async function deletePreferredTags(
  boardId: number,
  tagIds: number[]
): Promise<GetPreferredTagsResponse> {
  const response = await api.delete<ApiResponse<GetPreferredTagsResponse>>(
    `/community/boards/${boardId}/me/preferred-tags`,
    { data: { tagIds } }
  );
  return response.data.data;
}

// 모든 게시판의 태그와 선호 태그를 한 번에 조회하는 응답 타입
export interface GetAllBoardsTagsWithPreferencesResponse {
  boards: Array<{
    boardId: number;
    boardName: string;
    availableTags: Tag[];
    preferredTags: Tag[];
  }>;
}

/**
 * 모든 게시판의 태그와 선호 태그를 한 번에 조회
 * @returns 모든 게시판의 태그와 선호 태그 목록
 */
export async function getAllBoardsTagsWithPreferences(): Promise<GetAllBoardsTagsWithPreferencesResponse> {
  const response = await api.get<ApiResponse<GetAllBoardsTagsWithPreferencesResponse>>(
    '/community/boards/me/tags-with-preferences'
  );
  return response.data.data;
}

