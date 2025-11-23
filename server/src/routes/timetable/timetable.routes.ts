import { Router } from "express";
import {
  getTimetable,
  resetTimetable,
  addCourseToTimetable,
} from "../../controllers/timetable/timetable.controller";

const router = Router();

router.get("/", getTimetable);
router.delete("/reset", resetTimetable);
router.post("/", addCourseToTimetable);

export default router;
