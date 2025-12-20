import { Request, Response, NextFunction } from "express";
import { CoursesModel } from "../../models/campus/courses.model";

// 강의 검색 API : 필터(과목명/교수/학년/구분/요일/정렬)
export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 프론트에서 전달한 검색 필터를 추출
    const filters = {
      subject: req.query.subject as string,
      professor: req.query.professor as string,
      year: req.query.year as string,
      type: req.query.type as string,
      day: req.query.day as string,
      sort: req.query.sort as string,
    };

    // DB조회 및 동일강의 연속교시는 병합처리 후 route반환 
    const rows = await CoursesModel.getCourses(filters);

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};
