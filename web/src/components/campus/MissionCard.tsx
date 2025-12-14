// web/src/components/campus/MissionCard.tsx
import { MissionProgressResponse } from '../../api/campus/hylion.api';

interface MissionCardProps {
  mission: MissionProgressResponse;
}

export const MissionCard = ({ mission }: MissionCardProps) => {
  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-purple-300 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        {/* 미션 정보 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-lg text-gray-800">
              {mission.missionName}
            </h3>
            {mission.isCompleted && (
              <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded-full">
                ✅ 완료
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{mission.missionDescription}</p>
        </div>

        {/* 보상 아이콘 미리보기 */}
        {mission.rewardIcon && (
          <div className="ml-4">
            <img
              src={`http://localhost:3000${
                mission.isCompleted
                  ? mission.rewardIcon.iconImageUrl
                  : mission.rewardIcon.iconLockedImageUrl
              }`}
              alt={mission.rewardIcon.iconName}
              className={`w-16 h-16 object-contain ${
                !mission.isCompleted && 'filter grayscale'
              }`}
            />
          </div>
        )}
      </div>

      {/* 진행 바 */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-gray-600 font-medium">
            진행도: {mission.currentCount} / {mission.targetCount}
          </span>
          <span className="font-bold text-purple-600">
            {mission.progressRate}%
          </span>
        </div>

        {/* 프로그레스 바 */}
        <div className="relative bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              mission.isCompleted
                ? 'bg-gradient-to-r from-green-400 to-green-600'
                : 'bg-gradient-to-r from-purple-400 to-purple-600'
            }`}
            style={{ width: `${mission.progressRate}%` }}
          />
          
          {/* 진행 중 애니메이션 */}
          {!mission.isCompleted && mission.progressRate > 0 && (
            <div
              className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
              style={{ width: `${mission.progressRate}%` }}
            />
          )}
        </div>
      </div>

      {/* 보상 정보 */}
      {mission.rewardIcon && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">🎁 보상:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">
                {mission.rewardIcon.iconName}
              </span>
              {mission.isCompleted && (
                <span className="text-xs text-green-600 font-bold">
                  (획득 완료!)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 완료 시간 */}
      {mission.completedAt && (
        <div className="mt-2 text-xs text-gray-400">
          완료 시간: {new Date(mission.completedAt).toLocaleDateString('ko-KR')}
        </div>
      )}
    </div>
  );
};