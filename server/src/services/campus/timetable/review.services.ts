import { ReviewModel } from "../../../models/campus/timetable.review.model";

export const ReviewService = {
  getReviews: (courseId: number) => {
    return ReviewModel.getReviewsByCourse(courseId);
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
  }
};
