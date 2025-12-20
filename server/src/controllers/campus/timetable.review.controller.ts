import { Request, Response, NextFunction } from "express";
import { ReviewService } from "../../services/campus/timetable/review.services";

export const getReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course_id = Number(req.params.courseId || req.params.id);

    // courseId 검증 (NaN 방지)
    if (!Number.isFinite(course_id) || course_id <= 0) {
      return res.status(400).json({ success: false, error: "courseId is invalid" });
    }

    const reviews = await ReviewService.getReviews(course_id);
    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
};

// 평균 평점 반환
export const getRatingAverage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);

    // courseId 검증
    if (!Number.isFinite(courseId) || courseId <= 0) {
      return res.status(400).json({ success: false, error: "courseId is invalid" });
    }

    const avg = await ReviewService.getAverageRating(courseId);
    res.json({ success: true, data: { avg_rating: avg } });
  } catch (err) {
    next(err);
  }
};

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.body.course_id);

    // courseId 검증
    if (!Number.isFinite(courseId) || courseId <= 0) {
      return res.status(400).json({ success: false, error: "course_id is invalid" });
    }

    // requireAuth에서 주입한 로그인 userId 사용
    const userId = Number((req as any).userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { rating, content, assignment, group_project, semester } = req.body;

    await ReviewService.createReview(
      courseId,
      userId,
      rating,
      content,
      assignment,
      group_project,
      semester
    );

    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, error: "이미 리뷰를 작성하셨습니다." });
    }

    next(err);
  }
};

// 리뷰 수정
export const updateReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);

    if (!Number.isFinite(courseId) || courseId <= 0) {
      return res.status(400).json({ success: false, error: "courseId is invalid" });
    }

    const userId = Number((req as any).userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { rating, content, assignment, group_project, semester } = req.body;

    const affected = await ReviewService.updateReview(
      courseId,
      userId,
      rating,
      content,
      assignment,
      group_project,
      semester
    );

    if (affected === 0) {
      return res.status(404).json({ success: false, error: "수정할 리뷰가 없습니다." });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// 리뷰 삭제
export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);

    if (!Number.isFinite(courseId) || courseId <= 0) {
      return res.status(400).json({ success: false, error: "courseId is invalid" });
    }

    const userId = Number((req as any).userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const affected = await ReviewService.deleteReview(courseId, userId);

    if (affected === 0) {
      return res.status(404).json({ success: false, error: "삭제할 리뷰가 없습니다." });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
