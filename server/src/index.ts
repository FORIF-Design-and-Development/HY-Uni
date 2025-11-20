import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { pool } from './config/db';
import { corsMiddleware } from './middlewares/cors';
import { errorHandler, notFound } from './middlewares/error';
import { runAggregation } from './services/community/popular-search-aggregator.service';

import cafeteriaRoutes from './routes/campus/cafeteria.routes';
import menuRoutes from './routes/campus/menu.routes';
import { noticeRoutes } from "./routes/campus/notice.routes";
import { placeRoutes } from "./routes/campus/place.routes";
import communityRoutes from './routes/community/community.routes';
import authRoutes from './routes/auth/auth.routes';
import departmentRoutes from './routes/auth/department.routes';
import coursesRouter from './routes/timetable/courses';
import timetableRouter from './routes/timetable/timetable';
import timetableSetsRouter from './routes/timetable/timetablesets';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser());

//기본 라우트
app.get('/', (_req, res) => {
  res.json({ ok: true });
});

//피쳐별 라우트 등록
app.use('/api/community', communityRoutes);
app.use('/api/cafeterias', cafeteriaRoutes);
app.use('/api/menus', menuRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/places", placeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/courses', coursesRouter);
app.use('/api/timetable', timetableRouter);
app.use('/api/timetablesets', timetableSetsRouter);

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

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

// 인기 검색어 집계 스케줄러 설정
const aggregateEnabled = process.env.POPULAR_SEARCH_AGGREGATE_ENABLED !== 'false';
const aggregateCron = process.env.POPULAR_SEARCH_AGGREGATE_CRON || '0 * * * *'; // 매 시간 00분
const aggregatePeriodHours = Number(process.env.POPULAR_SEARCH_AGGREGATE_PERIOD_HOURS || 24);
const aggregateLimit = Number(process.env.POPULAR_SEARCH_AGGREGATE_LIMIT || 10);

if (aggregateEnabled) {
  cron.schedule(aggregateCron, async () => {
    try {
      const baseTime = new Date();
      await runAggregation(baseTime, aggregatePeriodHours, aggregateLimit);
    } catch (error) {
      console.error('인기 검색어 집계 스케줄러 에러:', error);
    }
  });
  console.log(
    `인기 검색어 집계 스케줄러 시작 - cron: ${aggregateCron}, periodHours: ${aggregatePeriodHours}, limit: ${aggregateLimit}`,
  );
}
