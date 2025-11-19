import { Router } from "express";
import { pool as db } from "../../config/db";


const router = Router();

// 세트 전체 조회
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM timetable_sets ORDER BY set_id"
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("세트 조회 오류:", err);
    res.status(500).json({ success: false });
  }
});

// 세트 생성
router.post("/", async (req, res) => {
  const { name } = req.body;

  try {
    await db.query("INSERT INTO timetable_sets (name) VALUES (?)", [name]);
    res.json({ success: true });
  } catch (err) {
    console.error("세트 생성 오류:", err);
    res.status(500).json({ success: false });
  }
});

// 세트 삭제
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM timetable_sets WHERE set_id = ?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("세트 삭제 오류:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
