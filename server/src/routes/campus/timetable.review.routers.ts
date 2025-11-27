import { Router } from "express";
import { getReviews, createReview } from "../../controllers/campus/timetable.review.controller";

const router = Router();

router.get("/:courseId", getReviews);
router.post("/", createReview);

export default router;
