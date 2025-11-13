// src/services/place.service.ts

import { Place, CreatePlaceDTO } from "../type/place.type.js";
import * as placeRepository from "../repository/place.repository.js";

/**
 * [컨벤션: 함수명 camelCase]
 * 새 장소를 생성합니다.
 */
export const createPlace = async (
  placeData: CreatePlaceDTO
): Promise<Place> => {
  // 1. [비즈니스 로직] 필수 값 유효성 검사
  if (
    !placeData.name ||
    !placeData.address ||
    !placeData.latitude ||
    !placeData.longitude
  ) {
    const error = new Error("이름, 주소, 위도, 경도는 필수입니다.");
    (error as any).status = 400; // 400 Bad Request
    throw error;
  }

  // 2. Repository 호출 (생성)
  const newPlaceId = await placeRepository.create(placeData);

  // 3. 생성된 객체를 다시 조회해서 반환 (DB가 생성한 값 포함)
  const createdPlace = await placeRepository.findById(newPlaceId);

  if (!createdPlace) {
    const error = new Error("장소 생성 후 조회에 실패했습니다.");
    (error as any).status = 500; // 500 Internal Server Error
    throw error;
  }

  return createdPlace;
};

/**
 * 모든 장소 목록을 조회합니다. (지도 표시용)
 */
export const getPlaces = async (): Promise<Place[]> => {
  const places = await placeRepository.findAll();
  return places;
};

/**
 * ID로 특정 장소의 상세 정보를 조회합니다.
 */
export const getPlaceById = async (placeId: number): Promise<Place> => {
  const place = await placeRepository.findById(placeId);

  // 1. [비즈니스 로직] 장소가 없는 경우 404 에러
  if (!place) {
    const error = new Error("해당 장소를 찾을 수 없습니다.");
    (error as any).status = 404; // 404 Not Found
    throw error;
  }

  // 2. (향후 확장) 이 장소에 대한 리뷰 목록도 함께 조회...

  return place;
};

// ... (추후 updatePlace, deletePlace 등 추가) ...
