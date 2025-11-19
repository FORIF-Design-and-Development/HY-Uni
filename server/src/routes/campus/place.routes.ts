// src/routes/place.route.ts

import { Router } from "express";
// .js 확장자로 import 합니다.
import * as placeController from "../../controllers/campus/place.controller";
import { reviewRouter } from "./review.routes";

// 'noticeRouter'처럼 'placeRouter'를 만들어 export 합니다.
export const placeRoutes = Router();

// --- 학교 주변 시설 (Place) API 라우트 ---

/**
 * @route   GET /
 * @desc    장소 전체 목록 조회
 */
placeRoutes.get("/", placeController.getPlaceList);

/**
 * @route   GET /:id
 * @desc    장소 상세 조회
 */
placeRoutes.get("/:id", placeController.getPlaceDetail);

/**
 * @route   POST /
 * @desc    새 장소 생성
 */
placeRoutes.post("/", placeController.postPlace);

// (추후 수정/삭제 라우트 추가)
// placeRouter.put('/:id', placeController.putPlace);
// placeRouter.delete('/:id', placeController.deletePlace);
placeRoutes.use("/:placeId/reviews", reviewRouter);
