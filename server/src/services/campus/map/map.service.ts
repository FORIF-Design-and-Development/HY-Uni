import * as mapModel from "../../../models/campus/map.model";
import { Building } from "../../../models/campus/map.model";

/**
 * 모든 건물 목록 조회
 * (검색어가 있으면 필터링)
 */
export const getBuildings = async (keyword?: string): Promise<Building[]> => {
  // 비즈니스 로직이 있다면 여기에 추가 (예: 권한 체크, 데이터 가공 등)
  // 현재는 단순 조회이므로 모델을 바로 호출
  return await mapModel.findAll(keyword);
};

/**
 * 특정 건물 상세 조회
 */
export const getBuildingById = async (id: number): Promise<Building | null> => {
  return await mapModel.findById(id);
};
