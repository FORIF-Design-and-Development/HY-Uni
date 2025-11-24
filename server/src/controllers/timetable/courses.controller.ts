import { Request, Response, NextFunction } from "express";
import { CoursesModel } from "../../models/timetable/courses.model";

export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      subject: req.query.subject as string,
      professor: req.query.professor as string,
      year: req.query.year as string,
      type: req.query.type as string,
      day: req.query.day as string,
      sort: req.query.sort as string,
    };

    const rows = await CoursesModel.getCourses(filters);

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};
