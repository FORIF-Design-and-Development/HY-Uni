import { api } from "../axios";

export const reviewAPI = {
  // 강의별 리뷰 조회
  getReviews: (courseId: number) => api.get(`/reviews/${courseId}`),

  // 강의별 평균 평점 조회
  getRatingAverage: (courseId: number) => api.get(`/reviews/${courseId}/avg`),

  // 리뷰 작성
  createReview: (data: any) => api.post(`/reviews`, data),

  // 리뷰 수정
  updateReview: (courseId: number, data: any) => api.put(`/reviews/${courseId}`, data),

  // 리뷰 삭제
  deleteReview: (courseId: number) => api.delete(`/reviews/${courseId}`),
};
