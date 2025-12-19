import { RowDataPacket } from 'mysql2';
import { pool } from '../../../config/db';
import { findUserById } from '../../../models/auth/auth.model';
import * as hylionModel from '../../../models/campus/hylion.model';

/**
 * 회원가입 시 하이리온 시스템 초기화
 * - 기본 아이콘(인사) 지급
 * - 현재 아이콘 설정
 * - 회원가입 미션 완료 처리
 */
export async function initializeUserHylion(userId: number): Promise<void> {
  try {
    // 1. 기본 아이콘 조회
    const defaultIcon = await hylionModel.getDefaultIcon();
    if (!defaultIcon) {
      console.error('[HylionService] 기본 아이콘을 찾을 수 없습니다.');
      return;
    }

    // 2. 기본 아이콘 지급
    await hylionModel.grantIconToUser(userId, defaultIcon.icon_id);

    // 3. 현재 아이콘 설정
    await hylionModel.initializeUserSettings(userId, defaultIcon.icon_id);

    // 4. 회원가입 미션 완료 처리
    const signupMission = await hylionModel.getMissionByCode('SIGNUP');
    if (signupMission) {
      await pool.query(
        `INSERT INTO user_mission_progress (user_id, mission_id, current_count, is_completed, completed_at)
         VALUES (?, ?, 1, TRUE, NOW())`,
        [userId, signupMission.mission_id]
      );
    }

    console.log(`[HylionService] 사용자 ${userId} 하이리온 초기화 완료`);
  } catch (error) {
    console.error('[HylionService] initializeUserHylion 오류:', error);
    throw error;
  }
}

/**
 * 미션 액션 로깅
 * @param userId 사용자 ID
 * @param missionCode 미션 코드 (예: 'COMMUNITY_POST')
 * @param actionType 액션 타입 (예: 'post_create')
 * @param referenceId 참조 ID (게시글 ID, 댓글 ID 등)
 */
export async function logMissionAction(
  userId: number,
  missionCode: string,
  actionType: string,
  referenceId?: number
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO mission_action_log (user_id, mission_code, action_type, reference_id)
       VALUES (?, ?, ?, ?)`,
      [userId, missionCode, actionType, referenceId || null]
    );

    console.log(`[HylionService] 미션 로그 기록: userId=${userId}, code=${missionCode}`);
  } catch (error) {
    console.error('[HylionService] logMissionAction 오류:', error);
    // 미션 로깅 실패는 중요하지 않으므로 에러를 던지지 않음
  }
}

/**
 * 미션 진행도 체크 및 업데이트
 * @param userId 사용자 ID
 * @param missionCategory 미션 카테고리 (예: 'community_post', 'community_comment')
 * @returns 완료된 미션 정보 (완료되지 않았으면 null)
 */
export async function checkAndUpdateMission(
  userId: number,
  missionCategory: string
): Promise<{
  missionCompleted: boolean;
  iconUnlocked?: {
    iconId: number;
    iconName: string;
    iconImageUrl: string;
  };
} | null> {
  try {
    // 1. 해당 카테고리의 활성 미션 조회
    const [missions] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM hylion_mission 
       WHERE mission_category = ? AND is_active = TRUE
       ORDER BY required_count ASC`,
      [missionCategory]
    );

    if (missions.length === 0) {
      return null;
    }

    // 2. 각 미션별로 진행도 체크
    for (const mission of missions) {
      // 2-1. 현재 진행도 조회
      const [progressRows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM user_mission_progress 
         WHERE user_id = ? AND mission_id = ?`,
        [userId, mission.mission_id]
      );

      const currentProgress = progressRows[0];

      // 2-2. 이미 완료된 미션은 스킵
      if (currentProgress && currentProgress.is_completed) {
        continue;
      }

      // 2-3. 실제 액션 횟수 조회 (mission_action_log에서)
      const missionCode = getMissionCodeByCategory(missionCategory);
      const [countRows] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM mission_action_log
         WHERE user_id = ? AND mission_code = ?`,
        [userId, missionCode]
      );

      const actualCount = (countRows[0] as any).count;

      // 2-4. 진행도 업데이트 또는 생성
      if (!currentProgress) {
        // 처음 시작하는 미션
        await pool.query(
          `INSERT INTO user_mission_progress (user_id, mission_id, current_count, is_completed, completed_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            mission.mission_id,
            actualCount,
            actualCount >= mission.required_count,
            actualCount >= mission.required_count ? new Date() : null,
          ]
        );
      } else {
        // 기존 진행도 업데이트
        await pool.query(
          `UPDATE user_mission_progress 
           SET current_count = ?, is_completed = ?, completed_at = ?
           WHERE user_id = ? AND mission_id = ?`,
          [
            actualCount,
            actualCount >= mission.required_count,
            actualCount >= mission.required_count ? new Date() : null,
            userId,
            mission.mission_id,
          ]
        );
      }

      // 2-5. 미션 완료 처리
      if (actualCount >= mission.required_count && !currentProgress?.is_completed) {
        console.log(`[HylionService] 미션 완료! userId=${userId}, missionId=${mission.mission_id}`);

        // 보상 아이콘 지급
        let unlockedIcon = null;

        if (mission.reward_type === 'fixed_icon' && mission.reward_icon_id) {
          // 일반 아이콘 지급
          const icon = await hylionModel.getIconById(mission.reward_icon_id);
          if (icon) {
            // 중복 지급 방지
            const hasIcon = await hylionModel.hasUserUnlockedIcon(userId, icon.icon_id);
            if (!hasIcon) {
              await hylionModel.grantIconToUser(userId, icon.icon_id, mission.mission_id);
              unlockedIcon = {
                iconId: icon.icon_id,
                iconName: icon.icon_name,
                iconImageUrl: icon.icon_image_url,
              };
            }
          }
        } else if (mission.reward_type === 'college_icon') {
          // 단과대 아이콘 지급
          const user = await findUserById(userId);
          if (user) {
            const [deptRows] = await pool.query<RowDataPacket[]>(
              'SELECT college_code FROM department WHERE department_id = ?',
              [user.department_id]
            );

            if (deptRows.length > 0) {
              const collegeCode = (deptRows[0] as any).college_code;
              const collegeIcon = await hylionModel.getIconByCollegeCode(collegeCode);

              if (collegeIcon) {
                const hasIcon = await hylionModel.hasUserUnlockedIcon(userId, collegeIcon.icon_id);
                if (!hasIcon) {
                  await hylionModel.grantIconToUser(userId, collegeIcon.icon_id, mission.mission_id);
                  unlockedIcon = {
                    iconId: collegeIcon.icon_id,
                    iconName: collegeIcon.icon_name,
                    iconImageUrl: collegeIcon.icon_image_url,
                  };
                }
              }
            }
          }
        }

        return {
          missionCompleted: true,
          ...(unlockedIcon && { iconUnlocked: unlockedIcon }),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[HylionService] checkAndUpdateMission 오류:', error);
    return null;
  }
}

/**
 * 카테고리로 미션 코드 추출
 * @param category 미션 카테고리
 * @returns 미션 코드 (로깅용)
 */
function getMissionCodeByCategory(category: string): string {
  const mapping: { [key: string]: string } = {
    community_post: 'COMMUNITY_POST',
    community_comment: 'COMMUNITY_COMMENT',
    cafeteria_review: 'CAFETERIA_REVIEW',
    timetable: 'TIMETABLE',
    lecture_review: 'LECTURE_REVIEW',
  };

  return mapping[category] || category.toUpperCase();
}