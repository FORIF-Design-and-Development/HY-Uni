import { Router } from "express";
import {
  getActiveTimetable,
  addTimetableEntry,
  // updateTimetableEntry, (추후 구현)
  // deleteTimetableEntry, (추후 구현)
} from "../controllers/timetable.controller";
import { isAuthenticated } from "../middleware/auth.middleware";

const router = Router();

// /api/timetable 경로는 모두 로그인이 필요합니다.
router.use(isAuthenticated);

router.get("/active", getActiveTimetable);
router.post("/entry", addTimetableEntry);
// router.put('/entry/:id', updateTimetableEntry);
// router.delete('/entry/:id', deleteTimetableEntry);

export default router;
