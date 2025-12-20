import { pool } from "../../config/db";

export interface Review {
  review_id: number;
  course_id: number;    
  user_id: number;      
  rating: number | null;
  content: string | null;
  assignment: string | null;
  group_project: string | null;
  semester: string | null;
}

export const ReviewModel = {
  getReviewsByCourse: async (courseId: number): Promise<Review[]> => {
    const [rows] = await pool.query(
      `
      SELECT 
        review_id, 
        course_id,    
        user_id,     
        rating, 
        content, 
        assignment, 
        group_project, 
        semester
      FROM course_review
      WHERE course_id = ?
      ORDER BY review_id DESC
      `,
      [courseId]
    );

    return rows as Review[];
  },

  // 평균 평점 반환
  getAverageRatingByCourse: async (courseId: number): Promise<number | null> => {
    const [rows] = await pool.query(
      `
      SELECT AVG(rating) AS avg_rating
      FROM course_review
      WHERE course_id = ?
      `,
      [courseId]
    );

    const r = (rows as any[])[0];
    if (!r) return null;
    return r.avg_rating === null ? null : Number(r.avg_rating);
  },

  createReview: async (
    courseId: number,
    userId: number,
    rating: number | null,
    content: string | null,
    assignment: string | null,
    group_project: string | null,
    semester: string | null
  ): Promise<void> => {
    await pool.query(
      `
      INSERT INTO course_review
      (course_id, user_id, rating, content, assignment, group_project, semester)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [courseId, userId, rating, content, assignment, group_project, semester]
    );
  },

  // 리뷰 수정: (course_id, user_id) 기준 (유저당 1개)
  updateReview: async (
    courseId: number,
    userId: number,
    rating: number | null,
    content: string | null,
    assignment: string | null,
    group_project: string | null,
    semester: string | null
  ): Promise<number> => {
    const [res] = await pool.query(
      `
      UPDATE course_review
      SET rating = ?, content = ?, assignment = ?, group_project = ?, semester = ?
      WHERE course_id = ? AND user_id = ?
      `,
      [rating, content, assignment, group_project, semester, courseId, userId]
    );

    // 수정된 행 수 반환
    return (res as any).affectedRows ?? 0;
  },

  // 리뷰 삭제: (course_id, user_id) 기준
  deleteReview: async (courseId: number, userId: number): Promise<number> => {
    const [res] = await pool.query(
      `
      DELETE FROM course_review
      WHERE course_id = ? AND user_id = ?
      `,
      [courseId, userId]
    );

    return (res as any).affectedRows ?? 0;
  },
};
