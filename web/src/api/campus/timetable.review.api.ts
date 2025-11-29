import { api } from "../axios";

export const reviewAPI = {
  // 강의별 리뷰 조회
  getReviews: (courseId: number) =>
    api.get(`/reviews/${courseId}`),

  // 리뷰 작성
  createReview: (data: any) =>
    api.post(`/reviews`, data),
};
