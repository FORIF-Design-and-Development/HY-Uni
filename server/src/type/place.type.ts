// src/types/place.type.ts

// 1. 카테고리 Enum (DB의 ENUM과 일치)
// (컨벤션: 상수는 UPPER_SNAKE_CASE이나, TS에서는 문자열 유니언이 더 유연할 수 있음)
export type PlaceCategory =
  | "RESTAURANT"
  | "CAFE"
  | "BAR"
  | "STUDY_ROOM"
  | "ETC";

// 2. Place 인터페이스 (DB 테이블과 1:1 매핑)
// (컨벤션: 타입/클래스는 PascalCase, 속성은 camelCase)
export interface Place {
  placeId: number;
  name: string;
  address: string;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  kakaoPlaceId: string | null;
  kakaoPlaceUrl: string | null;
  phone: string | null;
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
}

// 3. 장소 생성을 위한 DTO
// (averageRating, reviewCount 등은 DB 기본값으로 자동 생성됨)
export interface CreatePlaceDTO {
  name: string;
  address: string;
  roadAddress?: string | null;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  kakaoPlaceId?: string | null;
  kakaoPlaceUrl?: string | null;
  phone?: string | null;
}
