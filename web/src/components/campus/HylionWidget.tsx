// web/src/components/campus/HylionWidget.tsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useHylionStore } from '../../store/hylion.store';

export const HylionWidget = () => {
  const { user, accessToken } = useAuthStore();
  const { currentIcon, fetchCollection, isLoading, error } = useHylionStore();

  useEffect(() => {
    // accessToken이 있을 때만 컬렉션 로드
    if (accessToken) {
      fetchCollection(accessToken);
    }
  }, [fetchCollection, accessToken]);

  // 로그인하지 않은 경우
  if (!accessToken) {
    return (
      <section className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-8 text-white mb-10 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-40 h-40 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-6xl">🦁</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">🦁 하이리온과 함께하세요!</h2>
              <p className="opacity-90 text-lg">로그인하면 나만의 하이리온을 만날 수 있어요</p>
            </div>
          </div>
          <div>
            <Link
              to="/login"
              className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-50 transition shadow-md"
            >
              로그인하러 가기 →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-8 text-white mb-10 shadow-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-8 text-white mb-10 shadow-lg">
        <p className="text-center">하이리온을 불러오는데 실패했습니다.</p>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-8 text-white mb-10 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        {/* 왼쪽: 하이리온 아이콘 + 인사말 */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {/* 하이리온 아이콘 - 애니메이션 추가 */}
          <div className="relative flex-shrink-0">
            {currentIcon ? (
              <div className="relative">
                {/* 그림자 */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-4 bg-black/20 rounded-full blur-md animate-shadow" />
                {/* 아이콘 */}
                <img
                  src={`http://localhost:3000${currentIcon.iconImageUrl}`}
                  alt={currentIcon.iconName}
                  className="w-32 h-32 object-contain drop-shadow-2xl animate-bounce-gentle relative z-10"
                />
              </div>
            ) : (
              <div className="relative">
                {/* 그림자 */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-4 bg-black/20 rounded-full blur-md animate-shadow" />
                {/* 기본 아이콘 */}
                <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center animate-bounce-gentle relative z-10">
                  <span className="text-5xl">🦁</span>
                </div>
              </div>
            )}
          </div>

          {/* 인사말 - 닉네임 사용 */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold mb-2 whitespace-nowrap">
              안녕하세요<br />
              {user?.nickname || user?.name || '학우'}님! 👋
            </h2>
            {!currentIcon && (
              <p className="opacity-90 text-base">
                하이리온과 함께 캠퍼스 생활을 시작해보세요
              </p>
            )}
          </div>
        </div>

        {/* 오른쪽: 상세보기 버튼만 */}
        <div className="flex-shrink-0">
          <Link
            to="/hylion"
            className="inline-block bg-white text-purple-600 px-4 py-2 rounded-lg font-bold hover:bg-purple-50 transition shadow-md text-xs whitespace-nowrap"
          >
            상세보기 →
          </Link>
        </div>
      </div>
    </section>
  );
};