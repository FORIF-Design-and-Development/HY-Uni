/**
 * 날짜/시간 유틸리티 함수
 * 한국 시간(KST, UTC+9) 기준으로 처리
 */

/**
 * ISO 문자열을 한국 시간(KST)으로 변환한 Date 객체 반환
 * @param dateString ISO 8601 형식의 날짜 문자열 (예: "2024-01-01T00:00:00.000Z")
 * @returns 한국 시간으로 변환된 Date 객체
 */
export function toKST(dateString: string): Date {
  const date = new Date(dateString);
  // UTC 시간에 9시간을 더함 (KST = UTC + 9)
  const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
  // getTime()은 UTC 기준 밀리초를 반환하므로, 여기에 9시간을 더함
  return new Date(date.getTime() + kstOffset);
}

/**
 * 현재 시간을 한국 시간으로 반환
 * @returns 한국 시간으로 변환된 현재 시간 Date 객체
 */
export function getNowKST(): Date {
  const now = new Date();
  // 현재 UTC 시간에 9시간을 더함 (KST = UTC + 9)
  const kstOffset = 9 * 60 * 60 * 1000;
  return new Date(now.getTime() + kstOffset);
}

