// src/store/useNoticeStore.ts

import { create } from "zustand";
import { campusApi, Notice, CreateNoticeDTO } from "../api/campusApi";

// 1. 스토어의 타입(Interface) 정의
interface NoticeStore {
  notices: Notice[]; // 여기가 명확해야 'n'이 any가 되지 않습니다.
  isLoading: boolean;
  error: string | null;

  fetchNotices: () => Promise<void>;
  addNotice: (data: CreateNoticeDTO) => Promise<void>;
  removeNotice: (id: number) => Promise<void>;
}

// 2. create 뒤에 <NoticeStore>를 반드시 붙여야 합니다.
export const useNoticeStore = create<NoticeStore>((set) => ({
  notices: [],
  isLoading: false,
  error: null,

  fetchNotices: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await campusApi.getNotices();
      set({ notices: data, isLoading: false });
    } catch (err) {
      console.error(err);
      set({ error: "데이터 로딩 실패", isLoading: false });
    }
  },

  addNotice: async (data) => {
    try {
      const newNotice = await campusApi.createNotice(data);
      // state의 타입을 알기 때문에 state.notices가 Notice[]임을 인지함
      set((state) => ({ notices: [newNotice, ...state.notices] }));
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  removeNotice: async (id) => {
    try {
      await campusApi.deleteNotice(id);
      // 3. 여기서 'n' 에러가 해결됩니다.
      set((state) => ({
        notices: state.notices.filter((n) => n.noticeId !== id),
      }));
    } catch (err) {
      console.error(err);
      alert("삭제 실패");
    }
  },
}));
