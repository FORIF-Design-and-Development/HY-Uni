import dotenv from "dotenv";
import express from "express";
import { pool } from "./config/db";
import { corsMiddleware } from "./middlewares/cors";
import { errorHandler, notFound } from "./middlewares/error";
import cafeteriaRoutes from "./routes/campus/cafeteria.routes";
import menuRoutes from "./routes/campus/menu.routes";
import communityRoutes from "./routes/community/community.routes";
import { noticeRoutes } from "./routes/campus/notice.routes";
import { placeRoutes } from "./routes/campus/place.routes";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(corsMiddleware);
app.use(express.json());

// 커뮤니티 라우터 등록
app.use("/api/community", communityRoutes);

// 캠퍼스 학식 라우터 등록
app.use("/api/cafeterias", cafeteriaRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/places", placeRoutes);

app.use(notFound);
app.use(errorHandler);

//기본 라우트
app.get("/", (_req, res) => {
  res.json({ ok: true });
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
