import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool as db } from "../../config/db";

// ==========================================
// 1. Type Definitions
// ==========================================

// DB Row 타입 (snake_case)
interface BuildingRow extends RowDataPacket {
  id: number;
  name: string;
  building_code: string;
  description: string | null;
  x_coord: string; // DECIMAL은 string으로 반환됨
  y_coord: string;
  image_url: string | null;
}

// Frontend로 보낼 객체 타입 (camelCase)
export interface Building {
  id: number;
  name: string;
  buildingCode: string;
  description: string | null;
  x: number; // number로 변환
  y: number; // number로 변환
  imageUrl: string | null;
}

// ==========================================
// 2. Internal Helpers
// ==========================================

const mapRowToBuilding = (row: BuildingRow): Building => ({
  id: row.id,
  name: row.name,
  buildingCode: row.building_code,
  description: row.description,
  x: parseFloat(row.x_coord),
  y: parseFloat(row.y_coord),
  imageUrl: row.image_url,
});

// ==========================================
// 3. Data Access Logic
// ==========================================

/**
 * 모든 건물 목록 조회 (검색어 필터링 포함)
 */
export const findAll = async (keyword?: string): Promise<Building[]> => {
  let query = `
    SELECT * FROM campus_buildings
  `;
  const params: any[] = [];

  if (keyword) {
    query += ` WHERE name LIKE ? OR building_code LIKE ?`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  query += ` ORDER BY building_code ASC`;

  const [rows] = await db.query<BuildingRow[]>(query, params);
  return rows.map(mapRowToBuilding);
};

/**
 * ID로 특정 건물 상세 조회
 */
export const findById = async (id: number): Promise<Building | null> => {
  const [rows] = await db.query<BuildingRow[]>(
    "SELECT * FROM campus_buildings WHERE id = ?",
    [id]
  );

  // ⭐️ 수정됨: 배열 요소 추출 후 undefined 체크
  const row = rows[0];
  if (!row) return null;

  return mapRowToBuilding(row);
};
