// server/src/controllers/courseController.js
import pool from "../db.js";

export const getCourses = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM courses LIMIT 200");
    res.json(rows);
  } catch (err) {
    console.error("DB 조회 실패:", err);
    res.status(500).json({ error: "DB 조회 실패" });
  }
};

import { crawlCourses } from "../utils/crawlCourses.js";

export const crawlCourseData = async (req, res) => {
  try {
    await crawlCourses();
    res.json({ message: "✅ 크롤링 완료!" });
  } catch (error) {
    console.error("❌ 크롤링 오류:", error);
    res.status(500).json({ error: "크롤링 중 오류 발생" });
  }
};
