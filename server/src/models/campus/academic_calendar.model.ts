import { pool } from "../../config/db";
import { RowDataPacket } from "mysql2";

// 프론트엔드에서 사용할 데이터 타입 정의
export interface CalendarEvent {
  id: number;
  title: string;
  startDate: string; // DB: start_date -> JS: startDate
  endDate: string; // DB: end_date -> JS: endDate
}

export const AcademicCalendarModel = {
  // 모든 일정 가져오기
  getAllEvents: async (): Promise<CalendarEvent[]> => {
    const sql = `
      SELECT 
        calendar_id,
        event_title, 
        start_datetime AS startDate, 
        end_datetime AS endDate
      FROM academic_calendar
      ORDER BY start_datetime ASC
    `;

    try {
      // RowDataPacket[] 타입을 CalendarEvent[]로 캐스팅
      const [rows] = await pool.query<RowDataPacket[]>(sql);
      return rows as CalendarEvent[];
    } catch (err) {
      throw err;
    }
  },
};
