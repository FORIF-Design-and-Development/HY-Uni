import pool from "../../config/db";

export const CoursesModel = {
  getCourses: async (filters: any) => {
    const { subject, professor, year, type, day, sort } = filters;

    let sql = `
      SELECT
       id,
       course_code,
       course_name,
       course_name_eng,
       professor_name,
       major_division,
       classification,
       grade,
       major_level, 
       major_department,
       offering_department,
       day,
       start_time,
       end_time,
       location,
       credit
      FROM course
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (subject) {
      conditions.push("course_name LIKE ?");
      params.push(`%${subject}%`);
    }

    if (professor) {
      conditions.push("professor_name LIKE ?");
      params.push(`%${professor}%`);
    }

    if (year) {
      conditions.push("grade = ?");
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
    return rows;
  },
};
