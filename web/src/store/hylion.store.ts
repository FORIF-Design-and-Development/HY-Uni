import { create } from 'zustand';
import {
    changeCurrentIcon,
    fetchHylionCollection,
    fetchMissionProgress,
    fetchMissions,
    HylionIcon,
    Mission,
    MissionProgressResponse
} from '../api/campus/hylion.api';

interface HylionState {
  // 상태
  currentIcon: HylionIcon | null;
  unlockedIcons: HylionIcon[];
  lockedIcons: HylionIcon[];
  stats: {
    totalIcons: number;
    totalUnlocked: number;
    completionRate: number;
  };
  missions: Mission[];
  missionProgress: MissionProgressResponse[];
  isLoading: boolean;
  error: string | null;

  // 액션
  fetchCollection: (token: string) => Promise<void>;
  fetchMissions: (token: string) => Promise<void>;
  fetchMissionProgress: (token: string) => Promise<void>;
  changeIcon: (token: string, iconId: number) => Promise<void>;
  clearError: () => void;
}

export const useHylionStore = create<HylionState>((set, get) => ({
  // 초기 상태
  currentIcon: null,
  unlockedIcons: [],
  lockedIcons: [],
  stats: {
    totalIcons: 0,
    totalUnlocked: 0,
    completionRate: 0,
  },
  missions: [],
  missionProgress: [],
  isLoading: false,
  error: null,

  // 컬렉션 조회
  fetchCollection: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchHylionCollection(token);
      set({
        currentIcon: data.currentIcon,
        unlockedIcons: data.unlockedIcons,
        lockedIcons: data.lockedIcons,
        stats: data.stats,
        isLoading: false,
      });
    } catch (err) {
      const error = err as Error;
      set({
        error: error.message || '컬렉션을 불러오는데 실패했습니다.',
        isLoading: false,
      });
    }
  },

  // 미션 목록 조회
  fetchMissions: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchMissions(token);
      set({ missions: data, isLoading: false });
    } catch (err) {
      const error = err as Error;
      set({
        error: error.message || '미션 목록을 불러오는데 실패했습니다.',
        isLoading: false,
      });
    }
  },

    // 미션 진행도 조회
  fetchMissionProgress: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchMissionProgress(token);

      // ✅ [추가] API에서 MissionProgressResponse[]로 정규화해서 내려주므로
      // store에서는 그대로 저장한다.
      set({ missionProgress: data, isLoading: false });
    } catch (err) {
      const error = err as Error;
      set({
        error: error.message || '미션 진행도를 불러오는데 실패했습니다.',
        isLoading: false,
      });
    }
  },


  // 현재 아이콘 변경
  changeIcon: async (token: string, iconId: number) => {
    set({ isLoading: true, error: null });
    try {
      const result = await changeCurrentIcon(token, iconId);

      // 현재 아이콘 업데이트 + 컬렉션 내 isCurrentIcon 상태 업데이트
      const { unlockedIcons } = get();
      const updatedUnlockedIcons = unlockedIcons.map((icon) => ({
        ...icon,
        isCurrentIcon: icon.iconId === iconId,
      }));

      set({
        currentIcon: result.currentIcon,
        unlockedIcons: updatedUnlockedIcons,
        isLoading: false,
      });
    } catch (err) {
      const error = err as Error;
      set({
        error: error.message || '아이콘 변경에 실패했습니다.',
        isLoading: false,
      });
      throw error;
    }
  },

  // 에러 초기화
  clearError: () => {
    set({ error: null });
  },
}));
