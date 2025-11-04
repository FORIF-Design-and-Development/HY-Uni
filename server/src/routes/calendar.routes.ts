import { Router } from "express";
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../controllers/calendar.controller";
import { isAuthenticated } from "../middleware/auth.middleware";

const router = Router();

// /api/calendar 경로는 모두 로그인이 필요합니다.
router.use(isAuthenticated);

router.get("/", getCalendarEvents);
router.post("/", createCalendarEvent);
router.put("/:id", updateCalendarEvent);
router.delete("/:id", deleteCalendarEvent);

export default router;
