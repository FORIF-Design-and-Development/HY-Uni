import { api } from '../axios';

// 게시글 목록 정렬 기준
export type BoardPostSortBy = 'latest' | 'likes' | 'comments' | 'views';

// 게시글 목록 조회 옵션
export interface GetBoardPostsOptions {
  boardId: number;
  page?: number;
  pageSize?: number;
  sortBy?: BoardPostSortBy;
}

// 게시글 태그
export interface PostTag {
  id: number;
  name: string;
}

// 게시글 목록 항목
export interface BoardPostListItem {
  id: number;
  title: string;
  content: string;
  contentSnippet: string;
  board: {
    id: number;
    name: string;
  };
  recommendationReason?: {
    matchedKeywords: string[];
    matchedTags: string[];
  };
  counts: {
    likes: number;
    comments: number;
    views: number;
  };
  createdAt: string;
  author: {
    nickname: string;
  };
  tags: PostTag[];
  previews: {
    imageUrl: string | null;
    videoUrl: string | null;
  };
  hasPoll: boolean; // 투표 여부
}

// 게시판 정보
export interface BoardInfo {
  id: number;
  name: string;
  description: string | null;
}

// 페이지네이션 정보
export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
}

// 게시글 목록 응답
export interface BoardPostListResponse {
  boardInfo: BoardInfo;
  posts: BoardPostListItem[];
  pagination: Pagination;
}

// API 응답 래퍼
export interface ApiResponse<T> {
  data: T;
  error: null;
  meta: {
    timestamp: string;
  };
}

// 게시글 상세 조회 응답 타입
export interface PostDetailResponse {
  id: number;
  status: 'published' | 'edited' | 'deleted';
  board: {
    id: number;
    name: string;
  };
  title: string;
  content: string;
  author: {
    id: number;
    nickname: string;
    isMine: boolean;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  counts: {
    likes: number;
    dislikes: number;
    comments: number;
    scraps: number;
    views: number;
  };
  tags: Array<{
    id: number;
    name: string;
  }>;
  userInteraction: {
    reaction: 'like' | 'dislike' | null;
    isScrapped: boolean;
  };
  attachments: {
    images: Array<{ url: string }>;
    videos: Array<{ url: string }>;
  };
  poll: {
    id: number;
    question: string;
    userVote: {
      selectedOptionId: number | null;
    };
    expiredAt: string | null;
    options: Array<{
      id: number;
      text: string;
      voteCount: number;
    }>;
  } | null;
  comments: Array<{
    id: number;
    status: 'active' | 'edited' | 'deleted' | 'blocked';
    content: string;
    isSecret: boolean;
    isBlockedByFilter: boolean;
    author: {
      id: number;
      nickname: string;
      isPostAuthor: boolean;
      isMine: boolean;
    };
    timestamps: {
      createdAt: string;
      updatedAt: string;
    };
    counts: {
      likes: number;
      dislikes: number;
    };
    userInteraction: {
      reaction: 'like' | 'dislike' | null;
    };
    parentCommentId: number | null;
    replies: Array<any>;
  }>;
}

// 게시글 반응 토글 응답 타입
export interface PostReactionResponse {
  postId: number;
  likesCount: number;
  dislikesCount: number;
  userReaction: 'like' | 'dislike' | null;
}

// 게시글 스크랩 토글 응답 타입
export interface PostScrapResponse {
  postId: number;
  scrapCount: number;
  isScrapped: boolean;
}

// 게시글 투표 응답 타입
export interface PostVoteResponse {
  pollId: number;
  userVote: {
    selectedOptionId: number | null;
  };
  results: Array<{
    id: number;
    text: string;
    voteCount: number;
  }>;
}

// 게시글 삭제 응답 타입
export interface DeletePostResponse {
  postId: number;
  message: string;
  status: 'deleted';
}

/**
 * 게시판별 게시글 목록 조회
 * @param options 게시글 목록 조회 옵션
 * @returns 게시글 목록 응답
 */
export async function getBoardPosts(
  options: GetBoardPostsOptions
): Promise<BoardPostListResponse> {
  const { boardId, page = 1, pageSize = 20, sortBy = 'latest' } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    sortBy,
  });

  const response = await api.get<ApiResponse<BoardPostListResponse>>(
    `/community/boards/${boardId}/posts?${params.toString()}`
  );

  return response.data.data;
}
/**
 * 게시글 상세 조회
 * @param postId 게시글 ID
 * @returns 게시글 상세 정보
 */
export async function getPostDetail(postId: number): Promise<PostDetailResponse> {
  const response = await api.get<ApiResponse<PostDetailResponse>>(
    `/community/posts/${postId}`
  );
  return response.data.data;
}

/**
 * 게시글 좋아요/싫어요 토글
 * @param postId 게시글 ID
 * @param type 반응 타입 ('like' | 'dislike')
 * @returns 반응 토글 결과
 */
export async function togglePostReaction(
  postId: number,
  type: 'like' | 'dislike'
): Promise<PostReactionResponse> {
  const response = await api.post<ApiResponse<PostReactionResponse>>(
    `/community/posts/${postId}/reaction`,
    { type }
  );
  return response.data.data;
}

/**
 * 게시글 스크랩 토글
 * @param postId 게시글 ID
 * @returns 스크랩 토글 결과
 */
export async function togglePostScrap(postId: number): Promise<PostScrapResponse> {
  const response = await api.post<ApiResponse<PostScrapResponse>>(
    `/community/posts/${postId}/scrap`
  );
  return response.data.data;
}

/**
 * 게시글 삭제
 * @param postId 게시글 ID
 * @returns 삭제 결과
 */
export async function deletePost(postId: number): Promise<DeletePostResponse> {
  const response = await api.delete<ApiResponse<DeletePostResponse>>(
    `/community/posts/${postId}`
  );
  return response.data.data;
}

/**
 * 게시글 투표
 * @param postId 게시글 ID
 * @param optionId 투표 옵션 ID
 * @returns 투표 결과
 */
export async function votePostPoll(
  postId: number,
  optionId: number
): Promise<PostVoteResponse> {
  const response = await api.post<ApiResponse<PostVoteResponse>>(
    `/community/posts/${postId}/vote`,
    { optionId }
  );
  return response.data.data;
}

/**
 * 게시글 투표 취소
 * @param postId 게시글 ID
 * @returns 투표 취소 결과
 */
export async function removePostVote(postId: number): Promise<PostVoteResponse> {
  const response = await api.delete<ApiResponse<PostVoteResponse>>(
    `/community/posts/${postId}/vote`
  );
  return response.data.data;
}

// 첨부파일 타입
export interface AttachmentItem {
  type: 'IMAGE' | 'VIDEO';
  url: string;
}

// 투표 페이로드 타입
export interface PollPayload {
  question: string;
  options: string[];
  expiredAt?: string | null;
}

// 게시글 생성 요청 본문
export interface CreatePostRequest {
  title: string;
  content: string;
  isAnonymous?: boolean;
  tagIds?: number[];
  attachments?: AttachmentItem[];
  poll?: PollPayload | null;
}

// 게시글 생성 응답
export interface CreatePostResponse {
  postId: number;
  message: string;
  status: string;
}

/**
 * 게시글 생성
 * @param boardId 게시판 ID
 * @param payload 게시글 생성 요청 본문
 * @returns 생성된 게시글 정보
 */
export async function createPost(
  boardId: number,
  payload: CreatePostRequest
): Promise<CreatePostResponse> {
  const response = await api.post<ApiResponse<CreatePostResponse>>(
    `/community/boards/${boardId}/posts`,
    payload
  );
  return response.data.data;
}

// 게시글 수정 요청 본문
export interface UpdatePostRequest {
  title?: string;
  content?: string;
  isAnonymous?: boolean;
  tagIds?: number[];
  attachments?: AttachmentItem[];
}

// 게시글 수정 응답
export interface UpdatePostResponse {
  postId: number;
  message: string;
  status: 'edited';
}

/**
 * 게시글 수정
 * @param postId 게시글 ID
 * @param payload 게시글 수정 요청 본문
 * @returns 수정된 게시글 정보
 */
export async function updatePost(
  postId: number,
  payload: UpdatePostRequest
): Promise<UpdatePostResponse> {
  const response = await api.patch<ApiResponse<UpdatePostResponse>>(
    `/community/posts/${postId}`,
    payload
  );
  return response.data.data;
}

