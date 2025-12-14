// web/src/components/campus/HylionStats.tsx
interface HylionStatsProps {
  totalIcons: number;
  totalUnlocked: number;
  completionRate: number;
  variant?: 'compact' | 'detailed';
}

export const HylionStats = ({
  totalIcons,
  totalUnlocked,
  completionRate,
  variant = 'compact',
}: HylionStatsProps) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4">
        {/* 프로그레스 바 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-600">컬렉션</span>
            <span className="text-xs text-gray-400">
              {totalUnlocked} / {totalIcons}
            </span>
          </div>
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-400 to-purple-600 h-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* 퍼센트 */}
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-600">
            {completionRate}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* 전체 아이콘 */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
        <div className="text-3xl mb-2">📦</div>
        <div className="text-2xl font-bold text-purple-600">{totalIcons}</div>
        <div className="text-sm text-gray-600 mt-1">전체 아이콘</div>
      </div>

      {/* 획득한 아이콘 */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
        <div className="text-3xl mb-2">✨</div>
        <div className="text-2xl font-bold text-green-600">{totalUnlocked}</div>
        <div className="text-sm text-gray-600 mt-1">획득 완료</div>
      </div>

      {/* 완성도 */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
        <div className="text-3xl mb-2">🎯</div>
        <div className="text-2xl font-bold text-orange-600">
          {completionRate}%
        </div>
        <div className="text-sm text-gray-600 mt-1">완성도</div>
      </div>

      {/* 전체 프로그레스 바 */}
      <div className="col-span-3 mt-2">
        <div className="bg-gray-200 rounded-full h-4 overflow-hidden relative">
          <div
            className="bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 h-full transition-all duration-500 relative"
            style={{ width: `${completionRate}%` }}
          >
            {/* 반짝이는 효과 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
          
          {/* 퍼센트 텍스트 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-700">
              {completionRate}% 완료
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};