import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBoardPosts, BoardPostListItem } from '../../api/community/post.api';
import { getAbsoluteUrl } from '../../utils/url';
import { toKST, getNowKST } from '../../utils/date';

// 탭별 boardId 매핑
const boardIdMap: Record<string, number> = {
  '게시글': 83,    // 내가 작성한 게시글
  '댓글': 86,      // 내가 댓글단 게시글
  '스크랩': 84,    // 내가 스크랩한 게시글
  '좋아요': 85     // 내가 좋아요 누른 게시글
};

// 컴포넌트에서 사용하는 게시글 타입
interface PostItem {
  id: number;
  badge: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  time: string;
  hashtags: string[];
  hasImage: boolean;
  imageUrl: string | null;
  hasVideo: boolean;
  videoUrl: string | null;
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
  if (diffMin > 0) return `${diffMin}분 전`;
  return '방금 전';
}

// 서버 응답을 컴포넌트 형식으로 변환
function mapPostItem(post: BoardPostListItem): PostItem {
  return {
    id: post.id,
    badge: post.board.name,
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
  };
}

const MyBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('게시글');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const tabs = ['게시글', '댓글', '스크랩', '좋아요'];

  // 무한 스크롤 옵저버
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
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
  }, [hasMore, loading, loadingMore, activeTab]);

  // activeTab 변경 시 API 호출
  useEffect(() => {
    const fetchPosts = async () => {
      const boardId = boardIdMap[activeTab];
      if (!boardId) {
        setError('유효하지 않은 탭입니다.');
        return;
      }

      setLoading(true);
      setError(null);
      setCurrentPage(1);
      setHasMore(true);

      try {
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
        console.error('게시글 조회 실패:', err);
        setError(err.response?.data?.error?.message || '게시글을 불러오는 중 오류가 발생했습니다.');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
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
      console.error('추가 게시글 조회 실패:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePostClick = (post: PostItem) => {
    // Navigate with isMyPost flag to enable edit/delete features
    navigate(`/community/post/${post.id}`, { 
      state: { 
        boardName: post.badge,
        isMyPost: true,
        boardType: 'my'
      } 
    });
  };

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header with Tabs */}
      <header className="px-4 pt-3 pb-0 sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/community/board-list')}
            className="p-1 -ml-1 text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center ml-4 gap-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-lg transition-colors relative ${
                  activeTab === tab ? 'font-bold text-gray-900' : 'font-medium text-gray-300'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="underline"
                    className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-gray-900" 
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content List */}
      <div className="divide-y divide-gray-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {loading && (
              <div className="p-5 text-center text-gray-400">
                로딩 중...
              </div>
            )}

            {error && !loading && (
              <div className="p-5 text-center text-red-500">
                {error}
              </div>
            )}

            {!loading && !error && posts.length === 0 && (
              <div className="p-5 text-center text-gray-400">
                게시글이 없습니다.
              </div>
            )}

            {!loading && !error && posts.length > 0 && posts.map((post) => (
              <div 
                key={post.id} 
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handlePostClick(post)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <span className="inline-block bg-blue-200 text-blue-600 text-[10px] px-2 py-0.5 rounded font-medium mb-1.5">
                      {post.badge}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{post.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{post.content}</p>
                    
                    <div className="flex items-center flex-nowrap text-xs text-gray-400 gap-2 mb-2">
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
                      {post.hashtags.length > 0 && (
                        <>
                          <span className="text-gray-300 shrink-0">|</span>
                          <div className="flex gap-2 flex-nowrap">
                            {post.hashtags.map((tag, idx) => (
                              <span key={idx} className="bg-blue-50 text-gray-500 px-2 py-0.5 rounded-sm whitespace-nowrap shrink-0">{tag}</span>
                            ))}
                          </div>
                        </>
                      )}
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
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 무한 스크롤 트리거 */}
      <div ref={observerTarget} className="h-10 flex justify-center items-center py-4">
        {loadingMore && (
          <span className="text-gray-400 text-sm">게시글을 불러오는 중...</span>
        )}
        {!hasMore && posts.length > 0 && (
          <span className="text-gray-400 text-sm">더 이상 게시글이 없습니다.</span>
        )}
      </div>
    </div>
  );
};

export default MyBoardPage;

