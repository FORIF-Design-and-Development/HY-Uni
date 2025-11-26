import { pool } from "../../config/db";

export interface Course {
  course_id: number;
  course_code: string;
  course_name: string;
  course_name_eng: string | null;
  professor: string | null;
  major_division: string | null;
  classification: string | null;
  required_grade: number | null;
  major_level: string | null;
  start_time: number | null;
  end_time: number | null;
  day: string | null;
  location: string | null;
  credit: number | null;
  department_id: number | null;
  major_department: string | null;
  offering_department: string | null;
}

export interface CourseListResponse {
  courses: Course[];
}

export const CoursesModel = {
  getCourses: async (filters: any): Promise<Course[]> => {
    const { subject, professor, year, type, day, sort } = filters;

    let sql = `
      SELECT
       course_id,
       course_code,
       course_name,
       course_name_eng,
       professor,
       major_division,
       classification,
       required_grade,
       major_level,
       start_time,
       end_time,
       day,
       location,
       credit,
       department_id,
       major_department,
       offering_department
      FROM course
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (subject) {
      conditions.push("course_name LIKE ?");
      params.push(`%${subject}%`);
    }

    if (professor) {
      conditions.push("professor LIKE ?");
      params.push(`%${professor}%`);
    }

    if (year) {
      conditions.push("required_grade = ?");
      params.push(year);
    }

    if (type) {
      conditions.push("major_division = ?");
      params.push(type);
    }

    if (day) {
      conditions.push("day = ?");
      params.push(day);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    if (sort === "학점순") {
      sql += " ORDER BY credit DESC, course_name ASC";
    } else if (sort === "요일순") {
      sql += `
        ORDER BY
          FIELD(day, '월','화','수','목','금','토'),
          start_time ASC,
          course_name ASC
      `;
    } else {
      sql += " ORDER BY course_name ASC";
    }

    const [rows] = await pool.query(sql, params);

    const convertTimeToPeriod = (time: string | null) => {
      if (!time) return null;
      const [hour] = time.split(":").map(Number);
      return hour - 8;
    };

    return (rows as any[]).map(row => ({
      ...row,
      start_time: convertTimeToPeriod(row.start_time),
      end_time: convertTimeToPeriod(row.end_time),
    })) as Course[];
  },
};
