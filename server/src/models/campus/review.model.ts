import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool as db } from "../../config/db";

// ==========================================
// 1. Type Definitions (데이터 형태 정의)
// ==========================================

// Review 인터페이스 (DB 테이블과 1:1 매핑)
export interface Review {
  reviewId: number;
  placeId: number;
  userId: number;
  rating: number;
  comment: string | null;
  imageUrl: string | null;
  createdAt: Date;
  // (향후 확장) user 테이블과 JOIN하여 사용자 이름 등을 포함
  // username?: string;
}

// 리뷰 생성을 위한 DTO
export interface CreateReviewDTO {
  // ⭐️ "누가" 썼는지는 req.body가 아닌 '인증(Auth)'을 통해 받아오는 것이 정석입니다.
  // (여기서는 '가정'하에, 서비스 계층에서 user_id를 주입받습니다.)
  rating: number;
  comment?: string | null;
  imageUrl?: string | null;

  // 💡 (가정/임시) 클라이언트가 임시로 ID를 보낸다고 가정
  userId: number;
}

// 리뷰 수정을 위한 DTO
export interface UpdateReviewDTO {
  rating: number;
  comment?: string | null;
  imageUrl?: string | null;

  // (가정/임시)
  userId: number;
}

// ==========================================
// 2. Internal DB Helpers (DB 매핑용)
// ==========================================

// DB Row 인터페이스
interface ReviewRow extends RowDataPacket {
  review_id: number;
  place_id: number;
  user_id: number;
  // 💡 DECIMAL(rating)은 string으로 반환됩니다.
  rating: string;
  comment: string | null;
  image_url: string | null;
  created_at: string;
}

// Row -> Type 매퍼
const mapRowToReview = (row: ReviewRow): Review => ({
  reviewId: row.review_id,
  placeId: row.place_id,
  userId: row.user_id,
  // 💡 parseFloat()를 사용해 string을 number로 변환합니다.
  rating: parseFloat(row.rating),
  comment: row.comment,
  imageUrl: row.image_url,
  createdAt: new Date(row.created_at),
});

// ==========================================
// 3. Data Access Logic (데이터 접근 함수)
// ==========================================

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
  
  // DTO에 userId가 있더라도, 함수의 인자로 받은 userId를 사용하는 것이 더 명확합니다.
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

/**
 * 리뷰 수정
 */
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
 * ID로 특정 리뷰 삭제
 */
export const remove = async (reviewId: number): Promise<boolean> => {
  const query = "DELETE FROM review WHERE review_id = ?";

  // ⭐️ (인증 가정) 실제로는 WHERE review_id = ? AND user_id = ? 로
  //    본인만 삭제할 수 있게 해야 합니다.

  const [result] = await db.execute<ResultSetHeader>(query, [reviewId]);
  return result.affectedRows > 0;
};