import axios from "axios";

// 1. API 서버 주소
const API_URL = "http://localhost:3000/api";

// ⭐️ 중요: API 서버와 쿠키(세션)를 주고받기 위해 설정
axios.defaults.withCredentials = true;

// 2. 데이터 타입 정의 (User, Department, Tag 추가)
export interface Board {
  id: number;
  name: string;
  slug: string;
}
export interface PostSummary {
  id: number;
  title: string;
  created_at: string;
}
export interface Post extends PostSummary {
  content: string;
  board_id: number;
}
export interface User {
  id: number;
  email: string;
  nickname: string;
  department_id: number | null; // ⭐️ 추가 정보 (null이면 추가 정보 필요)
  google_id?: string;
}
export interface Department {
  id: number;
  name: string;
}
export interface Tag {
  id: number;
  name: string;
}

// 3. API 요청 함수들

/** (GET) 모든 게시판 목록 */
export const getBoards = async (): Promise<Board[]> => {
  const response = await axios.get(`${API_URL}/community/boards`);
  return response.data;
};

/** (GET) 특정 게시판의 글 목록 */
export const getPostsByBoard = async (slug: string) => {
  const response = await axios.get(`${API_URL}/community/board/${slug}`);
  return response.data as { board: Board; posts: PostSummary[] };
};

/** (GET) 특정 게시글 1개 */
export const getPostById = async (id: string): Promise<Post> => {
  const response = await axios.get(`${API_URL}/community/post/${id}`);
  return response.data;
};

//--- ⭐️ 인증 API 함수들 ---

/** (GET) /api/auth/me - 현재 로그인 상태 확인 */
export const checkUserStatus = async (): Promise<User | null> => {
  try {
    const response = await axios.get<User>(`${API_URL}/auth/me`);
    return response.data; // 로그인됨
  } catch (error) {
    return null; // 로그인 안됨 (401)
  }
};

/** (POST) /api/auth/logout - 로그아웃 */
export const logoutUser = async () => {
  await axios.post(`${API_URL}/auth/logout`);
};

//--- ⭐️ 데이터 API 함수들 (회원가입용) ---

/** (GET) /api/data/departments - 학과 목록 */
export const getDepartments = async (): Promise<Department[]> => {
  const response = await axios.get(`${API_URL}/data/departments`);
  return response.data;
};

/** (GET) /api/data/tags - 태그 목록 */
export const getTags = async (): Promise<Tag[]> => {
  const response = await axios.get(`${API_URL}/data/tags`);
  return response.data;
};

/** (POST) /api/auth/update-details - 추가 정보 전송 */
export const updateUserDetails = async (details: {
  departmentId: number;
  tagIds: number[];
}): Promise<User> => {
  const response = await axios.post(`${API_URL}/auth/update-details`, details);
  return response.data;
};

export interface MyDetails {
  user: User;
  tags: Tag[];
}

// ⭐️ (신규) 프로필 업데이트 시 보낼 데이터 타입
export interface ProfileUpdateData {
  nickname: string;
  departmentId: number;
  tagIds: number[];
}

/** (GET) /api/user/my-details - 내 상세 정보 (태그 포함) */
export const getMyDetails = async (): Promise<MyDetails> => {
  const response = await axios.get(`${API_URL}/user/my-details`);
  return response.data;
};

/** (PUT) /api/user/my-details - 프로필 정보 업데이트 */
export const updateMyProfile = async (
  data: ProfileUpdateData
): Promise<User> => {
  const response = await axios.put(`${API_URL}/user/my-details`, data);
  return response.data;
};
