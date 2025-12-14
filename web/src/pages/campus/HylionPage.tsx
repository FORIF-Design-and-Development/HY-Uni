// web/src/pages/campus/HylionPage.tsx
import { useEffect, useState } from 'react';
import { HylionIconCard } from '../../components/campus/HylionIconCard';
import { HylionStats } from '../../components/campus/HylionStats';
import { MissionCard } from '../../components/campus/MissionCard';
import { useAuthStore } from '../../store/auth.store';
import { useHylionStore } from '../../store/hylion.store';

export default function HylionPage() {
  const { user, accessToken } = useAuthStore();
  const {
    currentIcon,
    unlockedIcons,
    lockedIcons,
    stats,
    missionProgress,
    fetchCollection,
    fetchMissionProgress,
    changeIcon,
    isLoading,
    error,
  } = useHylionStore();

  const [selectedTab, setSelectedTab] = useState<'collection' | 'missions'>('collection');
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (accessToken) {
      fetchCollection(accessToken);
      fetchMissionProgress(accessToken);
    }
  }, [fetchCollection, fetchMissionProgress, accessToken]);

  // 필터링된 아이콘 목록
  const getFilteredIcons = () => {
    if (filter === 'unlocked') return unlockedIcons;
    if (filter === 'locked') return lockedIcons;
    return [...unlockedIcons, ...lockedIcons];
  };

  // 아이콘 변경 핸들러
  const handleIconChange = async (iconId: number) => {
    if (!accessToken) return;

    try {
      await changeIcon(accessToken, iconId);
      alert('아이콘이 변경되었습니다! 🎉');
    } catch {
      alert('아이콘 변경에 실패했습니다. 😢');
    }
  };

  // 로그인하지 않은 경우
  if (!accessToken) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-12 text-white text-center">
          <div className="text-6xl mb-4">🦁</div>
          <h1 className="text-3xl font-bold mb-4">하이리온과 함께하세요!</h1>
          <p className="text-lg opacity-90 mb-6">
            로그인하면 나만의 하이리온을 만나고 컬렉션을 완성할 수 있어요
          </p>
          <a
            href="/login"
            className="inline-block bg-white text-purple-600 px-8 py-3 rounded-lg font-bold hover:bg-purple-50 transition"
          >
            로그인하러 가기 →
          </a>
        </div>
      </div>
    );
  }

  if (isLoading && !currentIcon) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-gray-500">하이리온을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* 헤더 섹션 */}
      <section className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-8 text-white mb-10 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-6">
            {/* 현재 하이리온 */}
            <div className="relative">
              {currentIcon ? (
                <div className="relative">
                  <img
                    src={`http://localhost:3000${currentIcon.iconImageUrl}`}
                    alt={currentIcon.iconName}
                    className="w-32 h-32 object-contain drop-shadow-2xl"
                  />
                  {/* 반짝이는 효과 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              ) : (
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-6xl">🦁</span>
                </div>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-2">
                {user?.name || '학우'}님의 하이리온
              </h1>
              <p className="opacity-90 text-lg mb-4">
                {currentIcon ? currentIcon.iconName : '기본 하이리온'}
              </p>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="opacity-70">컬렉션</p>
                  <p className="font-bold text-2xl">
                    {stats.totalUnlocked}/{stats.totalIcons}
                  </p>
                </div>
                <div>
                  <p className="opacity-70">완성도</p>
                  <p className="font-bold text-2xl">{stats.completionRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* 통계 섹션 (모바일에서는 아래로) */}
          <div className="w-full md:w-auto md:min-w-[300px]">
            <HylionStats
              totalIcons={stats.totalIcons}
              totalUnlocked={stats.totalUnlocked}
              completionRate={stats.completionRate}
              variant="compact"
            />
          </div>
        </div>
      </section>

      {/* 탭 메뉴 */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setSelectedTab('collection')}
          className={`pb-3 px-4 font-bold transition relative ${
            selectedTab === 'collection'
              ? 'text-purple-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          📦 컬렉션
          {selectedTab === 'collection' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
          )}
        </button>
        <button
          onClick={() => setSelectedTab('missions')}
          className={`pb-3 px-4 font-bold transition relative ${
            selectedTab === 'missions'
              ? 'text-purple-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          🎯 미션
          {selectedTab === 'missions' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
          )}
        </button>
      </div>

      {/* 컬렉션 탭 */}
      {selectedTab === 'collection' && (
        <div>
          {/* 필터 + 통계 */}
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            {/* 필터 버튼 */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: '전체' },
                { key: 'unlocked', label: `해금됨 (${unlockedIcons.length})` },
                { key: 'locked', label: `잠김 (${lockedIcons.length})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as typeof filter)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filter === key
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 아이콘 개수 표시 */}
            <div className="text-sm text-gray-500">
              {getFilteredIcons().length}개 아이콘
            </div>
          </div>

          {/* 아이콘 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {getFilteredIcons().map((icon) => {
              const isUnlocked = unlockedIcons.some((i) => i.iconId === icon.iconId);
              const isCurrent = currentIcon?.iconId === icon.iconId;

              return (
                <HylionIconCard
                  key={icon.iconId}
                  icon={icon}
                  isUnlocked={isUnlocked}
                  isCurrent={isCurrent}
                  onClick={() => handleIconChange(icon.iconId)}
                />
              );
            })}
          </div>

          {/* 빈 상태 */}
          {getFilteredIcons().length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-400">표시할 아이콘이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* 미션 탭 */}
      {selectedTab === 'missions' && (
        <div>
          {/* 미션 통계 */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {missionProgress.length}
                </div>
                <div className="text-sm text-gray-600">전체 미션</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {missionProgress.filter((m) => m.isCompleted).length}
                </div>
                <div className="text-sm text-gray-600">완료</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {missionProgress.filter((m) => !m.isCompleted && m.currentCount > 0).length}
                </div>
                <div className="text-sm text-gray-600">진행 중</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">
                  {missionProgress.filter((m) => m.currentCount === 0).length}
                </div>
                <div className="text-sm text-gray-600">미시작</div>
              </div>
            </div>
          </div>

          {/* 미션 리스트 */}
          <div className="space-y-4">
            {missionProgress.length > 0 ? (
              missionProgress.map((mission) => (
                <MissionCard key={mission.missionId} mission={mission} />
              ))
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-gray-400">미션 정보를 불러오는 중...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-600 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}