import { api } from "./axios";

export interface Notice {
  noticeId: number;
  title: string;
  content: string;
  author: string | null;
  postedAt: string; // JSON 날짜는 string으로 옴
  originalUrl: string | null;
  createdAt: string;
}

export interface CreateNoticeDTO {
  title: string;
  content: string;
  author?: string;
}

export const campusApi = {
  // 목록 조회
  getNotices: async (): Promise<Notice[]> => {
    // ❌ 기존: '/api/notices'
    // ✅ 수정: '/notices' (앞에 /api 제거)
    const { data } = await api.get("/notices");
    return data;
  },

  // 생성
  createNotice: async (noticeData: CreateNoticeDTO): Promise<Notice> => {
    // ❌ 기존: '/api/notices'
    // ✅ 수정: '/notices'
    const { data } = await api.post("/notices", noticeData);
    return data;
  },

  // 삭제
  deleteNotice: async (noticeId: number): Promise<void> => {
    // ❌ 기존: `/api/notices/${noticeId}`
    // ✅ 수정: `/notices/${noticeId}`
    await api.delete(`/notices/${noticeId}`);
  },
};
