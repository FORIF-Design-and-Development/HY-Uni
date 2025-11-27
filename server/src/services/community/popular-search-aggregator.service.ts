import { aggregatePopularSearch } from '../../models/community/popular-search.model';

// baseTime을 정시로 정규화하는 함수 (UTC 기준, 분, 초, 밀리초를 0으로)
function normalizeToHour(baseTime: Date): Date {
  const normalized = new Date(baseTime);
  normalized.setUTCMinutes(0);
  normalized.setUTCSeconds(0);
  normalized.setUTCMilliseconds(0);
  return normalized;
}

// 인기 검색어 집계를 실행하는 함수
export async function runAggregation(
  baseTime: Date,
  periodHours: number = 24,
  limit: number = 100,
): Promise<void> {
  try {
    // baseTime을 정시로 정규화
    const normalizedBaseTime = normalizeToHour(baseTime);

    // 집계 실행
    await aggregatePopularSearch(normalizedBaseTime, periodHours, limit);

    console.log(
      `[${new Date().toISOString()}] 인기 검색어 집계 완료 - baseTime: ${normalizedBaseTime.toISOString()}, periodHours: ${periodHours}, limit: ${limit}`,
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] 인기 검색어 집계 실패:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

