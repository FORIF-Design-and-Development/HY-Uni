// web/src/api/seats.api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// 좌석 정보 인터페이스
export interface SeatRoom {
  name: string;
  total: number;
  occupied: number;
  waiting: number;
  available: number;
}

export interface LibrarySeatsResponse {
  success: boolean;
  message: string;
  totalCount: number;
  rooms: SeatRoom[];
}

// API 응답 래퍼 인터페이스
export interface ApiResponse<T> {
  data: T;
  error: null | {
    code: string;
    message: string;
  };
  meta: null;
}

/**
 * 도서관 좌석 정보 조회
 * @returns 도서관 좌석 현황 데이터
 */
export const fetchLibrarySeats = async (): Promise<LibrarySeatsResponse> => {
  try {
    const response = await axios.get<ApiResponse<LibrarySeatsResponse>>(
      `${API_BASE_URL}/seats`
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.data;
  } catch (error) {
    console.error('[API] 도서관 좌석 조회 실패:', error);
    throw error;
  }
};

/**
 * 좌석 이용률 계산
 * @param occupied 사용 중인 좌석
 * @param total 전체 좌석
 * @returns 이용률 (0-100)
 */
export const calculateOccupancyRate = (
  occupied: number,
  total: number
): number => {
  if (total === 0) return 0;
  return Math.round((occupied / total) * 100);
};

/**
 * 좌석 가용률 계산
 * @param available 이용 가능한 좌석
 * @param total 전체 좌석
 * @returns 가용률 (0-100)
 */
export const calculateAvailabilityRate = (
  available: number,
  total: number
): number => {
  if (total === 0) return 0;
  return Math.round((available / total) * 100);
};