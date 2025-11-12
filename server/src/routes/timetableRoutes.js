import express from "express";
import mysql from "mysql2/promise";

const router = express.Router();

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "abcde12345",
  database: "hy_timetable",
  charset: "utf8mb4",
});

// 모든 시간표 세트 가져오기
router.get("/timetable-sets", async (req, res) => {
  const [rows] = await pool.query(`SELECT * FROM timetable_sets ORDER BY set_id ASC`);
  res.json({ data: rows });
});


// 시간표 세트 생성
router.post("/timetable-sets", async (req, res) => {
  const { name } = req.body;
  await pool.query(`INSERT INTO timetable_sets (name) VALUES (?)`, [name]);
  res.json({ success: true });
});

// 시간표 세트 삭제
router.delete("/timetable-sets/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query(`DELETE FROM timetable_sets WHERE set_id = ?`, [id]);
  res.json({ success: true });
});

// 특정 세트의 시간표 조회
router.get("/timetable", async (req, res) => {
  const { setId } = req.query;
  const [rows] = await pool.query(
    `SELECT c.*
     FROM my_timetable t
     JOIN courses c ON t.course_id = c.id
     WHERE t.set_id = ?`,
    [setId]
  );
  res.json(rows);
});

// 세트 내 시간표 초기화
router.delete("/timetable/reset", async (req, res) => {
  const { setId } = req.query;
  await pool.query(`DELETE FROM my_timetable WHERE set_id = ?`, [setId]);
  res.json({ success: true });
});

// 시간표에 강의 추가
router.post("/timetable", async (req, res) => {
  const { courseId, setId } = req.body;
  await pool.query(`INSERT INTO my_timetable (course_id, set_id) VALUES (?, ?)`, [courseId, setId]);
  res.json({ success: true });
});

// ✅ 개선된 강의 검색 API
router.get("/courses", async (req, res) => {
  const { subject = "", professor = "", year = "", type = "", day = "" } = req.query;
  const sqlParams = [];

  let sql = `
    SELECT id, 교과목명, 교강사, 강의실, 학점, 요일, 시작교시, 종료교시, 학년, 이수구분
    FROM courses
    WHERE 1=1
  `;

  // 교과목명 검색
  if (subject) {
    sql += ` AND 교과목명 LIKE ?`;
    sqlParams.push(`%${subject}%`);
  }

  // 교수명 검색
  if (professor) {
    sql += ` AND 교강사 LIKE ?`;
    sqlParams.push(`%${professor}%`);
  }

  // 학년 필터
  if (year) {
    sql += ` AND 학년 LIKE ?`;
    sqlParams.push(`%${year}%`);
  }

  // 이수구분 필터
  if (type) {
    sql += ` AND 이수구분 = ?`;
    sqlParams.push(type);
  }

  // 요일 필터
  if (day) {
    sql += ` AND 요일 = ?`;
    sqlParams.push(day);
  }

  sql += `
    ORDER BY FIELD(요일, '월','화','수','목','금','토','일'),
             시작교시 ASC
  `;

  try {
    const [rows] = await pool.query(sql, sqlParams);
    res.json({ data: rows }); // ✅ 프론트 호환형
  } catch (error) {
    console.error("❌ 검색 오류:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});



export default router;
