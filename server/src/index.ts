import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import cron from "node-cron";
import path from "path";
import { pool } from "./config/db";
import { corsMiddleware } from "./middlewares/cors";
import { errorHandler, notFound } from "./middlewares/error";
import { registerRoutes } from "./routes";


dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser());

// 정적 파일 서빙 (업로드된 파일)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

registerRoutes(app);

//404, 에러 핸들러
app.use(notFound);
app.use(errorHandler);

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

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${port}`);
  //initNoticeScheduler();
});