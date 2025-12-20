import { Request, Response } from "express";
import { AcademicCalendarModel } from "../../models/campus/academic_calendar.model";

export const getCalendarEvents = async (req: Request, res: Response) => {
  try {
    const events = await AcademicCalendarModel.getAllEvents();

    // 성공 시 JSON 응답
    res.status(200).json(events);
  } catch (error) {
    console.error("학사일정 조회 실패:", error);
    res.status(500).json({ message: "서버 내부 오류가 발생했습니다." });
  }
};
