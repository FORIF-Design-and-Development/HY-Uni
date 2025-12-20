import { api } from '../axios';

// API 응답 래퍼
export interface ApiResponse<T> {
  data: T;
  error: null;
  meta: {
    timestamp: string;
  } | null;
}

// 알림 타입
export type NotificationType =
  | 'new_post_in_board'
  | 'new_comment_on_post'
  | 'new_reply_on_comment'
  | 'new_reaction_on_post'
  | 'new_reaction_on_comment';

// 알림 항목
export interface Notification {
  id: number;
  recipientId: number;
  actorId: number | null;
  type: NotificationType;
  entityId: number | null;
  isRead: boolean;
  createdAt: string;
  // JOIN 된 추가 정보
  postTitle?: string;
  postContent?: string;
  boardId?: number;
  boardName?: string;
}

// 알림 목록 응답
export interface NotificationsResponse {
  notifications: Notification[];
}

// 알림 읽음 처리 응답
export interface MarkAsReadResponse {
  message: string;
}

// 모든 알림 읽음 처리 응답
export interface MarkAllAsReadResponse {
  message: string;
  count: number;
}

// 읽지 않은 알림 개수 응답
export interface UnreadCountResponse {
  count: number;
}

/**
 * 알림 목록 조회
 * @param limit 조회할 개수 (기본값: 50)
 * @param offset 시작 위치 (기본값: 0)
 * @param isRead 읽음 여부 필터 (선택)
 * @returns 알림 목록
 */
export async function getNotifications(
  limit: number = 50,
  offset: number = 0,
  isRead?: boolean
): Promise<NotificationsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (isRead !== undefined) {
    params.append('isRead', isRead.toString());
  }

  const response = await api.get<ApiResponse<NotificationsResponse>>(
    `/community/notifications?${params.toString()}`
  );
  return response.data.data;
}

/**
 * 알림 읽음 처리
 * @param notificationId 알림 ID
 * @returns 처리 결과
 */
export async function markNotificationAsRead(
  notificationId: number
): Promise<MarkAsReadResponse> {
  const response = await api.patch<ApiResponse<MarkAsReadResponse>>(
    `/community/notifications/${notificationId}/read`
  );
  return response.data.data;
}

/**
 * 모든 알림 읽음 처리
 * @returns 처리 결과
 */
export async function markAllNotificationsAsRead(): Promise<MarkAllAsReadResponse> {
  const response = await api.patch<ApiResponse<MarkAllAsReadResponse>>(
    '/community/notifications/read-all'
  );
  return response.data.data;
}

/**
 * 읽지 않은 알림 개수 조회
 * @returns 읽지 않은 알림 개수
 */
export async function getUnreadNotificationCount(): Promise<UnreadCountResponse> {
  const response = await api.get<ApiResponse<UnreadCountResponse>>(
    '/community/notifications/unread-count'
  );
  return response.data.data;
}

/**
 * 실시간 알림 스트림 URL 조회 (SSE)
 * @returns SSE 연결 URL
 */
export function getNotificationStreamUrl(): string {
  // api.defaults.baseURL이 설정되어 있다고 가정
  const baseURL = api.defaults.baseURL || '/api';
  return `${baseURL}/community/notifications/stream`;
}
