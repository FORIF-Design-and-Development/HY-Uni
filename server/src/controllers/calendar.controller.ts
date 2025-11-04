import { Request, Response } from "express";
import pool from "../config/db";
import { AuthenticatedRequest } from "../types/index";

/**
 * (GET) /api/calendar
 * 특정 기간 (start, end) 사이의 모든 캘린더 이벤트를 조회합니다.
 * (FullCalendar.js와 호환되는 방식)
 */
export const getCalendarEvents = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const { start, end } = req.query; // (예: 2025-11-01, 2025-11-30)

  if (!start || !end) {
    return res
      .status(400)
      .json({ message: "시작일(start)과 종료일(end)이 필요합니다." });
  }

  try {
    const [events] = await pool.query(
      `SELECT id, title, description, start_time as \`start\`, end_time as \`end\`, color
       FROM calendar_events 
       WHERE user_id = ? AND start_time <= ? AND end_time >= ?`,
      [userId, end, start]
    );
    res.json(events);
  } catch (error) {
    console.error("캘린더 이벤트 조회 실패:", error);
    res.status(500).json({ message: "서버 오류" });
  }
};

/**
 * (POST) /api/calendar
 * 새로운 캘린더 이벤트를 생성합니다.
 */
export const createCalendarEvent = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const { title, description, start_time, end_time, color } = req.body;

  try {
    const [result] = await pool.query(
      "INSERT INTO calendar_events (user_id, title, description, start_time, end_time, color) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, title, description, start_time, end_time, color]
    );
    res.status(201).json({
      message: "이벤트 생성 완료",
      insertId: (result as any).insertId,
    });
  } catch (error) {
    console.error("캘린더 이벤트 생성 실패:", error);
    res.status(500).json({ message: "서버 오류" });
  }
};

/**
 * (PUT) /api/calendar/:id
 * 특정 캘린더 이벤트를 수정합니다.
 */
export const updateCalendarEvent = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const { id } = req.params;
  const { title, description, start_time, end_time, color } = req.body;

  try {
    await pool.query(
      "UPDATE calendar_events SET title = ?, description = ?, start_time = ?, end_time = ?, color = ? WHERE id = ? AND user_id = ?",
      [title, description, start_time, end_time, color, id, userId]
    );
    res.status(200).json({ message: "이벤트 수정 완료" });
  } catch (error) {
    console.error("캘린더 이벤트 수정 실패:", error);
    res.status(500).json({ message: "서버 오류" });
  }
};

/**
 * (DELETE) /api/calendar/:id
 * 특정 캘린더 이벤트를 삭제합니다.
 */
export const deleteCalendarEvent = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const { id } = req.params;

  try {
    await pool.query(
      "DELETE FROM calendar_events WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    res.status(200).json({ message: "이벤트 삭제 완료" });
  } catch (error) {
    console.error("캘린더 이벤트 삭제 실패:", error);
    res.status(500).json({ message: "서버 오류" });
  }
};
