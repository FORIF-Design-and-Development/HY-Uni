import { Router } from "express";
import { getCourses } from "../../controllers/timetable/courses.controller";

const router = Router();

router.get("/", getCourses);

export default router;
