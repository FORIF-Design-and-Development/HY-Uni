import { Request, Response } from "express";
import pool from "../config/db";
import { AuthenticatedRequest } from "../types/index";

/**
 * (GET) /api/timetable/active
 * 현재 '활성화된' 시간표의 모든 과목을 가져옵니다.
 */
export const getActiveTimetable = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.id;
  try {
    const [entries] = await pool.query(
      `SELECT * FROM timetable_entries 
       WHERE timetable_id = (SELECT id FROM timetables WHERE user_id = ? AND is_active = 1 LIMIT 1)
       ORDER BY day_of_week, start_time`,
      [userId]
    );
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: "활성 시간표 로딩 실패" });
  }
};

/**
 * (POST) /api/timetable/entry
 * 현재 활성화된 시간표에 과목을 추가합니다.
 * (간편화를 위해, 먼저 활성화된 timetable이 1개 있다고 가정합니다.)
 */
export const addTimetableEntry = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const {
    subject_name,
    professor,
    location,
    day_of_week,
    start_time,
    end_time,
    color,
  } = req.body;

  try {
    // 1. 활성화된 시간표의 ID를 찾습니다.
    const [timetableRows] = await pool.query(
      "SELECT id FROM timetables WHERE user_id = ? AND is_active = 1 LIMIT 1",
      [userId]
    );
    const timetable = (timetableRows as any[])[0];

    if (!timetable) {
      return res.status(404).json({
        message: "활성화된 시간표가 없습니다. 먼저 시간표를 생성해주세요.",
      });
    }

    // 2. 과목을 추가합니다.
    const [result] = await pool.query(
      `INSERT INTO timetable_entries 
       (timetable_id, subject_name, professor, location, day_of_week, start_time, end_time, color) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        timetable.id,
        subject_name,
        professor,
        location,
        day_of_week,
        start_time,
        end_time,
        color,
      ]
    );

    res
      .status(201)
      .json({ message: "과목 추가 완료", insertId: (result as any).insertId });
  } catch (error) {
    res.status(500).json({ message: "과목 추가 실패" });
  }
};

// ... (시간표 과목 수정(PUT /entry/:id) 및 삭제(DELETE /entry/:id) 로직도 유사하게 추가할 수 있습니다) ...
