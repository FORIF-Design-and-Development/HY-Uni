import { Router } from "express";
import {
  getReviews,
  createReview,
  updateReview,     
  deleteReview,    
  getRatingAverage   
} from "../../controllers/campus/timetable.review.controller";

import { requireAuth } from "../../middlewares/error";

const router = Router();

router.get("/:courseId", getReviews);

// 평균 평점
router.get("/:courseId/avg", getRatingAverage);

// 작성/수정/삭제는 로그인 필수
router.post("/", requireAuth, createReview);
router.put("/:courseId", requireAuth, updateReview);
router.delete("/:courseId", requireAuth, deleteReview);

export default router;
