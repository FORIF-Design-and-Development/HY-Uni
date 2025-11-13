import express from "express";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import { corsMiddleware } from "./middlewares/cors.js";
import { notFound, errorHandler } from "./middlewares/error.js";

// 1. 라우터들을 import 합니다.
//import { noticeRouter } from './route/notice.route.js';
import { placeRouter } from "./route/place.route.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

// --- 1. 일반 미들웨어 (라우터보다 위에 위치) ---
app.use(corsMiddleware);
app.use(express.json());

// (디버깅용) Request Logger
app.use((req, res, next) => {
  console.log("--- [Request Logger] ---");
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`);
  console.log("------------------------");
  next();
});

// --- 2. 라우트 등록 (에러 핸들러보다 위에 위치) ---

console.log("--- [index.ts] '/api/places' 라우터를 등록합니다. ---");
app.use("/api/places", placeRouter);

console.log("--- [index.ts] '/api/notices' 라우터를 등록합니다. ---");
//app.use('/api/notices', noticeRouter);

// 기본 라우트
app.get("/", (_req, res) => {
  res.json({ ok: true });
});

// --- 3. ⭐️ 에러 핸들링 미들웨어 (모든 라우터의 맨 마지막에 위치!) ---
// (등록된 라우트에서 처리하지 못한 모든 요청을 404로 처리)
app.use(notFound);
// (라우트에서 발생한 에러를 최종 처리)
app.use(errorHandler);

// --- 4. 서버 시작 및 DB 연결 테스트 ---
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
