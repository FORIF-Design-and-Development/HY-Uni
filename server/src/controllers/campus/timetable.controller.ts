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
    const { setId, courseId, day, start, end } = req.body;
    
    if (!setId || !courseId) {
      return res.status(400).json({ error: "setId and courseId are required" });
    }

    await TimetableModel.addCourseToSet(
    Number(setId), 
    Number(courseId), 
    day ?? null, 
    start ?? null,
    end ?? null
  );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
