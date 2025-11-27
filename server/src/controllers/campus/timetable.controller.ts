import { Request, Response, NextFunction } from "express";
import { TimetableModel } from "../../models/campus/timetable.model";

export const getTimetable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setId = Number(req.query.setId);

    if (!setId) {
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

    if (setId == null) {
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
    const setId = Number(req.body.setId);
    const courseId = Number(req.body.courseId);
    const day = req.body.day || null;
    const start = req.body.start != null ? Number(req.body.start) : null;
    const end = req.body.end != null ? Number(req.body.end) : null;

    if (!setId || !courseId) {
      return res.status(400).json({ error: "setId and courseId are required" });
    }

    await TimetableModel.addCourseToSet(setId, courseId, day, start, end);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
