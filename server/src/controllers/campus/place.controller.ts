// src/controllers/place.controller.ts

import { Request, Response, NextFunction } from "express";
// .js 확장자로 import 합니다.
import * as placeService from "../../services/campus/place/place.service";
import { CreatePlaceDTO } from "../../models/campus/place.model";

/**
 * 장소 생성 API (POST /)
 */
export const postPlace = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const placeData: CreatePlaceDTO = req.body;
    const newPlace = await placeService.createPlace(placeData);

    res.status(201).json(newPlace);
  } catch (error) {
    next(error);
  }
};

/**
 * 장소 전체 목록 조회 API (GET /)
 */
export const getPlaceList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const places = await placeService.getPlaces();
    res.status(200).json(places);
  } catch (error) {
    next(error);
  }
};

/**
 *  장소 상세 조회 API (GET /:id)
 */
export const getPlaceDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. URL 파라미터에서 ID 가져오기
    const placeId = parseInt(req.params.id as string, 10);
    if (isNaN(placeId)) {
      const error = new Error("유효하지 않은 ID입니다.");
      (error as any).status = 400; // 400 Bad Request
      throw error;
    }

    // 2. Service 로직 호출
    const place = await placeService.getPlaceById(placeId);

    // 3. 성공 응답 (service에서 404 처리를 했으므로 여기선 무조건 성공)
    res.status(200).json(place);
  } catch (error) {
    next(error);
  }
};

// ... (추후 putPlace, deletePlace 등 추가) ...
