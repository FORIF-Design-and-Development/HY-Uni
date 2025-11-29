import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import cron from 'node-cron';
import path from 'path';
import { pool } from './config/db';
import { corsMiddleware } from './middlewares/cors';
import { errorHandler, notFound } from './middlewares/error';
import { registerRoutes } from './routes';

import { runAggregation } from './services/community/popular-search-aggregator.service';
// import { initNoticeScheduler } from './controllers/campus/notice.controller';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser());

// 정적 파일 서빙 (업로드된 파일)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);

  // initNoticeScheduler();
});

// 인기 검색어 집계 스케줄러 설정
const aggregateEnabled = process.env.POPULAR_SEARCH_AGGREGATE_ENABLED !== 'false';
const aggregateCron = process.env.POPULAR_SEARCH_AGGREGATE_CRON || '0 * * * *'; // 매 시간 00분
const aggregatePeriodHours = Number(process.env.POPULAR_SEARCH_AGGREGATE_PERIOD_HOURS || 24);
const aggregateLimit = Number(process.env.POPULAR_SEARCH_AGGREGATE_LIMIT || 10);

if (aggregateEnabled) {
  // 정기 스케줄러 등록
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
