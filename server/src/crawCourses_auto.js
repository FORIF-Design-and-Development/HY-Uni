import axios from "axios";
import * as cheerio from "cheerio";
import mysql from "mysql2/promise";
import express from "express";

console.log("🧠 DEBUG: 스크립트 시작됨");

export async function crawlCourses() {
  console.log("🚀 강의 데이터 수집 시작");

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "abcde12345",
    database: "hy_timetable",
    charset: "utf8mb4",
  });

  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    await connection.query("TRUNCATE TABLE courses");
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    let start = 0;
    const limit = 200;

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      Referer: "https://everytime.kr/timetable",
      "Accept-Language": "ko,en;q=0.9",
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      Cookie:
        "_ga=GA1.1.1442799645.1758185067; x-et-device=11053426; etsid=s%3AXADxEeDJ5qLM7F8mqNcx947-VoOrT3TO.heOdsCJaYrtlnXOyrEL5ML%2FIffknO5Kpt6XgXeylqp8; _ga_85ZNEFVRGL=GS2.1.s1762604815$o15$g1$t1762605731$j60$l0$h0",
    };

    while (true) {
      const url = `https://api.everytime.kr/find/timetable/subject/list?campusId=6&year=2025&semester=2&limitNum=${limit}&startNum=${start}`;
      console.log(`📡 요청 중: start=${start}`);

      const res = await axios.get(url, { headers });
      if (!res.data || res.data.trim() === "") break;

      const $ = cheerio.load(res.data, { xmlMode: true });
      const lectures = $("subject, lecture");
      if (lectures.length === 0) break;

      for (const el of lectures) {
        const lec = $(el);

        const 교과목명 = lec.attr("name") || "미정";
        const 교강사 = lec.attr("professor") || "미정";
        const 학점 = lec.attr("credit") || "0";
        const 시간 = lec.attr("time") || "";
        const 학년 = lec.attr("target") || "미정";
        const 이수구분 = lec.attr("category") || "전공선택";
        const 강의실 = lec.attr("place") || "미정";

        if (!시간) {
          await connection.query(
            `INSERT INTO courses 
             (교과목명, 교강사, 학점, 시간, 요일, 시작교시, 종료교시, 학년, 이수구분, 강의실)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [교과목명, 교강사, 학점, 시간, null, null, null, 학년, 이수구분, 강의실]
          );
          continue;
        }

        // ✅ 다중 요일 + -/~ 모두 대응
        const timePattern = /([월화수목금토일])\((\d{2}):(\d{2})[-~](\d{2}):(\d{2})\)/g;
        let match;
        let inserted = false;

        while ((match = timePattern.exec(시간)) !== null) {
          inserted = true;
          const 요일 = match[1];
          const startHour = parseInt(match[2]);
          const startMin = parseInt(match[3]);
          const endHour = parseInt(match[4]);
          const endMin = parseInt(match[5]);

          const 시작교시 = Math.round((startHour - 9) + startMin / 60 + 1);
          const 종료교시 = Math.round((endHour - 9) + endMin / 60 + 1);

          await connection.query(
            `INSERT INTO courses 
             (교과목명, 교강사, 학점, 시간, 요일, 시작교시, 종료교시, 학년, 이수구분, 강의실)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [교과목명, 교강사, 학점, 시간, 요일, 시작교시, 종료교시, 학년, 이수구분, 강의실]
          );
        }

        // 시간 문자열에 패턴이 전혀 없을 때 (ex. "미정")
        if (!inserted) {
          await connection.query(
            `INSERT INTO courses 
             (교과목명, 교강사, 학점, 시간, 요일, 시작교시, 종료교시, 학년, 이수구분, 강의실)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [교과목명, 교강사, 학점, 시간, null, null, null, 학년, 이수구분, 강의실]
          );
        }
      }

      start += limit;
      await new Promise((r) => setTimeout(r, 800));
    }

    console.log("✅ 모든 작업 완료");
  } catch (err) {
    console.error("❌ 오류 발생:", err);
  } finally {
    await connection.end();
  }
}

crawlCourses()
  .then(() => console.log("✅ 모든 작업 완료"))
  .catch((err) => console.error("❌ 전체 작업 실패:", err));

// ✅ 프론트 검색용 API
const router = express.Router();
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "abcde12345",
  database: "hy_timetable",
  charset: "utf8mb4",
});

router.get("/courses/search", async (req, res) => {
  const keyword = req.query.subject || req.query.professor || "";
  const day = req.query.day || null;

  let sql = `
    SELECT 
      id,
      교과목명, 
      교강사, 
      강의실, 
      학점, 
      요일, 
      시작교시, 
      종료교시, 
      학년, 
      이수구분, 
      시간,
      CASE 
        WHEN 요일 IS NULL OR 시작교시 IS NULL THEN '미지정'
        ELSE CONCAT(요일, ' ', 시작교시, '~', 종료교시, '교시')
      END AS 시간표시
    FROM courses
    WHERE 1=1
  `;

  const params = [];

  if (keyword) {
    sql += ` AND (교과목명 LIKE ? OR 교강사 LIKE ?)`;
    const like = `%${keyword}%`;
    params.push(like, like);
  }

  if (day) {
    sql += ` AND 요일 = ?`;
    params.push(day);
  }

  sql += `
    ORDER BY FIELD(요일, '월','화','수','목','금','토','일'),
             시작교시 ASC
  `;

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ 검색 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

export default router;