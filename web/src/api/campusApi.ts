import { api } from "./axios";
export type PlaceCategory =
  | "RESTAURANT"
  | "CAFE"
  | "BAR"
  | "STUDY_ROOM"
  | "ETC";
export interface Place {
  placeId: number; // id -> placeId
  name: string;
  address: string;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  kakaoPlaceId: string | null;
  kakaoPlaceUrl: string | null;
  phone: string | null;
  averageRating: number; // avg_rating -> averageRating
  reviewCount: number; // review_count -> reviewCount
  createdAt: string;
  image_url: string;
}

export interface Review {
  reviewId: number;
  placeId: number;
  userId: number;
  rating: number;
  comment: string;
  imageUrl?: string;
  createdAt: string;
  // JOIN된 유저 정보
  nickname: string;
  profileImageUrl?: string;
}
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
export interface CampusBuilding {
  id: number;
  name: string;
  buildingCode: string;
  description: string | null;
  x: number; // % 좌표
  y: number; // % 좌표
  imageUrl: string | null;
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

export const getCampusBuildings = async (
  keyword?: string
): Promise<CampusBuilding[]> => {
  const { data } = await api.get("/map/buildings", {
    params: { q: keyword },
  });
  return data;
};

// // --- (인증 API) ---
// export const checkLoginStatus = async (): Promise<LoginStatus> => {
//   try {
//     const { data } = await api.get<LoginStatus>("/auth/status");
//     return data;
//   } catch (error) {
//     return { isLoggedIn: false, user: null };
//   }
// };

export const getPlaces = async (): Promise<Place[]> => {
  const { data } = await api.get("/places");
  return data;
};

// 장소 상세 조회 (리뷰 포함)
export const getPlaceDetail = async (placeId: string) => {
  // 백엔드에서 { place: Place, reviews: Review[] } 형태로 준다고 가정
  // 만약 백엔드가 객체 하나만 준다면 타입 조정 필요
  const { data } = await api.get(`/places/${placeId}`);
  return data as {
    placeId: number;
    name: string;
    // ...Place 필드들...
    reviews?: Review[]; // 혹은 별도 필드로 올 수도 있음
  } & Place;
};

// 리뷰 작성
export const createReview = async (
  placeId: number,
  reviewData: { rating: number; comment: string }
) => {
  const { data } = await api.post(`/places/${placeId}/reviews`, reviewData);
  return data;
};

// 리뷰 삭제
export const deleteReview = async (reviewId: number) => {
  await api.delete(`/places/reviews/${reviewId}`);
};
