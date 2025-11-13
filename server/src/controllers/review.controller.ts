// src/controllers/review.controller.ts

import { Request, Response, NextFunction } from "express";
import * as reviewService from "../service/review.service.js";
import { CreateReviewDTO, UpdateReviewDTO } from "../type/review.type.js";

/**
 특정 장소의 모든 리뷰 조회 (GET /:placeId/reviews)
 */
export const getReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const placeId = parseInt(req.params.placeId as string, 10);
    if (isNaN(placeId)) {
      const error = new Error("유효하지 않은 장소 ID입니다.");
      (error as any).status = 400;
      throw error;
    }

    const reviews = await reviewService.getReviewsForPlace(placeId);
    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

/**
 특정 장소에 새 리뷰 작성 (POST /:placeId/reviews)
 */
export const postReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const placeId = parseInt(req.params.placeId as string, 10);
    if (isNaN(placeId)) {
      const error = new Error("유효하지 않은 장소 ID입니다.");
      (error as any).status = 400;
      throw error;
    }

    const reviewData: CreateReviewDTO = req.body;

    const newReview = await reviewService.createReviewForPlace(
      placeId,
      reviewData
    );
    res.status(201).json(newReview);
  } catch (error) {
    next(error);
  }
};

export const putReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // :reviewId 파라미터를 받음
    const reviewId = parseInt(req.params.reviewId as string, 10);
    if (isNaN(reviewId)) {
      const error = new Error("유효하지 않은 리뷰 ID입니다.");
      (error as any).status = 400;
      throw error;
    }

    const reviewData: UpdateReviewDTO = req.body;

    // (인증 가정) reviewData.userId가 로그인한 사용자와 일치하는지 확인

    const updatedReview = await reviewService.updateReview(
      reviewId,
      reviewData
    );
    res.status(200).json(updatedReview);
  } catch (error) {
    next(error);
  }
};

/**
 * 💡 (D) [신규] DELETE /api/places/:placeId/reviews/:reviewId
 */
export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const placeId = parseInt(req.params.placeId as string, 10);
    const reviewId = parseInt(req.params.reviewId as string, 10);

    if (isNaN(placeId) || isNaN(reviewId)) {
      const error = new Error("유효하지 않은 장소 또는 리뷰 ID입니다.");
      (error as any).status = 400;
      throw error;
    }

    // (인증 가정) 로그인한 사용자가 이 reviewId의 주인인지 확인

    // (service에서 placeId는 평점 업데이트를 위해 필요함)
    await reviewService.deleteReview(placeId, reviewId);

    res.status(204).send(); // 204 No Content
  } catch (error) {
    next(error);
  }
};
