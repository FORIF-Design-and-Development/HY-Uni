import { ReviewModel } from "../../../models/campus/timetable.review.model";

export const ReviewService = {
  getReviews: (courseId: number) => {
    return ReviewModel.getReviewsByCourse(courseId);
  },

  // 평균 평점 반환
  getAverageRating: (courseId: number) => {
    return ReviewModel.getAverageRatingByCourse(courseId);
  },

  createReview: (
    courseId: number,
    userId: number,
    rating: number,
    content: string,
    assignment: string,
    group_project: string,
    semester: string
  ) => {
    return ReviewModel.createReview(
      courseId,
      userId,
      rating,
      content,
      assignment,
      group_project,
      semester
    );
  },

  // 리뷰 수정
  updateReview: (
    courseId: number,
    userId: number,
    rating: number,
    content: string,
    assignment: string,
    group_project: string,
    semester: string
  ) => {
    return ReviewModel.updateReview(
      courseId,
      userId,
      rating,
      content,
      assignment,
      group_project,
      semester
    );
  },

  // 리뷰 삭제
  deleteReview: (courseId: number, userId: number) => {
    return ReviewModel.deleteReview(courseId, userId);
  },
};
