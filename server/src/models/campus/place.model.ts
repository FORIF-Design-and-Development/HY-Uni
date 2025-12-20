import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool as db } from "../../config/db";

// ==========================================
// 1. Type Definitions (데이터 형태 정의)
// ==========================================

// 카테고리 Enum
export type PlaceCategory =
  | "RESTAURANT"
  | "CAFE"
  | "BAR"
  | "STUDY_ROOM"
  | "ETC";

// Place 인터페이스 (애플리케이션 내부에서 사용하는 객체 형태)
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
  image_url: string;
}

// 장소 생성을 위한 DTO
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

// ==========================================
// 2. Internal DB Helpers (DB 매핑용)
// ==========================================

// DB의 snake_case 컬럼을 위한 인터페이스 (내부 사용용이므로 export 불필요)
interface PlaceRow extends RowDataPacket {
  place_id: number;
  name: string;
  address: string;
  road_address: string | null;
  latitude: string;
  longitude: string;
  category: PlaceCategory;
  kakao_place_id: string | null;
  kakao_place_url: string | null;
  phone: string | null;
  // 💡 DECIMAL 타입들은 mysql2에서 string으로 반환됩니다.
  average_rating: string;
  review_count: number;
  created_at: string; // Date or string depending on driver config
  image_url: string;
}

/**
 * DB의 'PlaceRow' (snake_case)를 애플리케이션의 'Place' (camelCase)로 변환
 */
const mapRowToPlace = (row: PlaceRow): Place => {
  return {
    placeId: row.place_id,
    name: row.name,
    address: row.address,
    roadAddress: row.road_address,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    category: row.category,
    kakaoPlaceId: row.kakao_place_id,
    kakaoPlaceUrl: row.kakao_place_url,
    phone: row.phone,
    averageRating: parseFloat(row.average_rating),
    reviewCount: row.review_count,
    createdAt: new Date(row.created_at),
    image_url: row.image_url,
  };
};

// ==========================================
// 3. Data Access Logic (데이터 접근 함수)
// ==========================================

/**
 * 새 장소 생성
 */
export const create = async (placeData: CreatePlaceDTO): Promise<number> => {
  const {
    name,
    address,
    roadAddress,
    latitude,
    longitude,
    category,
    kakaoPlaceId,
    kakaoPlaceUrl,
    phone,
  } = placeData;

  const query = `
    INSERT INTO place (
      name, address, road_address, latitude, longitude, 
      category, kakao_place_id, kakao_place_url, phone
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.execute<ResultSetHeader>(query, [
    name,
    address,
    roadAddress,
    latitude,
    longitude,
    category,
    kakaoPlaceId,
    kakaoPlaceUrl,
    phone,
  ]);

  return result.insertId; // 생성된 place_id 반환
};

/**
 * 모든 장소 목록 조회 (지도 표시용)
 */
export const findAll = async (): Promise<Place[]> => {
  const query = `
    SELECT * FROM place 
    ORDER BY created_at DESC
  `;

  const [rows] = await db.query<PlaceRow[]>(query);
  return rows.map(mapRowToPlace);
};

/**
 * ID로 특정 장소 상세 조회
 */
export const findById = async (placeId: number): Promise<Place | null> => {
  const query = "SELECT * FROM place WHERE place_id = ?";

  const [rows] = await db.query<PlaceRow[]>(query, [placeId]);

  const firstRow = rows[0];
  if (firstRow) {
    return mapRowToPlace(firstRow);
  }

  return null;
};

/**
 * 리뷰가 생성/삭제될 때, place 테이블의 평점/리뷰 수를 다시 계산하여 업데이트
 */
export const updatePlaceRating = async (placeId: number): Promise<boolean> => {
  const query = `
    UPDATE place p
    SET
      review_count = (SELECT COUNT(*) FROM review r WHERE r.place_id = p.place_id),
      average_rating = (SELECT IFNULL(AVG(r.rating), 0) FROM review r WHERE r.place_id = p.place_id)
    WHERE p.place_id = ?
  `;

  try {
    const [result] = await db.execute<ResultSetHeader>(query, [placeId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(`Failed to update rating for place ${placeId}:`, error);
    return false;
  }
};
