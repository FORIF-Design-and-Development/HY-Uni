import { Request, Response } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import * as hylionModel from '../../models/campus/hylion.model';

export class HylionController {
  /**
   * GET /api/hylion/collection
   * 사용자의 하이리온 컬렉션 조회 (획득/미획득 아이콘)
   */
  async getCollection(req: Request, res: Response) {
    try {
      // JWT 토큰에서 userId 추출
      const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: '인증 토큰이 필요합니다.',
          },
          meta: null,
        });
      }

      let userId: number;
      try {
        const payload = verifyAccessToken(token);
        userId = payload.userId;
      } catch (error) {
        return res.status(401).json({
          data: null,
          error: {
            code: 'INVALID_TOKEN',
            message: '유효하지 않은 토큰입니다.',
          },
          meta: null,
        });
      }

      // 현재 아이콘 조회
      const currentIcon = await hylionModel.getUserCurrentIcon(userId);

      // 획득한 아이콘 목록
      const unlockedIcons = await hylionModel.getUserUnlockedIcons(userId);

      // 미획득 아이콘 목록
      const lockedIcons = await hylionModel.getUserLockedIcons(userId);

      // 통계
      const stats = await hylionModel.getUserHylionStats(userId);

      return res.json({
        data: {
          currentIcon: currentIcon
            ? {
                iconId: currentIcon.icon_id,
                iconName: currentIcon.icon_name,
                iconCategory: currentIcon.icon_category,
                iconImageUrl: currentIcon.icon_image_url,
                iconDescription: currentIcon.icon_description,
              }
            : null,
          unlockedIcons: unlockedIcons.map((icon) => ({
            iconId: icon.icon_id,
            iconName: icon.icon_name,
            iconCategory: icon.icon_category,
            iconImageUrl: icon.icon_image_url,
            iconDescription: icon.icon_description,
            displayOrder: icon.display_order,
            unlockedAt: icon.unlocked_at,
            unlockedViaMission: icon.mission_name
              ? {
                  missionId: icon.unlocked_via_mission_id,
                  missionName: icon.mission_name,
                }
              : null,
          })),
          lockedIcons: lockedIcons.map((icon) => ({
            iconId: icon.icon_id,
            iconName: icon.icon_name,
            iconCategory: icon.icon_category,
            iconLockedImageUrl: icon.icon_locked_image_url,
            iconDescription: icon.icon_description,
            displayOrder: icon.display_order,
            howToUnlock: icon.how_to_unlock || '특별 미션 완료',
          })),
          stats: {
            totalUnlocked: stats.totalUnlocked,
            totalIcons: stats.totalIcons,
            completionRate: stats.completionRate,
            hasCollegeIcon: stats.hasCollegeIcon,
          },
        },
        error: null,
        meta: {},
      });
    } catch (error) {
      console.error('[HylionController] getCollection 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '컬렉션 조회 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * PATCH /api/hylion/current-icon
   * 현재 하이리온 아이콘 변경
   */
  async updateCurrentIcon(req: Request, res: Response) {
    try {
      // JWT 토큰에서 userId 추출
      const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: '인증 토큰이 필요합니다.',
          },
          meta: null,
        });
      }

      let userId: number;
      try {
        const payload = verifyAccessToken(token);
        userId = payload.userId;
      } catch (error) {
        return res.status(401).json({
          data: null,
          error: {
            code: 'INVALID_TOKEN',
            message: '유효하지 않은 토큰입니다.',
          },
          meta: null,
        });
      }

      const { iconId } = req.body;

      if (!iconId) {
        return res.status(400).json({
          data: null,
          error: {
            code: 'INVALID_REQUEST',
            message: 'iconId가 필요합니다.',
          },
          meta: null,
        });
      }

      // 아이콘 존재 여부 확인
      const icon = await hylionModel.getIconById(iconId);
      if (!icon) {
        return res.status(404).json({
          data: null,
          error: {
            code: 'ICON_NOT_FOUND',
            message: '존재하지 않는 아이콘입니다.',
          },
          meta: null,
        });
      }

      // 사용자가 해당 아이콘을 보유하고 있는지 확인
      const hasIcon = await hylionModel.hasUserUnlockedIcon(userId, iconId);
      if (!hasIcon) {
        return res.status(403).json({
          data: null,
          error: {
            code: 'ICON_LOCKED',
            message: '해금되지 않은 아이콘입니다.',
          },
          meta: null,
        });
      }

      // 현재 아이콘 업데이트
      await hylionModel.updateUserCurrentIcon(userId, iconId);

      // 업데이트된 아이콘 정보 조회
      const updatedIcon = await hylionModel.getUserCurrentIcon(userId);

      return res.json({
        data: {
          currentIcon: {
            iconId: updatedIcon!.icon_id,
            iconName: updatedIcon!.icon_name,
            iconImageUrl: updatedIcon!.icon_image_url,
            updatedAt: new Date().toISOString(),
          },
        },
        error: null,
        meta: {},
      });
    } catch (error) {
      console.error('[HylionController] updateCurrentIcon 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '아이콘 변경 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * GET /api/hylion/missions
   * 전체 미션 목록 조회 (사용자 진행도 포함)
   */
  async getAllMissions(req: Request, res: Response) {
    try {
      // JWT 토큰에서 userId 추출
      const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: '인증 토큰이 필요합니다.',
          },
          meta: null,
        });
      }

      let userId: number;
      try {
        const payload = verifyAccessToken(token);
        userId = payload.userId;
      } catch (error) {
        return res.status(401).json({
          data: null,
          error: {
            code: 'INVALID_TOKEN',
            message: '유효하지 않은 토큰입니다.',
          },
          meta: null,
        });
      }

      const { category } = req.query;

      // 미션 목록 조회 (진행도 포함)
      const missions = await hylionModel.getUserMissionsWithProgress(
        userId,
        category as string | undefined
      );

      // 보상 아이콘 정보 추가
      const missionsWithReward = await Promise.all(
        missions.map(async (mission) => {
          let rewardIcon = null;
          if (mission.reward_type === 'fixed_icon' && mission.reward_icon_id) {
            const icon = await hylionModel.getIconById(mission.reward_icon_id);
            if (icon) {
              rewardIcon = {
                iconId: icon.icon_id,
                iconName: icon.icon_name,
                iconImageUrl: icon.icon_image_url,
              };
            }
          }

          return {
            missionId: mission.mission_id,
            missionCode: mission.mission_code,
            missionName: mission.mission_name,
            missionCategory: mission.mission_category,
            missionDescription: mission.mission_description,
            requiredCount: mission.required_count,
            rewardType: mission.reward_type,
            rewardIcon,
            isActive: mission.is_active,
            userProgress: mission.current_count !== null
              ? {
                  currentCount: mission.current_count || 0,
                  isCompleted: mission.is_completed || false,
                  completedAt: mission.completed_at,
                  progressPercentage: mission.progress_percentage || 0,
                }
              : null,
          };
        })
      );

      const completedCount = missionsWithReward.filter(
        (m) => m.userProgress?.isCompleted
      ).length;

      return res.json({
        data: {
          missions: missionsWithReward,
        },
        error: null,
        meta: {
          totalMissions: missionsWithReward.length,
          completedMissions: completedCount,
        },
      });
    } catch (error) {
      console.error('[HylionController] getAllMissions 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '미션 목록 조회 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * GET /api/hylion/missions/progress
   * 미션 진행도 조회 (진행 중 / 완료)
   */
  async getMissionProgress(req: Request, res: Response) {
    try {
      // JWT 토큰에서 userId 추출
      const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: '인증 토큰이 필요합니다.',
          },
          meta: null,
        });
      }

      let userId: number;
      try {
        const payload = verifyAccessToken(token);
        userId = payload.userId;
      } catch (error) {
        return res.status(401).json({
          data: null,
          error: {
            code: 'INVALID_TOKEN',
            message: '유효하지 않은 토큰입니다.',
          },
          meta: null,
        });
      }

      const { category } = req.query;

      // 미션 진행도 조회
      const missions = await hylionModel.getUserMissionsWithProgress(
        userId,
        category as string | undefined
      );

      // 진행 중 / 완료 분리
      const inProgress: any[] = [];
      const completed: any[] = [];

      for (const mission of missions) {
        if (!mission.current_count && mission.current_count !== 0) {
          continue; // 시작하지 않은 미션은 제외
        }

        let rewardIcon = null;
        if (mission.reward_type === 'fixed_icon' && mission.reward_icon_id) {
          const icon = await hylionModel.getIconById(mission.reward_icon_id);
          if (icon) {
            rewardIcon = {
              iconId: icon.icon_id,
              iconName: icon.icon_name,
              iconImageUrl: icon.icon_image_url,
            };
          }
        }

        const missionData = {
          missionId: mission.mission_id,
          missionName: mission.mission_name,
          missionCategory: mission.mission_category,
          rewardIcon,
        };

        if (mission.is_completed) {
          completed.push({
            ...missionData,
            completedAt: mission.completed_at,
          });
        } else {
          inProgress.push({
            ...missionData,
            currentCount: mission.current_count,
            requiredCount: mission.required_count,
            progressPercentage: mission.progress_percentage,
          });
        }
      }

      return res.json({
        data: {
          inProgress,
          completed,
        },
        error: null,
        meta: {
          totalInProgress: inProgress.length,
          totalCompleted: completed.length,
        },
      });
    } catch (error) {
      console.error('[HylionController] getMissionProgress 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '미션 진행도 조회 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }

  /**
   * GET /api/hylion/icons
   * 전체 아이콘 목록 조회 (공개 API - 인증 불필요)
   */
  async getAllIcons(req: Request, res: Response) {
    try {
      const { category } = req.query;

      const icons = await hylionModel.getAllIcons(
        category as 'basic' | 'college' | undefined
      );

      return res.json({
        data: {
          icons: icons.map((icon) => ({
            iconId: icon.icon_id,
            iconName: icon.icon_name,
            iconCategory: icon.icon_category,
            collegeCode: icon.college_code,
            iconImageUrl: icon.icon_image_url,
            iconDescription: icon.icon_description,
            displayOrder: icon.display_order,
          })),
        },
        error: null,
        meta: {
          totalIcons: icons.length,
        },
      });
    } catch (error) {
      console.error('[HylionController] getAllIcons 오류:', error);
      return res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: '아이콘 목록 조회 중 오류가 발생했습니다.',
        },
        meta: null,
      });
    }
  }
}

export const hylionController = new HylionController();