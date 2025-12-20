import { api } from '../axios';

// API 응답 래퍼
export interface ApiResponse<T> {
  data: T;
  error: null;
  meta: {
    timestamp: string;
  } | null;
}

// 댓글 작성 요청 페이로드
export interface CreateCommentPayload {
  content: string;
  isAnonymous: boolean;
  isSecret: boolean;
}

// 댓글 작성 응답 타입
export interface CreateCommentResponse {
  commentId: number;
  message: string;
  status: 'active';
}

// 대댓글 작성 응답 타입
export interface CreateReplyResponse {
  commentId: number;
  parentCommentId: number;
  message: string;
  status: 'active';
}

// 댓글 수정 응답 타입
export interface UpdateCommentResponse {
  commentId: number;
  updatedAt: string;
  message: string;
  status: 'edited';
}

// 댓글 삭제 응답 타입
export interface DeleteCommentResponse {
  commentId: number;
  message: string;
  status: 'deleted';
}

// 댓글 반응 토글 응답 타입
export interface CommentReactionResponse {
  commentId: number;
  likeCount: number;
  dislikeCount: number;
  userReaction: 'like' | 'dislike' | null;
}

/**
 * 댓글 작성
 * @param postId 게시글 ID
 * @param payload 댓글 작성 데이터
 * @returns 댓글 작성 결과
 */
export async function createComment(
  postId: number,
  payload: CreateCommentPayload
): Promise<CreateCommentResponse> {
  const response = await api.post<ApiResponse<CreateCommentResponse>>(
    `/community/posts/${postId}/comments`,
    payload
  );
  return response.data.data;
}

/**
 * 대댓글 작성
 * @param commentId 부모 댓글 ID
 * @param payload 대댓글 작성 데이터
 * @returns 대댓글 작성 결과
 */
export async function createReply(
  commentId: number,
  payload: CreateCommentPayload
): Promise<CreateReplyResponse> {
  const response = await api.post<ApiResponse<CreateReplyResponse>>(
    `/community/comments/${commentId}/replies`,
    payload
  );
  return response.data.data;
}

/**
 * 댓글 수정
 * @param commentId 댓글 ID
 * @param content 수정할 내용
 * @returns 댓글 수정 결과
 */
export async function updateComment(
  commentId: number,
  content: string
): Promise<UpdateCommentResponse> {
  const response = await api.patch<ApiResponse<UpdateCommentResponse>>(
    `/community/comments/${commentId}`,
    { content }
  );
  return response.data.data;
}

/**
 * 댓글 삭제
 * @param commentId 댓글 ID
 * @returns 댓글 삭제 결과
 */
export async function deleteComment(commentId: number): Promise<DeleteCommentResponse> {
  const response = await api.delete<ApiResponse<DeleteCommentResponse>>(
    `/community/comments/${commentId}`
  );
  return response.data.data;
}

/**
 * 댓글 좋아요/싫어요 토글
 * @param commentId 댓글 ID
 * @param type 반응 타입 ('like' | 'dislike')
 * @returns 반응 토글 결과
 */
export async function toggleCommentReaction(
  commentId: number,
  type: 'like' | 'dislike'
): Promise<CommentReactionResponse> {
  const response = await api.post<ApiResponse<CommentReactionResponse>>(
    `/community/comments/${commentId}/reaction`,
    { type }
  );
  return response.data.data;
}

