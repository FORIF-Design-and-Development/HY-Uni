// src/services/review.service.ts

import {
  Review,
  CreateReviewDTO,
  UpdateReviewDTO,
} from "../../../models/campus/review.model";
import * as reviewRepository from "../../../models/campus/review.model";

import * as placeRepository from "../../../models/campus/place.model";

/**
 * 특정 장소의 모든 리뷰를 조회
 */
export const getReviewsForPlace = async (
  placeId: number
): Promise<Review[]> => {
  // (향후 확장: user 테이블과 JOIN하여 'username'도 가져오기)
  return await reviewRepository.findByPlaceId(placeId);
};

/**
 * 특정 장소에 새 리뷰를 생성
 */
export const createReviewForPlace = async (
  placeId: number,
  reviewData: CreateReviewDTO
): Promise<Review> => {
  const userId = reviewData.userId;
  if (!userId) {
    const error = new Error("유효하지 않은 사용자 ID입니다.");
    (error as any).status = 400;
    throw error;
  }

  //리뷰 생성
  const newReviewId = await reviewRepository.create(
    placeId,
    userId,
    reviewData
  );

  // 리뷰 생성 후, 해당 장소의 평점/리뷰 수 '자동 업데이트'
  await placeRepository.updatePlaceRating(placeId);

  const createdReview = await reviewRepository.findById(newReviewId);
  if (!createdReview) {
    // (이론상 발생하기 어렵지만) 예외 처리
    const error = new Error("리뷰 생성 후 조회에 실패했습니다.");
    (error as any).status = 500;
    throw error;
  }

  return createdReview;
};

export const updateReview = async (
  reviewId: number,
  reviewData: UpdateReviewDTO
): Promise<Review> => {
  // (인증 가정) reviewId와 reviewData.userId를 검사해야 함

  // 1. 리뷰 수정
  const success = await reviewRepository.update(reviewId, reviewData);
  if (!success) {
    const error = new Error("리뷰를 찾을 수 없거나 수정 권한이 없습니다.");
    (error as any).status = 404;
    throw error;
  }

  // 2. 수정된 "진짜" 객체를 다시 조회
  const updatedReview = await reviewRepository.findById(reviewId);
  if (!updatedReview) {
    const error = new Error("리뷰 수정 후 조회에 실패했습니다.");
    (error as any).status = 500;
    throw error;
  }

  // 3. 해당 장소의 평점/리뷰 수 '자동 업데이트' (트리거)
  await placeRepository.updatePlaceRating(updatedReview.placeId);

  return updatedReview;
};

/**
 * 💡 (D) [신규] 특정 리뷰를 삭제합니다.
 */
export const deleteReview = async (
  placeId: number, // 평점 업데이트를 위해 placeId도 받음
  reviewId: number
): Promise<void> => {
  // (인증 가정) reviewId와 userId를 검사해야 함

  // 1. 리뷰 삭제
  const success = await reviewRepository.remove(reviewId);
  if (!success) {
    const error = new Error("리뷰를 찾을 수 없거나 삭제 권한이 없습니다.");
    (error as any).status = 404;
    throw error;
  }

  // 2. 해당 장소의 평점/리뷰 수 '자동 업데이트' (트리거)
  await placeRepository.updatePlaceRating(placeId);
};
