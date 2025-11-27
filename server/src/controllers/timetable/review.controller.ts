import { Request, Response, NextFunction } from "express";
import { ReviewService } from "../../services/campus/timetable/review.services";

export const getReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course_id = Number(req.params.courseId || req.params.id);
    const reviews = await ReviewService.getReviews(course_id);
    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
};

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.body.course_id);
    const userId = 2; // 테스트용, 로그인 연동 시 변경

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
      return res.status(409).json({ error: "이미 리뷰를 작성하셨습니다." });
    }

    next(err);
  }
};
