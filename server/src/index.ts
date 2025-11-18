import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import { pool } from './config/db';
import { corsMiddleware } from './middlewares/cors';
import { errorHandler, notFound } from './middlewares/error';

import cafeteriaRoutes from './routes/campus/cafeteria.routes';
import menuRoutes from './routes/campus/menu.routes';
import communityRoutes from './routes/community/community.routes';
import authRoutes from './routes/auth/auth.routes';
import departmentRoutes from './routes/auth/department.routes';

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
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);

//404, 에러 핸들러
app.use(notFound);
app.use(errorHandler);

//DB 연결 테스트
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('MySQL 연결 성공');
    conn.release();
  } catch (err) {
    console.error('MySQL 연결 실패:', (err as Error).message);
    process.exit(1);
  }
})();

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});