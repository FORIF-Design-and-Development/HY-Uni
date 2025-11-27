import { pool } from "../../config/db";

export interface Review {
  review_id: number;
  course_id: number;
  rating: number;
  content: string;
  assignment: string;
  group_project: string;
  semester: string;
}

export const ReviewModel = {
  getReviewsByCourse: async (courseId: number): Promise<Review[]> => {
    const [rows] = await pool.query(
      `
      SELECT review_id, rating, content, assignment, group_project, semester
      FROM course_review
      WHERE course_id = ?
      ORDER BY review_id DESC
      `,
      [courseId]
    );

    return rows as Review[];
  },

  createReview: async (
    courseId: number,
    userId: number,
    rating: number,
    content: string,
    assignment: string,
    group_project: string,
    semester: string
  ): Promise<void> => {
    await pool.query(
      `
      INSERT INTO course_review
      (course_id, user_id, rating, content, assignment, group_project, semester)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [courseId, userId, rating, content, assignment, group_project, semester]
    );
  }
};
