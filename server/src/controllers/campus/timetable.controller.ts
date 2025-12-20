import { Request, Response, NextFunction } from "express";
import { TimetableModel } from "../../models/campus/timetable.model";

export const getTimetable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setId = Number(req.query.setId);

    // NaN까지 거르는 유효성 체크
    if (!Number.isFinite(setId) || setId <= 0) {
      return res.status(400).json({ error: "setId is required" });
    }

    const rows = await TimetableModel.getTimetableBySet(setId);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

export const resetTimetable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setId = Number(req.query.setId);

    // (setId == null)는 NaN을 못 잡음
    if (!Number.isFinite(setId) || setId <= 0) {
      return res.status(400).json({ error: "setId is required" });
    }

    await TimetableModel.deleteTimetableBySet(setId);
    res.json({ success: true});
  } catch (err) {
    next(err);
  }
};

export const addCourseToTimetable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { setId, courseId, day, start, end } = req.body;

    // 숫자 유효성까지 체크 (NaN 방지)
    const nSetId = Number(setId);
    const nCourseId = Number(courseId);

    if (!Number.isFinite(nSetId) || !Number.isFinite(nCourseId) || nSetId <= 0 || nCourseId <= 0) {
      return res.status(400).json({ error: "setId and courseId are required" });
    }

    await TimetableModel.addCourseToSet(
      nSetId,
      nCourseId,
      day ?? null,
      start ?? null,
      end ?? null
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
