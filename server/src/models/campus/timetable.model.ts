import { pool } from "../../config/db";

function toMysqlTime(period: string | number | null) {
  if (!period) return null;
  const p = Number(period);
  const hh = String(p).padStart(2, "0");
  return `${hh}:00:00`;
}

function fromMysqlTime(time: string | null) {
  if (!time) return null;
  // MySQL TIME = "11:00:00"
  return Number(time.split(":")[0]); // 11
}

export interface TimetableEntry {
  t_id: number;
  course_id: number | null;
  day: string | null;
  start_time: string | null;
  end_time: string | null;
  course_name: string | null;
  professor: string | null;
  location: string | null;
  credit: number | null;
  major_division: string | null;
  grade: number | null;

  custom_title : string | null;
  custom_location : string | null;
  is_custom : boolean;
}

export const TimetableModel = {
  // 세트별 시간표 조회
  getTimetableBySet: async (setId: number): Promise<TimetableEntry[]> => {
    const [rows] = await pool.query(
      `
       SELECT 
        t.timetable_id AS t_id,
        t.course_id,
        t.custom_schedule_id,
        t.day AS day,
        t.start_time AS start_time,
        t.end_time AS end_time,

        -- course 정보
        c.course_name,
        c.professor,
        c.location,
        c.credit,
        c.major_division,
        c.required_grade,

        -- custom 일정
        cs.title AS custom_title,
        cs.location AS custom_location,
        cs.day AS custom_day,
        cs.start_time AS custom_start,
        cs.end_time AS custom_end

      FROM timetable t
      LEFT JOIN course c ON t.course_id = c.course_id
      LEFT JOIN custom_schedule cs ON t.custom_schedule_id = cs.custom_schedule_id
      WHERE t.timetable_list_id = ?
      ORDER BY day, start_time
      `,
      [setId]
    );

    // 변환 로직 (MySQL TIME → 교시 숫자)
    return (rows as any[]).map((r) => {
      if (r.custom_schedule_id) {
        return {
          t_id: r.t_id,
          course_id: null,
          is_custom: true,
          title: r.custom_title,
          location: r.custom_location,
          day: r.custom_day,
          start_time: fromMysqlTime(r.custom_start),
          end_time: fromMysqlTime(r.custom_end),
        };
      }

      return {
        t_id: r.t_id,
        course_id: r.course_id,
        course_name: r.course_name,
        professor: r.professor,
        location: r.location,
        credit: r.credit,
        major_division: r.major_division,
        grade: r.required_grade,
        day: r.day,
        start_time: fromMysqlTime(r.start_time),
        end_time: fromMysqlTime(r.end_time),
        is_custom: false,
      };
    });
  },


  // 세트 전체 삭제
  deleteTimetableBySet: async (setId: number): Promise<void> => {
    await pool.query("DELETE FROM timetable WHERE timetable_list_id = ?", [setId]);
  },

//   // 커스텀 강의 추가
//   addCustomToTimetable: async (setId, customScheduleId, day, start, end) => {
//   await pool.query(
//     `
//     INSERT INTO timetable (timetable_list_id, custom_schedule_id, course_id)
//     VALUES (?, ?, NULL)
//     `,
//     [setId, customScheduleId]
//   );
// },


  // 강의 추가
  addCourseToSet: async (
    setId: number,
    courseId: number,
    day: string | null,
    start: string | null,
    end: string | null
  ): Promise<void> => {
    await pool.query(
      `
        INSERT INTO timetable (timetable_list_id, course_id, day, start_time, end_time)
        VALUES (?, ?, ?, ?, ?)

      `,
      [setId, courseId, day, toMysqlTime(start), toMysqlTime(end)]
    );
  },
};
