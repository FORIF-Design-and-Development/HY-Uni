import { Router } from "express";
import { pool as db } from "../../config/db";



const router = Router();

// GET /api/courses
router.get("/", async (req, res) => {
  try {
    const {
      subject,
      professor,
      year,
      type,
      day,
      sort,
    } = req.query;

    // 기본 SELECT – 테이블 이름이 `2025_2`
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

    if (subject && typeof subject === "string" && subject.trim() !== "") {
      conditions.push("교과목명 LIKE ?");
      params.push(`%${subject.trim()}%`);
    }

    if (professor && typeof professor === "string" && professor.trim() !== "") {
      conditions.push("교강사 LIKE ?");
      params.push(`%${professor.trim()}%`);
    }

    if (year && typeof year === "string" && year.trim() !== "") {
      conditions.push("학년 = ?");
      params.push(year.trim());
    }

    if (type && typeof type === "string" && type.trim() !== "") {
      conditions.push("이수구분 = ?");
      params.push(type.trim());
    }

    if (day && typeof day === "string" && day.trim() !== "") {
      conditions.push("요일 = ?");
      params.push(day.trim());
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    // 정렬
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
      // 기본: 이름순
      sql += " ORDER BY 교과목명 ASC";
    }

    const [rows] = await db.query(sql, params);
    res.json({ data: rows });
  } catch (err) {
    console.error("강의 검색 오류:", err);
    res.status(500).json({ error: "DB error" });
  }
});

export default router;
