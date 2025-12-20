import { Router } from "express";
import { getCalendarEvents } from "../../controllers/campus/academic_calendar.controller";

const router = Router();

// GET /api/calendar
router.get("/", getCalendarEvents);

export default router;
