import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PenSquare, Heart, MessageCircle, Info, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBoardPosts, BoardPostListItem } from '../../api/community/post.api';

// 탭별 boardId 매핑
const boardIdMap: Record<string, number> = {
  'Free': 80,        // International Board Free tab
  'Life': 81,        // International Board Life tab
  'Info/Promo': 82,  // International Board Info/Promo tab
};

// 컴포넌트에서 사용하는 게시글 타입
interface PostItem {
  id: number;
  title: string;
  content: string;
  likes: number;
  comments: number;
  time: string;
  hashtags: string[];
  hasImage: boolean;
  imageUrl: string | null;
  hasPoll?: boolean; // 투표 여부
}

// 상대 시간 포맷팅 함수
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
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
    title: post.title,
    content: post.contentSnippet || post.content,
    likes: post.counts.likes,
    comments: post.counts.comments,
    time: formatRelativeTime(post.createdAt),
    hashtags: post.tags.map(tag => `#${tag.name}`),
    hasImage: post.previews.imageUrl !== null,
    imageUrl: post.previews.imageUrl,
    hasPoll: post.hasPoll, // poll 존재 여부
  };
}

const InternationalBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Free');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardDescription, setBoardDescription] = useState<string | null>(null);

  const tabs = ['Free', 'Life', 'Info/Promo'];

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

      try {
        const response = await getBoardPosts({
          boardId,
          page: 1,
          pageSize: 20,
          sortBy: 'latest',
        });

        const mappedPosts = response.posts.map(mapPostItem);
        setPosts(mappedPosts);
        setBoardDescription(response.boardInfo.description);
      } catch (err: any) {
        console.error('게시글 조회 실패:', err);
        setError(err.response?.data?.error?.message || '게시글을 불러오는 중 오류가 발생했습니다.');
        setPosts([]);
        setBoardDescription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [activeTab]);

  const handlePostClick = (post: PostItem) => {
    navigate(`/community/post/${post.id}`, { 
      state: { 
        boardName: 'International Board', 
        boardType: 'international' 
      } 
    });
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
        
        <button 
            className="p-1 text-gray-900"
            onClick={() => navigate('/community/create')}
        >
            <PenSquare className="w-6 h-6" />
        </button>
      </header>

      {/* Banner */}
      <div className="px-5 py-4">
         <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 text-gray-600">
            <Info className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium">{boardDescription || 'Board rule detail'}</span>
         </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100 border-t border-gray-100">
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

                {!loading && !error && posts.length > 0 && posts.map(post => (
                     <div 
                        key={post.id} 
                        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handlePostClick(post)}
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
                                 
                                 <div className="flex items-center flex-nowrap text-xs text-gray-400 gap-2 overflow-x-auto no-scrollbar">
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
                                         <div className="flex gap-1 flex-nowrap">
                                           {post.hashtags.map((tag, idx) => (
                                             <span key={idx} className="bg-blue-100 text-gray-600 px-2 py-0.5 rounded-sm whitespace-nowrap shrink-0">{tag}</span>
                                           ))}
                                         </div>
                                       </>
                                     )}
                                 </div>
                             </div>
                             {post.hasImage && post.imageUrl && (
                               <img 
                                 src={post.imageUrl} 
                                 alt={post.title}
                                 className="w-16 h-16 object-cover rounded-lg shrink-0"
                               />
                             )}
                         </div>
                     </div>
                 ))}
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
};

export default InternationalBoardPage;

