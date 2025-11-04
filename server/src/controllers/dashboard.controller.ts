import { Request, Response } from "express";
import pool from "../config/db";
import { AuthenticatedRequest } from "../types/index"; // (이 타입은 아래 index.ts에서 만듭니다)

/**
 * (GET) /api/dashboard/summary
 * 대시보드에 필요한 모든 요약 정보를 가져옵니다.
 */
export const getDashboardSummary = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.id;

  // MySQL의 DAYOFWEEK()는 일요일=1, 월요일=2... 입니다.
  // 우리가 저장한 0:일, 1:월... 과 맞추려면 (DAYOFWEEK(NOW()) - 1)
  const todayIndex = new Date().getDay(); // JS: 일요일=0, 월요일=1 ...

  try {
    // 1. 유저 정보 (캐릭터 이미지 포함)
    const [userRows] = await pool.query(
      "SELECT nickname, email, profile_image_url FROM users WHERE id = ?",
      [userId]
    );
    const user = (userRows as any[])[0];

    // 2. 관심 게시판 목록
    const [favoriteBoards] = await pool.query(
      `SELECT b.id, b.name, b.slug 
       FROM boards b
       JOIN user_favorite_boards fb ON b.id = fb.board_id
       WHERE fb.user_id = ?`,
      [userId]
    );

    // 3. 오늘 시간표 (활성화된 시간표 기준)
    const [todayClasses] = await pool.query(
      `SELECT * FROM timetable_entries 
       WHERE timetable_id = (SELECT id FROM timetables WHERE user_id = ? AND is_active = 1 LIMIT 1)
       AND day_of_week = ? 
       ORDER BY start_time`,
      [userId, todayIndex]
    );

    // 4. 다가오는 캘린더 일정 (오늘 ~ 7일 뒤, 최대 5개)
    const [upcomingEvents] = await pool.query(
      `SELECT id, title, start_time 
       FROM calendar_events 
       WHERE user_id = ? AND start_time >= NOW() AND start_time <= NOW() + INTERVAL 7 DAY
       ORDER BY start_time ASC
       LIMIT 5`,
      [userId]
    );

    res.json({
      user,
      favoriteBoards,
      todayClasses,
      upcomingEvents,
    });
  } catch (error) {
    console.error("대시보드 요약 로딩 실패:", error);
    res
      .status(500)
      .json({ message: "대시보드 정보를 불러오는 데 실패했습니다." });
  }
};
