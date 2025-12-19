import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Bell, Settings, ChevronRight, Heart, MessageCircle, Info, Star, Loader2 } from 'lucide-react';
import { KeywordItem, PostItem, FavoriteItem } from '../../types';
import { motion } from 'framer-motion';
import { getHomeData, type HomeDataResponse } from '../../api/community/home.api';

const CommunityHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<HomeDataResponse | null>(null);

  // Helper to get board type from name for Recommended posts
  const getBoardType = (name: string) => {
    if (name.includes('자유')) return 'free';
    if (name.includes('취업') || name.includes('진로')) return 'career';
    if (name.includes('동아리')) return 'club';
    if (name.includes('데이터')) return 'major';
    return 'generic';
  };

  // Generate positions for keywords/hashtags (max 5 items)
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

  // Format ISO date string to MM/DD and HH:MM
  const formatDateTime = (isoString: string): { date: string; time: string } => {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return {
      date: `${month}/${day}`,
      time: `${hours}:${minutes}`,
    };
  };

  // Transform recommended posts from API to PostItem format
  const transformRecommendedPosts = (posts: HomeDataResponse['recommendedPosts']): PostItem[] => {
    return posts.map((post) => {
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
      };
    });
  };

  // Transform favorite boards from API to FavoriteItem format
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
      // If no latest post, use current date/time as fallback
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

  // Transform keywords to KeywordItem format with positions
  const transformKeywords = (keywords: Array<{ name: string }>): KeywordItem[] => {
    const positions = generateKeywordPositions(keywords.length);
    return keywords.slice(0, 5).map((keyword, index) => ({
      id: index + 1,
      text: keyword.name,
      top: positions[index]?.top || '50%',
      left: positions[index]?.left || '50%',
    }));
  };

  // Transform hashtags to KeywordItem format with positions
  const transformHashtags = (tags: Array<{ id: number; name: string }>): KeywordItem[] => {
    const positions = generateKeywordPositions(tags.length);
    return tags.slice(0, 5).map((tag, index) => ({
      id: tag.id,
      text: `#${tag.name}`,
      top: positions[index]?.top || '50%',
      left: positions[index]?.left || '50%',
    }));
  };

  // Fetch home data on component mount
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

  // Transform data for rendering
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
      {/* Top Header */}
      <header className="flex justify-between items-center px-5 py-4 bg-white sticky top-0 z-50 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">커뮤니티</h1>
        <div className="flex gap-4 text-gray-700">
          {/* Version without notification badge */}
          <Link to="/community/board-list" className="p-1 hover:text-gray-900 transition-colors btn-press">
            <FileText className="w-6 h-6" />
          </Link>
          
          {/* Version WITH notification badge (Red Dot) */}
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

          {/* Version without notification badge */}
          <Link to="/community/settings" className="p-1 hover:text-gray-900 transition-colors btn-press">
            <Settings className="w-6 h-6" />
          </Link>
        </div>
      </header>

      <main className="px-5 space-y-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-center">
            {error}
          </div>
        )}

        {/* Content - Only show when not loading and no error */}
        {!loading && !error && (
          <>
            {/* Community Description Section */}
            <section className="bg-gray-100 rounded-full py-2.5 px-4 flex items-center gap-2 text-gray-600 shadow-md animate-fade-in-up delay-75">
              <Info className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">커뮤니티 설명</span>
            </section>

            {/* Preferred Keywords Section */}
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

            {/* Preferred Hashtags Section */}
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

            {/* Recommended Posts Section */}
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
                      <div className="font-bold">{post.title}</div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div className="flex items-center gap-2 truncate pr-2">
                        {post.contentPreview && (
                          <span className="truncate">{post.contentPreview}</span>
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

            {/* Favorites Section */}
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
