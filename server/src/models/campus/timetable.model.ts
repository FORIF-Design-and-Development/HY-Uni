import { pool } from "../../config/db";

export interface TimetableEntry {
  t_id: number;
  course_id: number | null;
  day: string | null;
  start_period: number | null;
  end_period: number | null;
  course_name: string | null;
  professor_name: string | null;
  location: string | null;
  credit: number | null;
  major_division: string | null;
  grade: number | null;
  course_day: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface TimetableResponse {
  timetable: TimetableEntry[];
}

export const TimetableModel = {
  getTimetableBySet: async (setId: number): Promise<TimetableEntry[]> => {
    const [rows] = await pool.query(
      `
      SELECT 
        t.timetable_id AS t_id,
        t.course_id,
        c.course_name,
        c.professor AS professor_name,
        c.location,
        c.credit,
        c.major_division,
        c.required_grade AS grade,
        c.day AS course_day,
        c.start_time,
        c.end_time
      FROM timetable t
      JOIN course c ON t.course_id = c.course_id
      WHERE t.timetable_list_id = ?
      ORDER BY 
        FIELD(c.day, '월','화','수','목','금','토'),
        c.start_time ASC
      `,
      [setId]
    );

    return rows as TimetableEntry[];
  },

  deleteTimetableBySet: async (setId: number): Promise<void> => {
    await pool.query("DELETE FROM timetable WHERE timetable_list_id = ?", [setId]);
  },

  addCourseToSet: async (
    setId: number,
    courseId: number,
    day: string | null,
    start: number | null,
    end: number | null
  ): Promise<void> => {
    await pool.query(
      `
      INSERT INTO timetable (timetable_list_id, course_id)
      VALUES (?, ?)
      `,
      [setId, courseId, day, start, end]
    );
  },
};
