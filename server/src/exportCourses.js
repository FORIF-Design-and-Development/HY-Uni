import fs from "fs";
import iconv from "iconv-lite";
import { Parser } from "json2csv";
import pool from "./db.js";

async function exportCourses() {
  try {
    const [rows] = await pool.query("SELECT * FROM courses");

    if (rows.length === 0) {
      console.log("⚠️ 데이터가 없습니다. 크롤링 후 다시 시도하세요.");
      return;
    }

    const fields = Object.keys(rows[0]);
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    // ✅ CSV를 CP949로 인코딩
    const encoded = iconv.encode(csv, "euc-kr");

    const filePath = "./data/courses.csv";
    fs.mkdirSync("./data", { recursive: true });
    fs.writeFileSync(filePath, encoded);

    console.log(`✅ CSV 내보내기 완료 (EUC-KR 인코딩): ${filePath}`);
  } catch (err) {
    console.error("❌ CSV 내보내기 실패:", err);
  } finally {
    process.exit();
  }
}

exportCourses();
