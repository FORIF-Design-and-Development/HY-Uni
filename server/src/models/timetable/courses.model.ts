import pool from "../../config/db";

export const CoursesModel = {
  getCourses: async (filters: any) => {
    const { subject, professor, year, type, day, sort } = filters;

    let sql = `
      SELECT
        id,
        교과목명,
        교강사,
        요일,
        시작교시,
        종료교시,
        강의실,
        학점,
        이수구분,
        학년
      FROM \`2025_2\`
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (subject) {
      conditions.push("교과목명 LIKE ?");
      params.push(`%${subject}%`);
    }

    if (professor) {
      conditions.push("교강사 LIKE ?");
      params.push(`%${professor}%`);
    }

    if (year) {
      conditions.push("학년 = ?");
      params.push(year);
    }

    if (type) {
      conditions.push("이수구분 = ?");
      params.push(type);
    }

    if (day) {
      conditions.push("요일 = ?");
      params.push(day);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    if (sort === "학점순") {
      sql += " ORDER BY 학점 DESC, 교과목명 ASC";
    } else if (sort === "요일순") {
      sql += `
        ORDER BY
          FIELD(요일, '월','화','수','목','금','토'),
          시작교시 ASC,
          교과목명 ASC
      `;
    } else {
      sql += " ORDER BY 교과목명 ASC";
    }

    const [rows] = await pool.query(sql, params);
    return rows;
  },
};
