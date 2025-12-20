import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, PenSquare, Heart, MessageCircle, Info, BarChart2, Play } from 'lucide-react';
import { getBoardPosts, BoardPostListItem } from '../../api/community/post.api';
import { getBoards } from '../../api/community/board.api';
import { getAbsoluteUrl } from '../../utils/url';
import { toKST, getNowKST } from '../../utils/date';

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
  imageUrl: string | null;
  hasVideo: boolean;
  videoUrl: string | null;
  imageGray?: boolean;
  hasPoll?: boolean;
  matchedTags?: string[]; // 매칭된 태그 이름들 (# 포함)
  matchedKeywords?: string[]; // 매칭된 키워드들
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

// 키워드 하이라이팅 함수
function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
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
}

// 서버 응답을 컴포넌트 형식으로 변환
function mapPostItem(post: BoardPostListItem, isFreeBoard: boolean, boardName: string, isRecommendedBoard: boolean = false): PostItem {
  // 매칭된 태그 이름들을 # 형태로 변환
  const matchedTagNames = post.recommendationReason?.matchedTags || [];
  const matchedTagsWithHash = matchedTagNames.map(tag => `#${tag}`);

  // 배지 결정: 자유 게시판은 해시태그, 추천 게시판은 원문 게시판 이름, 그 외는 현재 게시판 이름
  let badge: string;
  if (isFreeBoard) {
    badge = post.tags[0]?.name ? `#${post.tags[0].name}` : '';
  } else if (isRecommendedBoard) {
    // 추천 게시판일 때는 원문 게시판 이름 사용
    badge = post.board.name;
  } else {
    badge = boardName;
  }

  return {
    id: post.id,
    badge,
    badgeIsHashtag: isFreeBoard,
    title: post.title,
    content: post.contentSnippet || post.content,
    likes: post.counts.likes,
    comments: post.counts.comments,
    time: formatRelativeTime(post.createdAt),
    hashtags: post.tags.map(tag => `#${tag.name}`),
    topHashtags: post.tags.slice(0, 3).map(tag => `#${tag.name}`),
    hasImage: post.previews.imageUrl !== null,
    imageUrl: post.previews.imageUrl,
    hasVideo: post.previews.videoUrl !== null,
    videoUrl: post.previews.videoUrl,
    imageGray: false,
    hasPoll: post.hasPoll, // false 대신 post.hasPoll 사용
    matchedTags: matchedTagsWithHash,
    matchedKeywords: post.recommendationReason?.matchedKeywords || [],
  };
}

const BoardDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { type } = useParams<{ type: string }>();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<number | null>(null);
  const [title, setTitle] = useState('게시판');
  const [bannerText, setBannerText] = useState('게시판 규칙 설명');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 하늘색 해시태그 갖는 게시판(자유, 동아리, 취업, 단과대) 여부 확인
  const isSkyBlueHashtagBoard = ['club', 'career', 'major'].includes(type || '');
  const isFreeBoard = type === 'free';
  const isRecommendedBoard = type === 'recommended';
  
  // 검색, 작성 아이콘 표시 게시판(자유, 동아리, 취업, 단과대) 여부 확인
  const isWriteableBoard = ['free', 'club', 'career', 'major'].includes(type || '');

  // 게시판 ID 조회
  useEffect(() => {
    const loadBoardId = async () => {
      try {
        const boardsResponse = await getBoards();
        const boards = boardsResponse.boards;
        
        // 게시판 이름으로 게시판 타입 조회
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

        // 게시판 타입으로 게시판 조회
        const matchedBoard = boards.find(board => getRouteType(board.name) === type);
        
        if (matchedBoard) {
          setBoardId(matchedBoard.id);
          setTitle(matchedBoard.name);
          setBannerText(`${matchedBoard.name} 규칙 설명`);
        } else {
          // 게시판 조회 실패 시 에러 설정
          setError('게시판을 찾을 수 없습니다.');
        }
      } catch (err: any) {
        console.error('게시판 목록 조회 실패:', err);
        setError('게시판 정보를 불러오는데 실패했습니다.');
      }
    };

    loadBoardId();
  }, [type]);

  // 무한 스크롤 옵저버
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && boardId) {
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
  }, [hasMore, loading, loadingMore, boardId, isFreeBoard]);

  // 게시판 ID 있을 때 게시글 목록 조회
  useEffect(() => {
    if (!boardId) return;

    const loadPosts = async () => {
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

        const mappedPosts = response.posts.map(post => mapPostItem(post, isFreeBoard, response.boardInfo.name, isRecommendedBoard));
        setPosts(mappedPosts);
        
        // 게시판 이름과 설명 설정
        setTitle(response.boardInfo.name);
        if (response.boardInfo.description) {
          setBannerText(response.boardInfo.description);
        } else {
          setBannerText(`${response.boardInfo.name} 규칙 설명`);
        }

        // 페이지네이션 정보 확인
        setHasMore(response.pagination.currentPage < response.pagination.totalPages);
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

  // 추가 게시글 로드
  const loadMorePosts = async () => {
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

      const mappedPosts = response.posts.map(post => mapPostItem(post, isFreeBoard, response.boardInfo.name, isRecommendedBoard));
      setPosts(prev => [...prev, ...mappedPosts]);
      setCurrentPage(nextPage);
      setHasMore(response.pagination.currentPage < response.pagination.totalPages);
    } catch (err: any) {
      console.error('추가 게시글 조회 실패:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // 새로운 게시글 생성 시 처리
  useEffect(() => {
    if (location.state?.newPost) {
      // 새로운 게시글을 PostItem 형식으로 변환
      const newPostItem = location.state.newPost as PostItem;
      setPosts(prev => [newPostItem, ...prev]);
      // 네비게이션 시 중복 추가 방지를 위해 상태 초기화
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handlePostClick = (postId: number) => {
    navigate(`/community/post/${postId}`, { state: { boardName: title, boardType: type } });
  };

  const handleWriteClick = () => {
    // 게시판 타입과 이름을 CreatePostPage로 전달
    navigate('/community/create', { state: { boardType: type, boardName: title, boardId } });
  };

  const handleSearchClick = () => {
    // 검색 페이지로 이동
    navigate('/community/search');
  };

  const showRightIcons = isWriteableBoard;

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* 상단헤더 */}
      <header className="flex items-center h-14 px-4 bg-white sticky top-0 z-10">
        <button
          onClick={() => navigate('/community/board-list')}
          className="p-2 -ml-2 text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900">{title}</h1>
        <div className="w-8" /> {/* 아이콘 없을 때 중앙 정렬을 위한 여백 */}
        
        {showRightIcons && (
          <div className="absolute right-4 flex items-center gap-3 text-gray-900">
            <button 
              className="p-1"
              onClick={handleSearchClick}
            >
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

      {/* 배너 */}
      <div className="px-5 pb-4">
        <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 text-gray-600">
            <Info className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium">{bannerText}</span>
        </div>
      </div>

      {/* 게시글 목록 */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <span className="text-gray-400 text-sm">게시글을 불러오는 중...</span>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center py-8">
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 border-t border-gray-100">
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handlePostClick(post.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    
                    {/* 자유, 동아리, 취업, 단과대 게시판 제목 위 배지 숨기기 */}
                    {(!isFreeBoard && !isSkyBlueHashtagBoard) && (
                      <div className="flex gap-2 mb-1.5 flex-wrap">
                           <span className="bg-blue-200 text-blue-600 text-[10px] px-2 py-0.5 rounded font-medium">
                              {post.badge}
                           </span>
                      </div>
                    )}

                    <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                        {isRecommendedBoard && post.matchedKeywords && post.matchedKeywords.length > 0
                          ? highlightKeywords(post.title, post.matchedKeywords)
                          : post.title}
                        {post.hasPoll && (
                            <div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-500 font-medium">
                                <BarChart2 className="w-3 h-3" />
                                투표
                            </div>
                        )}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {isRecommendedBoard && post.matchedKeywords && post.matchedKeywords.length > 0
                        ? highlightKeywords(post.content, post.matchedKeywords)
                        : post.content}
                    </p>
                    
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
                      
                      {/* 하단 해시태그 */}
                      <div className="flex gap-1 shrink-0">
                        {/* 추천 게시판일 경우: 매칭된 태그만 표시 */}
                        {isRecommendedBoard ? (
                          post.matchedTags && post.matchedTags.length > 0 ? (
                            post.matchedTags.map((tag, idx) => (
                              <span 
                                key={idx} 
                                className="px-2 py-0.5 rounded-sm shrink-0 bg-orange-50 text-gray-600"
                              >
                                {tag}
                              </span>
                            ))
                          ) : null
                        ) : (
                          // 일반 게시판: 모든 태그 표시
                          (post.hashtags || []).map((tag, idx) => (
                            <span 
                              key={idx} 
                              className={`px-2 py-0.5 rounded-sm shrink-0 ${
                                (isSkyBlueHashtagBoard || isFreeBoard)
                                  ? 'bg-blue-100 text-gray-600' // 하늘색 해시태그 갖는 게시판(자유, 동아리, 취업, 단과대)
                                  : 'bg-orange-50 text-gray-600' // 기본 주황색/회색(동아리, 취업, 단과대)
                              }`}
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>

                    </div>
                  </div>
                  
                  {/* 이미지/동영상 미리보기 */}
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
        </>
      )}
    </div>
  );
};

export default BoardDetailPage;

