import express from "express";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import { corsMiddleware } from "./middlewares/cors.js";
import { notFound, errorHandler } from "./middlewares/error.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(corsMiddleware);
app.use(express.json());
app.use(notFound);
app.use(errorHandler);

//기본 라우트
app.get("/", (_req, res) => {
  res.json({ ok: true });
  console.log("hello");
});

//DB 연결 테스트
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("MySQL 연결 성공");
    conn.release();
  } catch (err) {
    console.error("MySQL 연결 실패:", (err as Error).message);
    process.exit(1);
  }
})();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
