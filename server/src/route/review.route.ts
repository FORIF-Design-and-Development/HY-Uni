// src/routes/review.route.ts

import { Router } from "express";
import * as reviewController from "../controllers/review.controller.js";

export const reviewRouter = Router({ mergeParams: true });

// GET /api/places/:placeId/reviews
reviewRouter.get("/", reviewController.getReviews);

// POST /api/places/:placeId/reviews
reviewRouter.post("/", reviewController.postReview);

reviewRouter.put("/:reviewId", reviewController.putReview);

reviewRouter.delete("/:reviewId", reviewController.deleteReview);
