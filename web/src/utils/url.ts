/**
 * 상대 URL을 절대 URL로 변환하는 헬퍼 함수
 * @param relativeUrl 상대 URL (예: /uploads/images/filename.jpg)
 * @returns 절대 URL (예: http://localhost:3000/uploads/images/filename.jpg)
 */
export function getAbsoluteUrl(relativeUrl: string): string {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  // baseURL에서 /api를 제거한 서버 주소 사용
  const serverBase = baseURL.replace(/\/api$/, '');
  
  // relativeUrl이 이미 절대 URL인 경우 그대로 반환
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  
  // 상대 URL을 절대 URL로 변환
  return `${serverBase}${relativeUrl}`;
}

