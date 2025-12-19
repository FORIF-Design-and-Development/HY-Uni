import { Request, Response, NextFunction } from "express";
import * as mapService from "../../services/campus/map/map.service";

/**
 * 건물 목록 조회 API (GET /api/map/buildings)
 * ?q=검색어 로 필터링 가능
 */
export const getBuildings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const keyword = req.query.q as string | undefined;
    const buildings = await mapService.getBuildings(keyword);
    res.json(buildings);
  } catch (error) {
    next(error);
  }
};

/**
 * 특정 건물 상세 조회 API (GET /api/map/buildings/:id)
 */
export const getBuildingDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // ⭐️ 수정됨: req.params.id가 undefined가 아님을 확신하므로 'as string'으로 타입 단언
    const id = parseInt(req.params.id as string, 10);

    // 숫자가 아닌 값이 들어왔을 때에 대한 방어 로직 추가
    if (isNaN(id)) {
      res.status(400).json({ message: "유효하지 않은 ID입니다." });
      return;
    }

    const building = await mapService.getBuildingById(id);

    if (!building) {
      res.status(404).json({ message: "건물을 찾을 수 없습니다." });
      return;
    }

    res.json(building);
  } catch (error) {
    next(error);
  }
};
