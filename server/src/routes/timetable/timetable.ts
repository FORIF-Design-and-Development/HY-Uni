import { Router } from "express";
import { pool as db } from "../../config/db";


const router = Router();

// GET /api/timetable?setId=...
// 특정 세트 시간표 조회
router.get("/", async (req, res) => {
  try {
    const { setId } = req.query;

    if (!setId) {
      return res.status(400).json({ error: "setId is required" });
    }

    const [rows] = await db.query(
      `
      SELECT 
        t.id AS t_id,
        t.course_id,
        t.day,
        t.start_period,
        t.end_period,
        c.교과목명,
        c.교강사,
        c.강의실,
        c.학점,
        c.이수구분,
        c.학년
      FROM timetable t
      JOIN \`2025_2\` c ON t.course_id = c.id
      WHERE t.set_id = ?
      ORDER BY 
        FIELD(t.day, '월','화','수','목','금','토'),
        t.start_period ASC
      `,
      [setId]
    );

    res.json({ data: rows });
  } catch (err) {
    console.error("시간표 불러오기 오류:", err);
    res.status(500).json({ error: "DB error" });
  }
});

// DELETE /api/timetable/reset?setId=...
// 특정 세트 시간표 전체 삭제
router.delete("/reset", async (req, res) => {
  try {
    const { setId } = req.query;

    if (!setId) {
      return res.status(400).json({ error: "setId is required" });
    }

    await db.query("DELETE FROM timetable WHERE set_id = ?", [setId]);
    res.json({ success: true });
  } catch (err) {
    console.error("시간표 reset 오류:", err);
    res.status(500).json({ error: "DB error" });
  }
});

// POST /api/timetable
// 특정 세트에 강의 추가
router.post("/", async (req, res) => {
  try {
    const { setId, courseId, day, start, end } = req.body;

    if (!setId || !courseId) {
      return res.status(400).json({ error: "setId, courseId are required" });
    }

    await db.query(
      `
      INSERT INTO timetable (set_id, course_id, day, start_period, end_period)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        Number(setId),
        Number(courseId),
        day || null,
        start != null ? Number(start) : null,
        end != null ? Number(end) : null,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("시간표 저장 오류:", err);
    res.status(500).json({ error: "DB error" });
  }
});

export default router;
