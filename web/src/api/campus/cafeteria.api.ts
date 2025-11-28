import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// 공통 응답 타입
export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
  meta: null;
}

// 식당 정보
export interface Cafeteria {
  cafeteria_id: number;
  cafeteria_name: string;
  location: string;
  operating_hours: string;
}

// 식당 상세 (평점, 리뷰 포함)
export interface CafeteriaDetail extends Cafeteria {
  average_rating?: number;
  review_count?: number;
}

// 메뉴 응답
export interface MenuResponse {
  menu_id: number;
  description: string;
  price: number;
  image_url: string | null;
}

// 식당별 메뉴
export interface CafeteriaWithMenus {
  cafeteria_id: number;
  cafeteria_name: string;
  breakfast: MenuResponse[];
  lunch: MenuResponse[];
  dinner: MenuResponse[];
}

// 오늘의 전체 메뉴 응답
export interface TodayMenusData {
  date: string;
  cafeterias: CafeteriaWithMenus[];
}

// 특정 식당 메뉴 응답
export interface CafeteriaMenusData {
  served_date: string;
  breakfast: MenuResponse[];
  lunch: MenuResponse[];
  dinner: MenuResponse[];
}

export type MealTime = 'breakfast' | 'lunch' | 'dinner';

// API 함수들
export const cafeteriaApi = {
  // 식당 목록 조회
  getCafeteriaList: async () => {
    const response = await axios.get<ApiResponse<{ cafeterias: Cafeteria[] }>>(
      `${API_BASE_URL}/cafeterias`
    );
    return response.data.data;
  },

  // 식당 상세 조회
  getCafeteriaDetail: async (cafeteriaId: number) => {
    const response = await axios.get<ApiResponse<CafeteriaDetail>>(
      `${API_BASE_URL}/cafeterias/${cafeteriaId}`
    );
    return response.data.data;
  },

// 특정 식당 메뉴 조회
  getCafeteriaMenus: async (cafeteriaId: number, mealTime?: MealTime, servedDate?: string) => {
    const params: Record<string, string> = {};  // ✅ any 대신 명확한 타입 지정
    if (mealTime) params.meal_time = mealTime;
    if (servedDate) params.served_date = servedDate;
    
    const response = await axios.get<ApiResponse<CafeteriaMenusData>>(
      `${API_BASE_URL}/cafeterias/${cafeteriaId}/menus`,
      { params }
    );
    return response.data.data;
  },

  // 오늘의 전체 메뉴 조회
  getTodayMenus: async (mealTime?: MealTime) => {
    const params = mealTime ? { meal_time: mealTime } : {};
    const response = await axios.get<ApiResponse<TodayMenusData>>(
      `${API_BASE_URL}/menus/today`,
      { params }
    );
    return response.data.data;
  },
};