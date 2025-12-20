import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PenSquare, Heart, MessageCircle, Info, Search, BarChart2, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBoardPosts, BoardPostListItem } from '../../api/community/post.api';
import { getAbsoluteUrl } from '../../utils/url';
import { toKST, getNowKST } from '../../utils/date';

// 컴포넌트에서 사용하는 게시글 타입
interface PostItem {
  id: number;
  title: string;
  content: string;
  likes: number;
  comments: number;
  time: string;
  hashtags?: string[];
  hasImage: boolean;
  imageUrl: string | null;
  hasVideo: boolean;
  videoUrl: string | null;
  hasPoll?: boolean;
}

// 상대 시간 포맷팅 함수 (한국 시간 기준)
function formatRelativeTime(dateString: string): string {
  const now = getNowKST();
  const date = toKST(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) return `${diffYear}년 전`;
  if (diffMonth > 0) return `${diffMonth}개월 전`;
  if (diffDay > 0) return `${diffDay}일 전`;
  if (diffHour > 0) return `${diffHour}시간 전`;
  if (diffMin > 0) {
    // 같은 날이면 시간:분 형식
    if (diffDay === 0) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return `${diffMin}분 전`;
  }
  return '방금 전';
}

// 서버 응답을 컴포넌트 형식으로 변환
function mapPostItem(post: BoardPostListItem): PostItem {
  return {
    id: post.id,
    title: post.title,
    content: post.contentSnippet || post.content,
    likes: post.counts.likes,
    comments: post.counts.comments,
    time: formatRelativeTime(post.createdAt),
    hashtags: post.tags.map(tag => `#${tag.name}`),
    hasImage: post.previews.imageUrl !== null,
    imageUrl: post.previews.imageUrl,
    hasVideo: post.previews.videoUrl !== null,
    videoUrl: post.previews.videoUrl,
    hasPoll: post.hasPoll,
  };
}

const InternationalBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Free');

  // 탭별 게시판 ID 매핑
  const boardIdMap: Record<string, number> = {
    'Free': 80,
    'Life': 81,
    'Info/Career': 82,
  };

  const tabs = ['Free', 'Life', 'Info/Career'];

  // State 관리
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 무한 스크롤 옵저버
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !searchQuery.trim()) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore, activeTab, searchQuery]);

  // 탭 변경 시 게시글 로드
  useEffect(() => {
    const loadPosts = async () => {
      const boardId = boardIdMap[activeTab];
      if (!boardId) return;

      try {
        setLoading(true);
        setError(null);
        setCurrentPage(1);
        setHasMore(true);
        
        const response = await getBoardPosts({
          boardId,
          page: 1,
          pageSize: 10,
          sortBy: 'latest',
        });

        const mappedPosts = response.posts.map(mapPostItem);
        setPosts(mappedPosts);
        setHasMore(response.pagination.currentPage < response.pagination.totalPages);
      } catch (err: any) {
        setError('게시글을 불러오는데 실패했습니다.');
        console.error('Failed to load posts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [activeTab]);

  // 추가 게시글 로드
  const loadMorePosts = async () => {
    const boardId = boardIdMap[activeTab];
    if (!boardId || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      
      const response = await getBoardPosts({
        boardId,
        page: nextPage,
        pageSize: 10,
        sortBy: 'latest',
      });

      const mappedPosts = response.posts.map(mapPostItem);
      setPosts(prev => [...prev, ...mappedPosts]);
      setCurrentPage(nextPage);
      setHasMore(response.pagination.currentPage < response.pagination.totalPages);
    } catch (err: any) {
      console.error('Failed to load more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // 검색 필터링
  const filteredPosts = searchQuery.trim()
    ? posts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.hashtags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : posts;

  const handlePostClick = (postId: number) => {
    navigate(`/community/post/${postId}`, { state: { boardName: 'International Board', boardType: 'international' } });
  };

  const handleWriteClick = () => {
    const boardId = boardIdMap[activeTab];
    navigate('/community/create', { state: { boardId } });
  };

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header */}
      <header className="flex items-center h-14 px-4 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate('/community/board-list')} className="p-2 -ml-2 text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        {/* Tabs in Header */}
        <div className="flex ml-2 gap-4">
            {tabs.map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-lg transition-colors relative ${activeTab === tab ? 'font-bold text-gray-900' : 'font-medium text-gray-300'}`}
                >
                    {tab}
                    {activeTab === tab && (
                        <motion.div 
                            layoutId="underline-intl"
                            className="absolute -bottom-[16px] left-0 right-0 h-[2px] bg-gray-900" 
                        />
                    )}
                </button>
            ))}
        </div>

        <div className="flex-1" />
        
        <div className="flex items-center gap-3">
          <button 
            className="p-1 text-gray-900"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="w-6 h-6" />
          </button>
          <button 
            className="p-1 text-gray-900"
            onClick={handleWriteClick}
          >
            <PenSquare className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* 검색 바 */}
      {showSearch && (
        <div className="px-5 py-3 border-b border-gray-100 bg-white">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색어를 입력하세요..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
      )}

      {/* Banner */}
      <div className="px-5 py-4">
         <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 text-gray-600">
            <Info className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium">Board rule detail</span>
         </div>
      </div>

      {/* 게시글 목록 */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            <span className="text-gray-400 text-sm">게시글을 불러오는 중...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center py-12">
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 border-t border-gray-100">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {filteredPosts.length === 0 ? (
                  <div className="flex justify-center items-center py-12">
                    <span className="text-gray-400 text-sm">
                      {searchQuery.trim() ? '검색 결과가 없습니다.' : '게시글이 없습니다.'}
                    </span>
                  </div>
                ) : (
                  filteredPosts.map(post => (
                    <div 
                      key={post.id} 
                      className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handlePostClick(post.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                          <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                            {post.title}
                            {post.hasPoll && (
                              <div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-500 font-medium">
                                <BarChart2 className="w-3 h-3" />
                                투표
                              </div>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">{post.content}</p>
                          
                          <div className="flex items-center text-xs text-gray-400 gap-2 flex-wrap">
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Heart className="w-3.5 h-3.5" />
                              <span>{post.likes}</span>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{post.comments}</span>
                            </div>
                            <span className="text-gray-300 shrink-0">|</span>
                            <span className="shrink-0">{post.time}</span>
                            <span className="text-gray-300 shrink-0">|</span>
                            {/* 해시태그 */}
                            <div className="flex gap-1 shrink-0">
                              {post.hashtags && post.hashtags.map((tag, i) => (
                                <span key={i} className="bg-blue-100 text-gray-600 px-2 py-0.5 rounded-sm">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        {(post.hasImage || post.hasVideo) && (
                          <div className="w-16 h-16 rounded-lg shrink-0 overflow-hidden bg-gray-200">
                            {post.imageUrl ? (
                              <img 
                                src={getAbsoluteUrl(post.imageUrl)} 
                                alt={post.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('이미지 로드 실패:', post.imageUrl);
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : post.hasVideo ? (
                              <div className="w-full h-full flex items-center justify-center bg-black">
                                <Play className="w-8 h-8 text-white" />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* 무한 스크롤 트리거 */}
          {!searchQuery.trim() && (
            <div ref={observerTarget} className="h-10 flex justify-center items-center py-4">
              {loadingMore && (
                <span className="text-gray-400 text-sm">게시글을 불러오는 중...</span>
              )}
              {!hasMore && filteredPosts.length > 0 && (
                <span className="text-gray-400 text-sm">더 이상 게시글이 없습니다.</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InternationalBoardPage;

