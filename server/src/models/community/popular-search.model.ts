import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/db';

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

// search_log에서 특정 기간의 검색어를 집계하여 popular_search에 저장하는 함수
export async function aggregatePopularSearch(
  baseTime: Date,
  periodHours: number = 24,
  limit: number = 10,
): Promise<void> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. 동일 base_time의 기존 데이터 삭제 (중복 방지)
    await connection.query(
      `DELETE FROM ${POPULAR_SEARCH_TABLE} WHERE base_time = ?`,
      [baseTime],
    );

    // 2. search_log에서 지난 periodHours 동안의 데이터 집계
    const sql = `
      INSERT INTO ${POPULAR_SEARCH_TABLE} (popular_rank, popular_query, count, base_time)
      SELECT 
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as popular_rank,
        query as popular_query,
        COUNT(*) as count,
        ? as base_time
      FROM search_log
      WHERE created_at >= DATE_SUB(?, INTERVAL ? HOUR)
      GROUP BY query
      ORDER BY COUNT(*) DESC
      LIMIT ?
    `;

    await connection.query(sql, [baseTime, baseTime, periodHours, limit]);

    // 3. 트랜잭션 커밋
    await connection.commit();
  } catch (error) {
    // 에러 발생 시 롤백
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
