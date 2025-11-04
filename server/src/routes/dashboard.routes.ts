import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller";
import { isAuthenticated } from "../middleware/auth.middleware";

const router = Router();

// /api/dashboard 경로는 모두 로그인이 필요합니다.
router.use(isAuthenticated);

// (GET) /api/dashboard/summary
router.get("/summary", getDashboardSummary);

export default router;
