import { Router } from "express";
import {
  getAllSets,
  createSet,
  deleteSet,
} from "../../controllers/timetable/timetablesets.controller";

const router = Router();

router.get("/", getAllSets);
router.post("/", createSet);
router.delete("/:id", deleteSet);

export default router;
