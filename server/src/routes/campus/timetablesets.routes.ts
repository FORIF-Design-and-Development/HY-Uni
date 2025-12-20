import { Router } from "express";
import { requireAuth } from "../../middlewares/error";
import {
  getAllSets,
  createSet,
  deleteSet,
} from "../../controllers/campus/timetablesets.controller";

const router = Router();

router.get("/", requireAuth, getAllSets);
router.post("/", requireAuth, createSet);
router.delete("/:id", requireAuth, deleteSet);

export default router;
