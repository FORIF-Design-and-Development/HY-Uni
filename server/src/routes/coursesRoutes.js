import express from "express";
import mysql from "mysql2/promise";

const router = express.Router();

// ✅ DB 연결 풀
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "abcde12345",
  database: "hy_timetable",
  charset: "utf8mb4",
});

// ✅ 교시 → 실제 시간 매핑
const periodToTime = {
  1: "09:00",
  2: "10:00",
  3: "11:00",
  4: "12:00",
  5: "13:00",
  6: "14:00",
  7: "15:00",
  8: "16:00",
  9: "17:00",
  10: "18:00",
  11: "19:00",
  12: "20:00",
  13: "21:00",
  14: "22:00",
  15: "23:00",
};

router.get("/courses/search", async (req, res) => {
  const keyword = req.query.keyword || "";
  const day = req.query.day || null;
  const sqlParams = [];

  let sql = `
    SELECT 학년, 교과목명, 교강사, 강의실, 학점, 요일, 시작교시, 종료교시, 시간
    FROM courses
    WHERE 1=1
  `;

  if (keyword) {
    sql += ` AND (교과목명 LIKE ? OR 교강사 LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    sqlParams.push(likeKeyword, likeKeyword);
  }

  if (day) {
    sql += ` AND 요일 = ?`;
    sqlParams.push(day);
  }

  sql += `
    ORDER BY FIELD(요일, '월','화','수','목','금','토','일'),
    시작교시 ASC;
  `;

  try {
    const [rows] = await pool.query(sql, sqlParams);

    // ✅ 교시 → 시간 문자열 변환
    const result = rows.map((r) => {
      if (r.시작교시 && r.종료교시) {
        const periodToTime = {
          1: "09:00", 2: "10:00", 3: "11:00", 4: "12:00", 5: "13:00",
          6: "14:00", 7: "15:00", 8: "16:00", 9: "17:00", 10: "18:00",
          11: "19:00", 12: "20:00", 13: "21:00", 14: "22:00", 15: "23:00"
        };
        const startTime = periodToTime[r.시작교시] || "??:??";
        const endTime = periodToTime[r.종료교시 + 1] || "??:??";
        r.시간표시 = `${r.요일} ${startTime}~${endTime}`;
      } else if (r.시간) {
        r.시간표시 = r.시간;
      } else {
        r.시간표시 = "시간 미정";
      }
      return r;
    });

    res.json(result);
  } catch (error) {
    console.error("❌ 검색 오류:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});


export default router;
