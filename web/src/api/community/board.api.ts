import { api } from '../axios';

// 게시판 타입
export interface Board {
  id: number;
  name: string;
  parentBoardId: number | null;
  isFavorite: boolean;
  isSubscribed: boolean;
}

// 게시판 목록 조회 응답 타입
export interface GetBoardsResponse {
  boards: Board[];
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
 * 게시판 목록 조회
 * @returns 게시판 목록 (사용자별 즐겨찾기/구독 상태 포함)
 */
export async function getBoards(): Promise<GetBoardsResponse> {
  const response = await api.get<ApiResponse<GetBoardsResponse>>(
    '/community/boards'
  );
  return response.data.data;
}

/**
 * 게시판 즐겨찾기 토글
 * @param boardId 게시판 ID
 * @returns 업데이트된 즐겨찾기 상태
 */
export async function toggleBoardFavorite(boardId: number): Promise<{ boardId: number; isFavorite: boolean }> {
  const response = await api.post<ApiResponse<{ boardId: number; isFavorite: boolean }>>(
    `/community/boards/${boardId}/favorite`
  );
  return response.data.data;
}

/**
 * 게시판 알림 설정 토글
 * @param boardId 게시판 ID
 * @returns 업데이트된 구독 상태
 */
export async function toggleBoardSubscription(boardId: number): Promise<{ boardId: number; isSubscribed: boolean }> {
  const response = await api.post<ApiResponse<{ boardId: number; isSubscribed: boolean }>>(
    `/community/boards/${boardId}/subscribe`
  );
  return response.data.data;
}

