import { pool } from "../../config/db";

export const TimetableModel = {
  getTimetableBySet: async (setId: number) => {
    const [rows] = await pool.query(
      `
      SELECT 
        t.id AS t_id,
        t.course_id,
        t.day,
        t.start_period,
        t.end_period,
        c.course_name,
        c.professor_name,
        c.location,
        c.credit,
        c.major_division,
        c.grade,
        c.day AS course_day,
        c.start_time,
        c.end_time
      FROM timetable t
      JOIN course c ON t.course_id = c.id
      WHERE t.set_id = ?
      ORDER BY 
        FIELD(t.day, '월','화','수','목','금','토'),
        t.start_period ASC
      `,
      [setId]
    );
    return rows;
  },

  deleteTimetableBySet: async (setId: number) => {
    await pool.query("DELETE FROM timetable WHERE set_id = ?", [setId]);
  },

  addCourseToSet: async (
    setId: number,
    courseId: number,
    day: string | null,
    start: number | null,
    end: number | null
  ) => {
    await pool.query(
      `
      INSERT INTO timetable (set_id, course_id, day, start_period, end_period)
      VALUES (?, ?, ?, ?, ?)
      `,
      [setId, courseId, day, start, end]
    );
  },
};
