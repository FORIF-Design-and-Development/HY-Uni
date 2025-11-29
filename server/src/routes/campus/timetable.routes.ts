import { Router } from "express";
import {
  getTimetable,
  resetTimetable,
  addCourseToTimetable,
} from "../../controllers/campus/timetable.controller";
import { requireAuth } from "../../middlewares/error";

const router = Router();

router.get("/", requireAuth, getTimetable);
router.delete("/reset", requireAuth, resetTimetable);
router.post("/", requireAuth, addCourseToTimetable);

export default router;
