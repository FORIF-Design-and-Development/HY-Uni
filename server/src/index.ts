import express from "express";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import { corsMiddleware } from "./middlewares/cors.js";
import { notFound, errorHandler } from "./middlewares/error.js";
import { noticeRouter } from "./routes/notice.route.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

// --- 1. 일반 미들웨어 (CORS, JSON 파서, 로거) ---
// (라우터보다 위에 있어야 함)

app.use(corsMiddleware);
app.use(express.json()); // ⭐️ 중복이었던 것 하나 삭제

// ⭐️ Request Logger: 라우터 바로 위에 두어 모든 요청을 기록
app.use((req, res, next) => {
  console.log("--- [Request Logger] ---");
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`);
  console.log("------------------------");
  next();
});

// --- 2. 라우트 등록 ---
console.log("--- [index.ts] '/api/notices' 라우터를 등록합니다. ---");
app.use("/api/notices", noticeRouter);

// 기본 라우트
app.get("/", (_req, res) => {
  res.json({ ok: true });
  console.log("hello");
});

// --- 3. ⭐️ 에러 핸들링 미들웨어 (가장 마지막에 위치!) ---
// (등록된 라우트에서 처리하지 못한 모든 요청을 404로 처리)
app.use(notFound);
// (라우트에서 발생한 에러를 최종 처리)
app.use(errorHandler);

// --- 4. DB 연결 및 서버 시작 ---
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
