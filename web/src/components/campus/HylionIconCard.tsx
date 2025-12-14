// web/src/components/campus/HylionIconCard.tsx
import { HylionIcon } from '../../api/campus/hylion.api';

interface HylionIconCardProps {
  icon: HylionIcon;
  isUnlocked: boolean;
  isCurrent: boolean;
  onClick?: () => void;
}

export const HylionIconCard = ({
  icon,
  isUnlocked,
  isCurrent,
  onClick,
}: HylionIconCardProps) => {
  return (
    <div
      className={`relative bg-white rounded-xl p-4 border-2 transition cursor-pointer ${
        isCurrent
          ? 'border-purple-600 shadow-lg scale-105'
          : isUnlocked
          ? 'border-gray-200 hover:border-purple-300 hover:shadow-md hover:scale-105'
          : 'border-gray-200 opacity-50 cursor-not-allowed'
      }`}
      onClick={() => isUnlocked && onClick?.()}
    >
      {/* 현재 아이콘 뱃지 */}
      {isCurrent && (
        <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow-md z-10">
          ✨ 현재
        </div>
      )}

      {/* 아이콘 이미지 */}
      <div className="relative">
        <img
          src={`http://localhost:3000${
            isUnlocked ? icon.iconImageUrl : icon.iconLockedImageUrl
          }`}
          alt={icon.iconName}
          className={`w-full h-24 object-contain mb-2 transition ${
            !isUnlocked && 'filter grayscale'
          }`}
        />

        {/* 잠금 오버레이 */}
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/20 rounded-lg p-2">
              <span className="text-2xl">🔒</span>
            </div>
          </div>
        )}
      </div>

      {/* 아이콘 이름 */}
      <p
        className={`text-sm font-medium text-center ${
          isUnlocked ? 'text-gray-800' : 'text-gray-400'
        }`}
      >
        {icon.iconName}
      </p>

      {/* 카테고리 뱃지 */}
      {isUnlocked && icon.iconCategory !== 'basic' && (
        <div className="mt-2 text-center">
          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
            {getCategoryLabel(icon.iconCategory)}
          </span>
        </div>
      )}

      {/* 설명 (호버 시) */}
      {icon.iconDescription && isUnlocked && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {icon.iconDescription}
        </div>
      )}
    </div>
  );
};

// 카테고리 라벨 헬퍼
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    college: '단과대',
    registration: '가입',
    cafeteria_review: '학식',
    community_post: '게시글',
    community_comment: '댓글',
    timetable: '시간표',
    course_review: '강의평',
  };
  return labels[category] || category;
}