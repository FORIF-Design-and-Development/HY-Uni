import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db.js';

// DB 테이블 이름을 상수로 관리
export const POPULAR_SEARCH_TABLE = 'popular_search';

// MySQL이 반환한 RowDataPacket을 테이블 스키마에 맞춰 표현한 타입(= 원본 DB 레코드 형태).
export interface PopularSearchRow extends RowDataPacket {
  id: number;
  popular_rank: number;
  popular_query: string;
  count: number;
  base_time: Date;
}

// 인기 검색어 랭킹 아이템
export interface PopularSearchRankingItem {
  ranking: number;
  query: string;
}

// 인기 검색어 랭킹
export interface PopularSearchRanking {
  baseTime: Date;
  rankings: PopularSearchRankingItem[]; // 인기 검색어 랭킹 아이템 목록
}

// 가장 최근 인기 검색어 랭킹을 조회하는 함수
export async function findPopularSearchRankings(
  limit = 10,
): Promise<PopularSearchRanking | null> {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;

  const sql = `
    SELECT popular_rank, popular_query, base_time
    FROM ${POPULAR_SEARCH_TABLE}
    WHERE base_time = (
      SELECT MAX(base_time)
      FROM ${POPULAR_SEARCH_TABLE} 
    )
    ORDER BY popular_rank ASC
    LIMIT ?
  `;

  // 쿼리 실행 결과를 PopularSearchRow[] 배열로 변환
  const [rows] = await pool.query<PopularSearchRow[]>(sql, [safeLimit]);

  // 첫 번째 행을 추출
  const [firstRow] = rows;

  // 첫 번째 행이 없으면 null 반환
  if (!firstRow) {
    return null;
  }

  // 첫 번째 행의 base_time을 Date 객체로 변환
  const baseTime = new Date(firstRow.base_time);

  // 쿼리 실행 결과를 PopularSearchRankingItem[] 배열로 변환
  const rankings = rows.map((row: PopularSearchRow) => ({
    ranking: row.popular_rank,
    query: row.popular_query,
  }));

  // 인기 검색어 랭킹 반환
  return {
    baseTime,
    rankings,
  };
}
