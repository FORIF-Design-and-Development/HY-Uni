import { create } from 'zustand';
import { Cafeteria, cafeteriaApi, MealTime, TodayMenusData } from '../api/campus/cafeteria.api';

interface CafeteriaState {
  // 상태
  cafeterias: Cafeteria[];
  todayMenus: TodayMenusData | null;
  selectedMealTime: MealTime | 'all';
  isLoading: boolean;
  error: string | null;

  // 액션
  fetchCafeterias: () => Promise<void>;
  fetchTodayMenus: () => Promise<void>; // ✅ mealTime 파라미터 제거
  setSelectedMealTime: (mealTime: MealTime | 'all') => void;
  clearError: () => void;
}

export const useCafeteriaStore = create<CafeteriaState>((set) => ({
  // 초기 상태
  cafeterias: [],
  todayMenus: null,
  selectedMealTime: 'all',
  isLoading: false,
  error: null,

  // 식당 목록 조회
  fetchCafeterias: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await cafeteriaApi.getCafeteriaList();
      set({ cafeterias: data?.cafeterias || [], isLoading: false });
    } catch (err) {
      const error = err as Error;
      set({ 
        error: error.message || '식당 목록을 불러오는데 실패했습니다.',
        isLoading: false 
      });
    }
  },

  // ✅ 오늘의 메뉴 조회 - 전체 데이터만 가져옴
  fetchTodayMenus: async () => {
    set({ isLoading: true, error: null });
    try {
      // mealTime 파라미터 없이 전체 데이터 가져오기
      const data = await cafeteriaApi.getTodayMenus();
      set({ todayMenus: data, isLoading: false });
    } catch (err) {
      const error = err as Error;
      set({ 
        error: error.message || '메뉴를 불러오는데 실패했습니다.',
        isLoading: false 
      });
    }
  },

  // 식사 시간 선택 (프론트엔드에서만 필터링)
  setSelectedMealTime: (mealTime) => {
    set({ selectedMealTime: mealTime });
  },

  // 에러 초기화
  clearError: () => {
    set({ error: null });
  },
}));