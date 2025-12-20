import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Bell, Settings, ChevronRight, Heart, MessageCircle, Info, Star, Loader2 } from 'lucide-react';
import { KeywordItem, PostItem, FavoriteItem } from '../../types';
import { motion } from 'framer-motion';
import { getHomeData, type HomeDataResponse } from '../../api/community/home.api';
import { toKST } from '../../utils/date';
import { BrandName } from '../../components/common/BrandName';

const CommunityHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<HomeDataResponse | null>(null);

  // 추천 게시글 게시판 타입 조회
  const getBoardType = (name: string) => {
    if (name.includes('자유')) return 'free';
    if (name.includes('취업') || name.includes('진로')) return 'career';
    if (name.includes('동아리')) return 'club';
    if (name.includes('데이터')) return 'major';
    return 'generic';
  };

  // 키워드 하이라이팅 함수
  const highlightKeywords = (text: string, keywords: string[]): React.ReactNode => {
    if (!keywords || keywords.length === 0) {
      return text;
    }

    // 정규식 특수문자 이스케이프 처리
    const escapedKeywords = keywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    
    // 정규식 패턴 생성 (대소문자 구분 없음)
    const pattern = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
    const parts = text.split(pattern);

    return (
      <>
        {parts.map((part, index) => {
          const isKeyword = keywords.some(kw => part.toLowerCase() === kw.toLowerCase());
          return isKeyword ? (
            <mark key={index} className="bg-blue-100 px-0.5 rounded font-medium">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </>
    );
  };

  // 선호 키워드/해시태그 위치 생성
  const generateKeywordPositions = (count: number): Array<{ top: string; left: string }> => {
    const positions = [
      { top: '15%', left: '30%' },
      { top: '25%', left: '60%' },
      { top: '55%', left: '15%' },
      { top: '65%', left: '40%' },
      { top: '60%', left: '75%' },
    ];
    return positions.slice(0, Math.min(count, 5));
  };

  // ISO 날짜 문자열을 MM/DD 및 HH:MM 형식으로 변환 (한국 시간 기준)
  const formatDateTime = (isoString: string): { date: string; time: string } => {
    const date = toKST(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return {
      date: `${month}/${day}`,
      time: `${hours}:${minutes}`,
    };
  };

  // 가장 최근 3개의 게시글만 반환
  const transformRecommendedPosts = (posts: HomeDataResponse['recommendedPosts']): PostItem[] => {
    // createdAt 기준 내림차순 정렬 후 상위 3개 게시글만 반환
    const sortedPosts = [...posts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
    
    return sortedPosts.map((post) => {
      const { date, time } = formatDateTime(post.createdAt);
      return {
        id: post.id,
        boardName: post.originalBoard.name,
        title: post.title,
        contentPreview: post.contentPreview,
        date,
        time,
        likes: post.likesCount,
        comments: post.commentCount,
        matchedKeywords: post.recommendationReason?.matchedKeywords || [],
      };
    });
  };

  // 즐겨찾기 게시판 데이터 변환
  const transformFavoriteBoards = (boards: HomeDataResponse['favoriteBoards']): FavoriteItem[] => {
    return boards.map((board) => {
      const boardType = getBoardType(board.name);
      if (board.latestPost) {
        const { date, time } = formatDateTime(board.latestPost.createdAt);
        return {
          id: board.id,
          boardName: board.name,
          description: board.latestPost.contentPreview || '',
          date,
          time,
          boardType,
        };
      }
      // 최신 게시글이 없으면 현재 날짜/시간을 기본값으로 사용
      const { date, time } = formatDateTime(new Date().toISOString());
      return {
        id: board.id,
        boardName: board.name,
        description: '',
        date,
        time,
        boardType,
      };
    });
  };

  // 선호 키워드 데이터 변환
  const transformKeywords = (keywords: Array<{ name: string }>): KeywordItem[] => {
    const positions = generateKeywordPositions(keywords.length);
    return keywords.slice(0, 5).map((keyword, index) => ({
      id: index + 1,
      text: keyword.name,
      top: positions[index]?.top || '50%',
      left: positions[index]?.left || '50%',
    }));
  };

  // 선호 해시태그 데이터 변환
  const transformHashtags = (tags: Array<{ id: number; name: string }>): KeywordItem[] => {
    // 무작위로 (배열섞기 후 상위 5개) 해시태그 선택
    const shuffled = [...tags].sort(() => Math.random() - 0.5);
    const selectedTags = shuffled.slice(0, 5);
    
    const positions = generateKeywordPositions(selectedTags.length);
    return selectedTags.map((tag, index) => ({
      id: tag.id,
      text: `#${tag.name}`,
      top: positions[index]?.top || '50%',
      left: positions[index]?.left || '50%',
    }));
  };

  // 홈 데이터 조회
  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getHomeData();
        setHomeData(data);
      } catch (err) {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        console.error('Failed to fetch home data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  // 데이터 변환
  const preferredKeywords: KeywordItem[] = homeData
    ? transformKeywords(homeData.userPreferences.keywords)
    : [];

  const preferredHashtags: KeywordItem[] = homeData
    ? transformHashtags(homeData.userPreferences.tags)
    : [];

  const recommendedPosts: PostItem[] = homeData
    ? transformRecommendedPosts(homeData.recommendedPosts)
    : [];

  const favoriteBoards: FavoriteItem[] = homeData
    ? transformFavoriteBoards(homeData.favoriteBoards)
    : [];

  const unReadNotificationCount = homeData?.unReadNotificationCount || 0;

  return (
    <div className="bg-white min-h-screen pb-10 font-sans">
      {/* 상단 헤더 */}
      <header className="flex justify-between items-center px-5 py-4 bg-white sticky top-0 z-50 animate-fade-in-up">
        <BrandName suffix="커뮤니티" size="lg" />
        <div className="flex gap-4 text-gray-700">
          {/* 알림 뱃지 없는 버전 - 새로운 알림 없을 때때 */}
          <Link to="/community/board-list" className="p-1 hover:text-gray-900 transition-colors btn-press">
            <FileText className="w-6 h-6" />
          </Link>
          
          {/* 알림 뱃지 있는 버전 - 새로운 알림 있을 때 */}
          <Link to="/community/notifications" className="p-1 hover:text-gray-900 transition-colors btn-press relative">
            <motion.div 
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ repeat: Infinity, repeatDelay: 5, duration: 0.5 }}
            >
              <Bell className="w-6 h-6" />
            </motion.div>
            {unReadNotificationCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </Link>

          {/* 설정 페이지 이동 */}
          <Link to="/community/settings" className="p-1 hover:text-gray-900 transition-colors btn-press">
            <Settings className="w-6 h-6" />
          </Link>
        </div>
      </header>

      <main className="px-5 space-y-8">
        {/* 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* 에러 상태 */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-center">
            {error}
          </div>
        )}

        {/* 컨텐츠 - 로딩 중이 아니고 에러 없을 때 */}
        {!loading && !error && (
          <>
            {/* 커뮤니티 설명 섹션 */}
            <section className="bg-gray-100 rounded-full py-2.5 px-4 flex items-center gap-2 text-gray-600 shadow-md animate-fade-in-up delay-75">
              <Info className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">커뮤니티 설명</span>
            </section>

            {/* 선호 키워드 섹션 */}
            <section className="animate-fade-in-up delay-100">
              <div className="flex items-center gap-1 mb-3">
                <h2 className="text-xl font-bold text-gray-900">선호 키워드</h2>
                <Link to="/community/keywords" className="text-gray-900 hover:text-gray-600 transition-colors p-1 btn-press">
                  <ChevronRight className="w-6 h-6" />
                </Link>
              </div>
              
              <div className="bg-[#3B9DEB] rounded-xl h-28 relative shadow-lg overflow-hidden w-full transform transition-transform hover:scale-[1.01] duration-300">
                {preferredKeywords.length > 0 ? (
                  preferredKeywords.map((kw, idx) => (
              <motion.div
                key={kw.id}
                className="absolute"
                style={{ top: kw.top, left: kw.left }}
                animate={{ 
                  y: [0, -5, 0],
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3, 
                  ease: "easeInOut",
                  delay: idx * 0.5 
                }}
              >
                <Link
                  to="/community/keywords"
                  className={`block text-white font-bold text-base whitespace-nowrap hover:scale-110 transition-transform duration-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] animate-scale-in`}
                  style={{ animationDelay: `${(idx + 1) * 100}ms` }}
                >
                  <div style={{ transform: 'translate(-50%, -50%)' }}>
                    {kw.text}
                    </div>
                  </Link>
                </motion.div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-white/70 text-sm">
                    선호 키워드를 설정해주세요
                  </div>
                )}
              </div>
            </section>

            {/* 선호 해시태그 섹션 */}
            <section className="animate-fade-in-up delay-150">
              <div className="flex items-center gap-1 mb-3">
                <h2 className="text-xl font-bold text-gray-900">선호 해시태그</h2>
                <Link to="/community/hashtags" className="text-gray-900 hover:text-gray-600 transition-colors p-1 btn-press">
                  <ChevronRight className="w-6 h-6" />
                </Link>
              </div>

              <div className="bg-[#FD9346] rounded-xl h-28 relative shadow-lg overflow-hidden w-full transform transition-transform hover:scale-[1.01] duration-300">
                {preferredHashtags.length > 0 ? (
                  preferredHashtags.map((tag, idx) => (
              <motion.div
                key={tag.id}
                className="absolute"
                style={{ top: tag.top, left: tag.left }}
                animate={{ 
                  y: [0, -5, 0],
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3, 
                  ease: "easeInOut",
                  delay: (idx + 2) * 0.5 
                }}
              >
                 <Link
                  to="/community/hashtags"
                  className={`block text-white font-bold text-base whitespace-nowrap hover:scale-110 transition-transform duration-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] animate-scale-in`}
                  style={{ animationDelay: `${(idx + 1) * 100}ms` }}
                >
                  <div style={{ transform: 'translate(-50%, -50%)' }}>
                    {tag.text}
                    </div>
                  </Link>
                </motion.div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-white/70 text-sm">
                    선호 해시태그를 설정해주세요
                  </div>
                )}
              </div>
            </section>

            {/* 추천 게시글 섹션 */}
            <section className="animate-fade-in-up delay-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">추천 게시판</h2>
              <div className="space-y-3">
                {recommendedPosts.length > 0 ? (
                  recommendedPosts.map((post, idx) => (
              <div 
                key={post.id} 
                onClick={() => navigate(`/community/post/${post.id}`, { state: { boardName: post.boardName } })}
                className={`block bg-gray-50 p-4 rounded-xl shadow-md cursor-pointer active:scale-[0.98] transition-transform animate-fade-in-up relative group`}
                style={{ animationDelay: `${200 + (idx * 100)}ms` }}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span 
                    className="text-xs text-gray-500 font-medium hover:text-blue-600 hover:underline z-10 p-0.5 -m-0.5"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/community/board/${getBoardType(post.boardName)}`);
                    }}
                  >
                    {post.boardName}
                  </span>
                  <span className="text-xs text-gray-400 tracking-tight">{post.date} {post.time}</span>
                </div>
                
                    <div className="mb-2 text-gray-900 text-lg leading-snug">
                      <div className="font-bold">
                        {post.matchedKeywords && post.matchedKeywords.length > 0
                          ? highlightKeywords(post.title, post.matchedKeywords)
                          : post.title}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div className="flex items-center gap-2 truncate pr-2">
                        {post.contentPreview && (
                          <span className="truncate">
                            {post.matchedKeywords && post.matchedKeywords.length > 0
                              ? highlightKeywords(post.contentPreview, post.matchedKeywords)
                              : post.contentPreview}
                          </span>
                        )}
                      </div>

                  <div className="flex gap-3 text-xs shrink-0">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{post.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.comments}</span>
                    </div>
                    </div>
                  </div>
                </div>
                  ))
                ) : (
                  <div className="bg-gray-50 p-8 rounded-xl text-center text-gray-500">
                    추천 게시글이 없습니다
                  </div>
                )}
              </div>
            </section>

            {/* 즐겨찾기 게시판 섹션 */}
            <section className="animate-fade-in-up delay-300">
              <h2 className="text-xl font-bold text-gray-900 mb-4">즐겨찾기</h2>
              <div className="space-y-3">
                {favoriteBoards.length > 0 ? (
                  favoriteBoards.map((fav, idx) => (
              <div 
                key={fav.id} 
                onClick={() => navigate(`/community/board/${fav.boardType || 'generic'}`)}
                className={`block bg-gray-50 p-4 rounded-xl shadow-md cursor-pointer active:scale-[0.98] transition-transform flex items-center justify-between animate-fade-in-up hover:bg-gray-100 group`}
                style={{ animationDelay: `${300 + (idx * 100)}ms` }}
              >
                <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {fav.boardName}
                </h3>
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  ))
                ) : (
                  <div className="bg-gray-50 p-8 rounded-xl text-center text-gray-500">
                    즐겨찾기 게시판이 없습니다
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default CommunityHomePage;
