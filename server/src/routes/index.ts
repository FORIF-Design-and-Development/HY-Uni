import type { Express } from 'express';

import authRoutes from './auth/auth.routes';
import departmentRoutes from './auth/department.routes';
import cafeteriaRoutes from './campus/cafeteria.routes';
import menuRoutes from './campus/menu.routes';
import { noticeRoutes } from './campus/notice.routes';
import { placeRoutes } from './campus/place.routes';
import seatsRoutes from './campus/seats.routes';
import communityRoutes from './community/community.routes';
import coursesRoutes from './campus/courses.routes';
import timetableRoutes from './campus/timetable.routes';
import timetablesetsRoutes from './campus/timetablesets.routes';
import calendarRoutes from './campus/calendar.routes';
import reviewRouter from './campus/timetable.review.routers'; 


export function registerRoutes(app: Express) {
  //기본 라우트
  app.get("/", (_req, res) => { res.json({ ok: true }); });

  //피쳐별 라우트 등록
  app.use('/api/community', communityRoutes);
  app.use('/api/cafeterias', cafeteriaRoutes);
  app.use('/api/menus', menuRoutes);
  app.use('/api/seats', seatsRoutes);
  app.use('/api/notices', noticeRoutes);
  app.use('/api/places', placeRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/courses', coursesRoutes);
  app.use('/api/timetable', timetableRoutes);
  app.use('/api/timetablesets', timetablesetsRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use("/api/reviews", reviewRouter);
}