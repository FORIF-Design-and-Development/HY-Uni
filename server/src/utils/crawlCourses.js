import axios from "axios";
import xml2js from "xml2js";
import pool from "../db.js";
import express from "express";   // ✅ 라우터 추가

const router = express.Router(); // ✅ 라우터 객체 생성

const BASE_URL =
  "https://api.everytime.kr/find/timetable/subject/list?campusId=6&year=2025&semester=2";

// ✅ 크롤링 함수
export async function crawlCourses() {
  const parser = new xml2js.Parser({ explicitArray: false });
  const limit = 50;
  let start = 0;
  let total = 0;

  const COOKIE =
    "_ga=GA1.1.1442799645.1758185067; x-et-device=11053426; etsid=s%3AQNJbO647egPzRcO15ltHWR9CrENfpVZP.C4QBoHnwD4v0WAg2%2F2nJF7fXRtyJKeGp0keygxpMI1U; _ga_85ZNEFVRGL=GS2.1.s1762577828$o13$g1$t1762579857$j53$l0$h0";

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Referer: "https://everytime.kr/",
    "Accept-Language": "ko,en;q=0.9",
    Cookie: COOKIE,
  };

  while (true) {
    const url = `${BASE_URL}&limitNum=${limit}&startNum=${start}`;
    console.log(`📡 요청 중: start=${start}`);

    try {
      const res = await axios.get(url, { headers });
      if (res.status === 401 || res.data.includes("Login Required")) {
        console.error("❌ 로그인 필요 또는 접근 거부됨 (401 Unauthorized)");
        break;
      }

      const parsed = await parser.parseStringPromise(res.data);
      const subjects = parsed.response?.subject;

      if (!subjects || subjects.length === 0) {
        console.log("✅ 더 이상 데이터 없음");
        break;
      }

      const subjectArray = Array.isArray(subjects) ? subjects : [subjects];

      for (const s of subjectArray) {
        const 학년 = s.$.target || "미정";
        const 이수구분 = s.$.classification || "전공선택";
        const 학수번호_수업번호 = s.$.id || null;
        const 교과목명 = s.$.name || null;
        const 교강사 = s.$.professor || null;
        const 학점 = parseInt(s.$.credit) || null;
        const 시간 = s.$.time || null;
        const 강의실 = s.$.place || null;

        let 요일 = null;
        let 시작교시 = null;
        let 종료교시 = null;

        if (시간) {
          const timeMatch = 시간.match(/([월화수목금토일])(\d+)(?:,?(\d+))?/);
          if (timeMatch) {
            요일 = timeMatch[1];
            시작교시 = parseInt(timeMatch[2]);
            종료교시 = timeMatch[3] ? parseInt(timeMatch[3]) : 시작교시;
          }
        }

        const sql = `
          INSERT INTO courses 
          (학년, 이수구분, 학수번호_수업번호, 교과목명, 교강사, 학점, 시간, 강의실, 요일, 시작교시, 종료교시)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await pool.query(sql, [
          학년,
          이수구분,
          학수번호_수업번호,
          교과목명,
          교강사,
          학점,
          시간,
          강의실,
          요일,
          시작교시,
          종료교시,
        ]);

        total++;
      }

      console.log(`✅ ${subjectArray.length}개 저장 (누적 ${total})`);
      start += limit;
      await new Promise((r) => setTimeout(r, 800));
    } catch (error) {
      console.error("❌ 크롤링 오류:", error.message);
      break;
    }
  }

  console.log("🎯 크롤링 완료");
}

// ✅ 프론트엔드 검색 호환용 API
router.get("/courses/search", async (req, res) => {
  req.query.keyword = req.query.subject || req.query.professor || "";
  const day = req.query.day || null;

  let sql = `
    SELECT 교과목명, 교강사, 강의실, 학점, 요일, 시작교시, 종료교시, 학년, 이수구분, 시간
    FROM courses
    WHERE 1=1
  `;
  const params = [];

  if (req.query.keyword) {
    sql += ` AND (교과목명 LIKE ? OR 교강사 LIKE ?)`;
    const like = `%${req.query.keyword}%`;
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

  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// ✅ 이 파일이 라우터로 인식되게 export
export default router;
