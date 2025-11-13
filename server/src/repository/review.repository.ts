// src/repositories/review.repository.ts

import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool as db } from "../config/db.js";
import {
  Review,
  CreateReviewDTO,
  UpdateReviewDTO,
} from "../type/review.type.js";

// 1. DB Row 인터페이스
interface ReviewRow extends RowDataPacket {
  review_id: number;
  place_id: number;
  user_id: number;
  // 💡 [수정] DECIMAL(rating)은 string으로 반환됩니다.
  rating: string;
  comment: string | null;
  image_url: string | null;
  created_at: string;
}

// 2. Row -> Type 매퍼
const mapRowToReview = (row: ReviewRow): Review => ({
  reviewId: row.review_id,
  placeId: row.place_id,
  userId: row.user_id,
  // 💡 [수정] parseFloat()를 사용해 string을 number로 변환합니다.
  rating: parseFloat(row.rating),
  comment: row.comment,
  imageUrl: row.image_url,
  createdAt: new Date(row.created_at),
});

/**
 * 특정 장소(placeId)의 모든 리뷰 조회
 */
export const findByPlaceId = async (placeId: number): Promise<Review[]> => {
  const query = `
    SELECT * FROM review 
    WHERE place_id = ? 
    ORDER BY created_at DESC
  `;
  const [rows] = await db.query<ReviewRow[]>(query, [placeId]);
  return rows.map(mapRowToReview);
};

/**
 * ID로 특정 리뷰 1개 조회
 */
export const findById = async (reviewId: number): Promise<Review | null> => {
  const query = "SELECT * FROM review WHERE review_id = ?";
  const [rows] = await db.query<ReviewRow[]>(query, [reviewId]);

  const firstRow = rows[0];
  if (firstRow) {
    return mapRowToReview(firstRow);
  }

  return null;
};

/**
 * 새 리뷰 생성
 */
export const create = async (
  placeId: number,
  userId: number,
  reviewData: CreateReviewDTO
): Promise<number> => {
  const { rating, comment, imageUrl } = reviewData;
  const query = `
    INSERT INTO review (place_id, user_id, rating, comment, image_url)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await db.execute<ResultSetHeader>(query, [
    placeId,
    userId,
    rating,
    comment,
    imageUrl,
  ]);
  return result.insertId;
};

export const update = async (
  reviewId: number,
  reviewData: UpdateReviewDTO
): Promise<boolean> => {
  const { rating, comment, imageUrl } = reviewData;
  const query = `
    UPDATE review
    SET rating = ?, comment = ?, image_url = ?
    WHERE review_id = ?
  `;

  // ⭐️ (인증 가정) 실제로는 WHERE review_id = ? AND user_id = ? 로
  //    본인만 수정할 수 있게 해야 합니다.

  const [result] = await db.execute<ResultSetHeader>(query, [
    rating,
    comment,
    imageUrl,
    reviewId,
  ]);

  return result.affectedRows > 0; // 1이면 성공, 0이면 실패
};

/**
 * 💡 (D) [신규] ID로 특정 리뷰 삭제
 */
export const remove = async (reviewId: number): Promise<boolean> => {
  const query = "DELETE FROM review WHERE review_id = ?";

  // ⭐️ (인증 가정) 실제로는 WHERE review_id = ? AND user_id = ? 로
  //    본인만 삭제할 수 있게 해야 합니다.

  const [result] = await db.execute<ResultSetHeader>(query, [reviewId]);
  return result.affectedRows > 0;
};
