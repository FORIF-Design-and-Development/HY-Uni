// src/types/review.type.ts

// 1. Review 인터페이스 (DB 테이블과 1:1 매핑)
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

// 2. 리뷰 생성을 위한 DTO (클라이언트가 보내는 데이터)
export interface CreateReviewDTO {
  // ⭐️ "누가" 썼는지는 req.body가 아닌 '인증(Auth)'을 통해 받아오는 것이 정석입니다.
  // (여기서는 '가정'하에, 서비스 계층에서 user_id를 주입받습니다.)
  rating: number;
  comment?: string | null;
  imageUrl?: string | null;

  // 💡 (가정/임시) '사용자 구현 가정'에 따라, 클라이언트가 임시로 ID를 보냅니다.
  userId: number;
}

export interface UpdateReviewDTO {
  rating: number;
  comment?: string | null;
  imageUrl?: string | null;

  // (가정/임시)
  userId: number;
}
