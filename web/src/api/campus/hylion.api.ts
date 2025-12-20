// web/src/api/campus/hylion.api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// ============================================
// 타입 정의
// ============================================

/**
 * 아이콘 카테고리
 */
export type IconCategory = 
  | 'basic'
  | 'college'
  | 'registration'
  | 'cafeteria_review'
  | 'community_post'
  | 'community_comment'
  | 'timetable'
  | 'course_review';

/**
 * 미션 타입
 */
export type MissionType = 
  | 'REGISTRATION'
  | 'CAFETERIA_REVIEW'
  | 'COMMUNITY_POST'
  | 'COMMUNITY_COMMENT'
  | 'TIMETABLE'
  | 'COURSE_REVIEW';

/**
 * 하이리온 아이콘
 */
export interface HylionIcon {
  iconId: number;
  iconName: string;
  iconCategory: IconCategory;
  collegeCode: string | null;
  iconImageUrl: string;
  iconLockedImageUrl: string;
  displayOrder: number;
  isDefault: boolean;
  iconDescription: string | null;
  createdAt: string;
}

/**
 * 미션 정보
 */
export interface Mission {
  missionId: number;
  missionCode: MissionType;
  missionName: string;
  missionDescription: string;
  targetCount: number;
  rewardIconId: number;
  isActive: boolean;
  createdAt: string;
  rewardIcon?: HylionIcon;
}

/**
 * 사용자 컬렉션
 */
export interface UserCollection {
  collectionId: number;
  userId: number;
  iconId: number;
  isCurrentIcon: boolean;
  unlockedAt: string;
  unlockedViaMission: string | null;
  icon?: HylionIcon;
}

/**
 * 미션 진행도
 */
export interface MissionProgress {
  progressId: number;
  userId: number;
  missionId: number;
  currentCount: number;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  mission?: Mission;
}

/**
 * 컬렉션 응답
 */
export interface CollectionResponse {
  currentIcon: HylionIcon | null;
  unlockedIcons: HylionIcon[];
  lockedIcons: HylionIcon[];
  stats: {
    totalIcons: number;
    totalUnlocked: number;
    completionRate: number;
  };
}

/**
 * 미션 진행도 응답
 */
export interface MissionProgressResponse {
  missionId: number;
  missionName: string;
  missionDescription: string;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  completedAt: string | null;
  rewardIcon: HylionIcon | null;
  progressRate: number;
}

/**
 * 전체 아이콘 응답
 */
export interface AllIconsResponse {
  basic: HylionIcon[];
  college: HylionIcon[];
  mission: HylionIcon[];
}

/**
 * API 응답 래퍼
 */
export interface ApiResponse<T> {
  data: T;
  error: null | {
    code: string;
    message: string;
  };
  meta: null;
}

// ============================================
// API 함수
// ============================================

/**
 * 사용자 하이리온 컬렉션 조회
 * @returns 사용자의 하이리온 컬렉션 데이터
 */
export const fetchHylionCollection = async (
  token: string
): Promise<CollectionResponse> => {
  try {
    const response = await axios.get<ApiResponse<CollectionResponse>>(
      `${API_BASE_URL}/hylion/collection`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.data;
  } catch (error) {
    console.error('[API] 하이리온 컬렉션 조회 실패:', error);
    throw error;
  }
};

/**
 * 현재 아이콘 변경
 * @param token - 인증 토큰
 * @param iconId - 변경할 아이콘 ID
 * @returns 변경된 현재 아이콘 정보
 */
export const changeCurrentIcon = async (
  token: string,
  iconId: number
): Promise<{ message: string; currentIcon: HylionIcon }> => {
  try {
    const response = await axios.patch<
      ApiResponse<{ message: string; currentIcon: HylionIcon }>
    >(
      `${API_BASE_URL}/hylion/current-icon`,
      { iconId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.data;
  } catch (error) {
    console.error('[API] 현재 아이콘 변경 실패:', error);
    throw error;
  }
};

/**
 * 미션 목록 조회
 * @param token - 인증 토큰
 * @returns 전체 미션 목록
 */
export const fetchMissions = async (token: string): Promise<Mission[]> => {
  try {
    // ✅ 백엔드 응답은 data: { missions: [...] } 형태임 (배열이 아님)
    const response = await axios.get<ApiResponse<{ missions: Mission[] }>>(
      `${API_BASE_URL}/hylion/missions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.data.missions;
  } catch (error) {
    console.error('[API] 미션 목록 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자 미션 진행도 조회
 * @param token - 인증 토큰
 * @returns 사용자의 미션 진행도 (MissionCard에서 사용하는 형태로 정규화)
 */
  export const fetchMissionProgress = async (
    token: string
  ): Promise<MissionProgressResponse[]> => {
    try {
      const response = await axios.get<
        ApiResponse<{ inProgress: any[]; completed: any[] }>
      >(`${API_BASE_URL}/hylion/missions/progress`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const { inProgress = [], completed = [] } = response.data.data ?? {};

      const mappedInProgress: MissionProgressResponse[] = (inProgress as any[]).map((m) => ({
        missionId: m.missionId,
        missionName: m.missionName,
        missionDescription: '',
        targetCount: m.requiredCount ?? m.targetCount ?? 0,
        currentCount: m.currentCount ?? 0,
        isCompleted: false,
        completedAt: null,
        rewardIcon: m.rewardIcon ?? null,
        progressRate: m.progressPercentage ?? m.progressRate ?? 0,
      }));


      const mappedCompleted: MissionProgressResponse[] = (completed as any[]).map((m) => {
      const targetCount = m.requiredCount ?? m.targetCount ?? 0;

      return {
        missionId: m.missionId,
        missionName: m.missionName,
        missionDescription: '',
        targetCount,
        currentCount: targetCount,
        isCompleted: true,
        completedAt: m.completedAt ?? null,
        rewardIcon: m.rewardIcon ?? null,
        progressRate: 100,
      };
    });


      return [...mappedInProgress, ...mappedCompleted];
    } catch (error) {
      console.error('[API] 미션 진행도 조회 실패:', error);
      throw error;
    }
  };




/**
 * 전체 아이콘 목록 조회 (인증 불필요)
 * @returns 전체 아이콘 목록 (카테고리별)
 */
export const fetchAllIcons = async (): Promise<AllIconsResponse> => {
  try {
    const response = await axios.get<ApiResponse<AllIconsResponse>>(
      `${API_BASE_URL}/hylion/icons`
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.data;
  } catch (error) {
    console.error('[API] 전체 아이콘 조회 실패:', error);
    throw error;
  }
};

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 미션 진행률 계산
 * @param currentCount - 현재 진행 수
 * @param targetCount - 목표 수
 * @returns 진행률 (0-100)
 */
export const calculateMissionProgress = (
  currentCount: number,
  targetCount: number
): number => {
  if (targetCount === 0) return 100;
  return Math.min(Math.round((currentCount / targetCount) * 100), 100);
};

/**
 * 컬렉션 완성도 계산
 * @param unlockedCount - 해금된 아이콘 수
 * @param totalCount - 전체 아이콘 수
 * @returns 완성도 (0-100)
 */
export const calculateCollectionRate = (
  unlockedCount: number,
  totalCount: number
): number => {
  if (totalCount === 0) return 0;
  return Math.round((unlockedCount / totalCount) * 100);
};

/**
 * 아이콘 카테고리 한글명 반환
 * @param category - 아이콘 카테고리
 * @returns 한글 카테고리명
 */
export const getCategoryName = (category: IconCategory): string => {
  const categoryMap: Record<IconCategory, string> = {
    basic: '기본',
    college: '단과대',
    registration: '회원가입',
    cafeteria_review: '학식 리뷰',
    community_post: '게시글',
    community_comment: '댓글',
    timetable: '시간표',
    course_review: '강의평',
  };

  return categoryMap[category] || category;
};

/**
 * 미션 타입 한글명 반환
 * @param missionType - 미션 타입
 * @returns 한글 미션 타입명
 */
export const getMissionTypeName = (missionType: MissionType): string => {
  const missionTypeMap: Record<MissionType, string> = {
    REGISTRATION: '회원가입',
    CAFETERIA_REVIEW: '학식 리뷰 작성',
    COMMUNITY_POST: '게시글 작성',
    COMMUNITY_COMMENT: '댓글 작성',
    TIMETABLE: '시간표 등록',
    COURSE_REVIEW: '강의평 작성',
  };

  return missionTypeMap[missionType] || missionType;
};