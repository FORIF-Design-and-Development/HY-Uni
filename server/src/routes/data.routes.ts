import { Router } from "express";
import { getDepartments, getTags } from "../controllers/data.controller";

const router = Router();

// (GET) /api/data/departments
router.get("/departments", getDepartments);

// (GET) /api/data/tags
router.get("/tags", getTags);

export default router;
