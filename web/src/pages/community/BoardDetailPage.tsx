import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, PenSquare, Heart, MessageCircle, Info, BarChart2 } from 'lucide-react';
import { getBoardPosts, BoardPostListItem } from '../../api/community/post.api';
import { getBoards } from '../../api/community/board.api';

// 컴포넌트에서 사용하는 게시글 타입
interface PostItem {
  id: number;
  badge: string;
  badgeIsHashtag: boolean;
  title: string;
  content: string;
  likes: number;
  comments: number;
  time: string;
  hashtags?: string[];
  topHashtags?: string[];
  hasImage: boolean;
  imageGray?: boolean;
  hasPoll?: boolean;
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
function mapPostItem(post: BoardPostListItem, isFreeBoard: boolean, boardName: string): PostItem {
  return {
    id: post.id,
    badge: isFreeBoard ? (post.tags[0]?.name ? `#${post.tags[0].name}` : '') : boardName,
    badgeIsHashtag: isFreeBoard,
    title: post.title,
    content: post.contentSnippet || post.content,
    likes: post.counts.likes,
    comments: post.counts.comments,
    time: formatRelativeTime(post.createdAt),
    hashtags: post.tags.map(tag => `#${tag.name}`),
    topHashtags: post.tags.slice(0, 3).map(tag => `#${tag.name}`),
    hasImage: post.previews.imageUrl !== null,
    imageGray: false,
    hasPoll: false, // TODO: API 응답에 poll 정보가 있으면 추가
  };
}

const BoardDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { type } = useParams<{ type: string }>();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<number | null>(null);
  const [title, setTitle] = useState('게시판');
  const [bannerText, setBannerText] = useState('게시판 규칙 설명');

  // Determine if this board requires sky blue hashtags
  const isSkyBlueHashtagBoard = ['club', 'career', 'major'].includes(type || '');
  const isFreeBoard = type === 'free';
  
  // Boards that should show the right icons (Search, Write)
  const isWriteableBoard = ['free', 'club', 'career', 'major'].includes(type || '');

  // Load board ID from board list based on type
  useEffect(() => {
    const loadBoardId = async () => {
      try {
        const boardsResponse = await getBoards();
        const boards = boardsResponse.boards;
        
        // Helper function to get route type from board name (same as BoardListPage)
        const getRouteType = (boardName: string): string => {
          if (boardName.includes('나의')) return 'my';
          if (boardName.includes('추천')) return 'recommended';
          if (boardName.includes('HOT') || boardName.includes('BEST')) return 'hot';
          if (boardName.includes('자유')) return 'free';
          if (boardName.includes('동아리')) return 'club';
          if (boardName.includes('취업') || boardName.includes('진로')) return 'career';
          if (boardName.includes('단과대') || boardName.includes('학과')) return 'major';
          if (boardName.includes('International')) return 'international';
          return 'generic';
        };

        // Find board by matching type
        const matchedBoard = boards.find(board => getRouteType(board.name) === type);
        
        if (matchedBoard) {
          setBoardId(matchedBoard.id);
          setTitle(matchedBoard.name);
          setBannerText(`${matchedBoard.name} 규칙 설명`);
        } else {
          // Fallback: use first board or set error
          setError('게시판을 찾을 수 없습니다.');
        }
      } catch (err: any) {
        console.error('게시판 목록 조회 실패:', err);
        setError('게시판 정보를 불러오는데 실패했습니다.');
      }
    };

    loadBoardId();
  }, [type]);

  // Load posts when boardId is available
  useEffect(() => {
    if (!boardId) return;

    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getBoardPosts({
          boardId,
          page: 1,
          pageSize: 20,
          sortBy: 'latest',
        });

        const mappedPosts = response.posts.map(post => mapPostItem(post, isFreeBoard, response.boardInfo.name));
        setPosts(mappedPosts);
        
        // Update title and banner from API response
        setTitle(response.boardInfo.name);
        if (response.boardInfo.description) {
          setBannerText(response.boardInfo.description);
        } else {
          setBannerText(`${response.boardInfo.name} 규칙 설명`);
        }
      } catch (err: any) {
        console.error('게시글 목록 조회 실패:', err);
        setError(err.response?.data?.error?.message || '게시글을 불러오는 중 오류가 발생했습니다.');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [boardId, isFreeBoard]);

  // Effect to handle new post creation
  useEffect(() => {
    if (location.state?.newPost) {
      // Transform newPost to PostItem format if needed
      const newPostItem = location.state.newPost as PostItem;
      setPosts(prev => [newPostItem, ...prev]);
      // Clear the state to prevent duplicate additions on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handlePostClick = (postId: number) => {
    navigate(`/community/post/${postId}`, { state: { boardName: title, boardType: type } });
  };

  const handleWriteClick = () => {
    // Pass boardType and boardName to CreatePostPage
    navigate('/community/create', { state: { boardType: type, boardName: title, boardId } });
  };

  const showRightIcons = isWriteableBoard;

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header */}
      <header className="flex items-center h-14 px-4 bg-white sticky top-0 z-10">
        <button
          onClick={() => navigate('/community/board-list')}
          className="p-2 -ml-2 text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900">{title}</h1>
        <div className="w-8" /> {/* Spacer for centering if no icons */}
        
        {showRightIcons && (
          <div className="absolute right-4 flex items-center gap-3 text-gray-900">
            <button className="p-1">
              <Search className="w-6 h-6" />
            </button>
            <button 
                className="p-1"
                onClick={handleWriteClick}
            >
              <PenSquare className="w-6 h-6" />
            </button>
          </div>
        )}
      </header>

      {/* Banner */}
      <div className="px-5 pb-4">
        <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 text-gray-600">
            <Info className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium">{bannerText}</span>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <span className="text-gray-400 text-sm">게시글을 불러오는 중...</span>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center py-8">
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {posts.map((post) => (
            <div 
              key={post.id} 
              className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handlePostClick(post.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  
                  {/* Hide top badge for free, club, career, and major boards */}
                  {(!isFreeBoard && !isSkyBlueHashtagBoard) && (
                    <div className="flex gap-2 mb-1.5 flex-wrap">
                         <span className="bg-blue-200 text-blue-600 text-[10px] px-2 py-0.5 rounded font-medium">
                            {post.badge}
                         </span>
                    </div>
                  )}

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
                  
                  <div className="flex items-center text-xs text-gray-400 gap-2 overflow-x-auto no-scrollbar">
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
                    
                    {/* Bottom hashtags */}
                    <div className="flex gap-1 shrink-0">
                      {(post.topHashtags || post.hashtags || []).map((tag, idx) => (
                        <span 
                          key={idx} 
                          className={`px-2 py-0.5 rounded-sm shrink-0 ${
                            (isSkyBlueHashtagBoard || isFreeBoard)
                              ? 'bg-blue-100 text-gray-600' // Sky blue for free/club/career/major
                              : 'bg-orange-50 text-gray-600' // Default orange/gray for others
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                  </div>
                </div>
                
                {post.hasImage && (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BoardDetailPage;

