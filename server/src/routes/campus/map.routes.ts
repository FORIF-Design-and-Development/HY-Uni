import { Router } from "express";
import {
  getBuildings,
  getBuildingDetail,
} from "../../controllers/campus/map.controller";

const router = Router();

// 건물 목록 및 검색
router.get("/buildings", getBuildings);

// 건물 상세
router.get("/buildings/:id", getBuildingDetail);

export default router;
