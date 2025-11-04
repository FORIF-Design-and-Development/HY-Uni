import { Router } from "express";

// 기존 라우터 임포트
import communityRouter from "./community.routes";
import authRouter from "./auth.routes";
// import dataRouter from './data.routes'; //
// import userRouter from './user.routes'; //

// ⭐️ (신규) 대시보드 기능 관련 라우터 임포트
import dashboardRouter from "./dashboard.routes";
import calendarRouter from "./calendar.routes";
import timetableRouter from "./timetable.routes";

const router = Router();

// --- 기존 라우터 등록 ---
// (GET) /api/community/...
router.use("/community", communityRouter);

// (GET) /api/auth/...
router.use("/auth", authRouter);

// (GET) /api/data/...
// router.use('/data', dataRouter); //

// (GET/PUT) /api/user/...
// router.use('/user', userRouter); //

// --- ⭐️ (신규) 대시보드 라우터 등록 ---
// (GET) /api/dashboard/...
router.use("/dashboard", dashboardRouter);

// (CRUD) /api/calendar/...
router.use("/calendar", calendarRouter);

// (CRUD) /api/timetable/...
router.use("/timetable", timetableRouter);

export default router;
