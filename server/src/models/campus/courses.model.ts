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
  start_time: string | null; 
  end_time: string | null;
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

    // ✅ 병합 로직 적용
    const result: Course[] = [];

    for (const row of rows as any[]) {
      const last = result[result.length - 1];

      // ✅ 병합 조건
      if (
        last &&
        last.course_code === row.course_code &&
        last.course_name === row.course_name &&
        last.professor === row.professor &&
        last.day === row.day &&
        last.location === row.location &&
        last.end_time === row.start_time // ✅ 연속 시간
      ) {
        last.end_time = row.end_time; // ✅ 병합!
      } else {
        result.push({ ...row });
      }
    }

    return result;
  },
};
