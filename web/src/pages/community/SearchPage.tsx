import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, X, ChevronDown, Heart, MessageCircle } from 'lucide-react';
<<<<<<< HEAD
import { getPopularSearches, searchPosts, PopularSearchRankingItem, SearchResult } from '../../api/community/search.api';

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

// 날짜 포맷팅 함수 (YYYY.MM.DD. HH:MM:SS)
function formatDateTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}.${month}.${day}. ${hours}:${minutes}:${seconds}`;
}
=======
import { getAbsoluteUrl } from '../../utils/url';
>>>>>>> dfcf9f6d91d745b0a54b43967b7fb88228cd93fb

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL to persist search context - make it reactive
  const initialQuery = useMemo(() => searchParams.get('q') || '', [searchParams]);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [sortBy, setSortBy] = useState('관련도순');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // API 데이터 상태
  const [popularSearches, setPopularSearches] = useState<PopularSearchRankingItem[]>([]);
  const [baseTime, setBaseTime] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine view mode based on URL query - make it reactive
  const showResults = useMemo(() => !!initialQuery, [initialQuery]);

  // Sync searchTerm with URL changes (e.g. browser navigation)
  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  // 인기 검색어 조회
  useEffect(() => {
    if (!showResults) {
      const loadPopularSearches = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await getPopularSearches(10);
          setPopularSearches(response.rankings);
          setBaseTime(response.baseTime);
        } catch (err: any) {
          console.error('인기 검색어 조회 실패:', err);
          setError('인기 검색어를 불러오는데 실패했습니다.');
          setPopularSearches([]);
        } finally {
          setLoading(false);
        }
      };

<<<<<<< HEAD
      loadPopularSearches();
    }
  }, [showResults]);

  // 검색 결과 조회
  useEffect(() => {
    if (showResults && initialQuery) {
      const loadSearchResults = async () => {
        try {
          setLoading(true);
          setError(null);
          setSearchResults([]);
          
          // 정렬 기준 매핑 (프론트엔드 표시용 -> API 파라미터)
          const sortByParam = sortBy === '최신순' ? 'relevance' : 
                             sortBy === '추천순' ? 'relevance' : 
                             'relevance'; // 관련도순이 기본값
          
          console.log('검색 실행:', { query: initialQuery.trim(), sortBy: sortByParam });
          
          const response = await searchPosts(initialQuery.trim(), 1, 20, sortByParam);
          
          console.log('검색 결과:', response);
          setSearchResults(response.results);
        } catch (err: any) {
          console.error('검색 결과 조회 실패:', err);
          setError(err.response?.data?.error?.message || '검색 중 오류가 발생했습니다.');
          setSearchResults([]);
        } finally {
          setLoading(false);
        }
      };

      loadSearchResults();
    } else {
      // 검색어가 없으면 결과 초기화
      setSearchResults([]);
      setError(null);
      setLoading(false);
    }
  }, [showResults, initialQuery, sortBy]);
=======
  // Mock data for search results matching the image
  const searchResults = [
    {
      id: 1,
      boardName: '자유게시판',
      title: '제목',
      content: '내용',
      likes: 23,
      comments: 23,
      time: '11:30',
      hashtags: ['#해시태그', '#해시태그'],
      hasImage: true,
      imageUrl: null, // 실제 API 연동 시 post.previews.imageUrl 사용
    },
    {
      id: 2,
      boardName: '자유게시판',
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: '10:05',
      hashtags: [],
      hasImage: false,
      imageUrl: null,
    },
    {
      id: 3,
      boardName: '자유게시판',
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: '06:48',
      hashtags: ['#해시태그'],
      hasImage: false,
      imageUrl: null,
    },
    {
      id: 4,
      boardName: '자유게시판',
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: '3년 전',
      hashtags: ['#해시태그', '#해시태그'],
      hasImage: false,
      imageUrl: null,
    },
    {
      id: 5,
      boardName: '자유게시판',
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: '3년 전',
      hashtags: ['#해시태그', '#해시태그'],
      hasImage: false,
      imageUrl: null,
    },
  ];
>>>>>>> dfcf9f6d91d745b0a54b43967b7fb88228cd93fb

  const handleSearch = () => {
    if (searchTerm.trim()) {
      // Use replace: true to keep history clean so back button logic is simpler
      setSearchParams({ q: searchTerm.trim() }, { replace: true });
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setSearchParams({}, { replace: true });
  };

  // Logic to handle back navigation:
  // If showing results, go back to Popular Searches (clear search).
  // If at Popular Searches, go back to Board List page (explicitly connecting the pages).
  const handleBack = () => {
    if (showResults) {
      handleClear();
    } else {
      navigate('/community/board-list');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePopularSearchClick = (term: string) => {
    setSearchTerm(term);
    setSearchParams({ q: term }, { replace: true });
  };

  const handlePostClick = (postId: number) => {
    // Navigate to post detail. PostDetail page's back button uses navigate(-1) which will return here.
    navigate(`/community/post/${postId}`, { state: { boardName: '검색 결과' } });
  };

  const sortOptions = ['최신순', '추천순', '관련도순'];

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center h-14 px-4 bg-white shrink-0 gap-3">
        <button
          onClick={handleBack}
          className="p-1 -ml-1 text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 relative">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="검색어를 입력해주세요."
                className="w-full h-10 pl-4 pr-20 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                autoFocus={!showResults}
            />
            {searchTerm && (
                <button 
                    onClick={handleClear}
                    className="absolute right-11 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
            <button 
                onClick={handleSearch}
                className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center bg-blue-500 rounded-r hover:bg-blue-600 transition-colors"
            >
                <Search className="w-5 h-5 text-white" />
            </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!showResults ? (
          /* Popular Searches View */
          <div className="px-5 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-bold text-gray-900">인기검색어</span>
              <span className="bg-blue-200 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-medium">1-10위</span>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <span className="text-gray-400 text-sm">인기 검색어를 불러오는 중...</span>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-8">
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {popularSearches.map((item, index) => (
                    <div 
                      key={item.rank || index} 
                      onClick={() => handlePopularSearchClick(item.query)}
                      className="py-3 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <span className="text-base font-bold w-10 text-center text-blue-500 shrink-0">
                        {item.rank || index + 1}위
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{item.query}</span>
                    </div>
                  ))}
                </div>
                
                {baseTime && (
                  <p className="text-[10px] text-gray-400 mt-4 text-right border-t border-gray-100 pt-2">
                    {formatDateTime(baseTime)} 기준
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          /* Search Results View */
          <div>
            {/* Filter Dropdown */}
            <div className="px-5 py-2 border-b border-gray-100 flex justify-end sticky top-0 bg-white z-10">
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-600 font-medium bg-white hover:bg-gray-50"
                >
                  {sortBy}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-24 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                      {sortOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSortBy(option);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${sortBy === option ? 'text-gray-900 font-bold bg-gray-50' : 'text-gray-600'}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Results List */}
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <span className="text-gray-400 text-sm">검색 중...</span>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-8">
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-8">
                <span className="text-gray-400 text-sm mb-2">검색 결과가 없습니다.</span>
                <span className="text-gray-300 text-xs">검색어: "{initialQuery}"</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {searchResults.map((post) => (
                  <div 
                    key={post.id} 
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handlePostClick(post.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        {/* Badge */}
                        {post.board && (
                          <span className="inline-block bg-blue-200 text-blue-600 text-[10px] px-2 py-0.5 rounded font-medium mb-1.5">
                            {post.board.name}
                          </span>
                        )}
                        
                        {/* Title & Content */}
                        <h3 className="text-base font-bold text-gray-900 mb-1">{post.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">{post.contentSnippet}</p>
                        
                        {/* Metadata */}
                        <div className="flex items-center text-xs text-gray-400 gap-2 flex-wrap">
                          <div className="flex items-center gap-0.5">
                            <Heart className="w-3.5 h-3.5" />
                            <span>{post.counts.likes}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{post.counts.comments}</span>
                          </div>
                          <span className="text-gray-300">|</span>
                          <span>{formatRelativeTime(post.createdAt)}</span>
                          {post.tags.length > 0 && (
                            <>
                              <span className="text-gray-300">|</span>
                              <div className="flex gap-1">
                                {post.tags.map((tag) => (
                                  <span 
                                    key={tag.id} 
                                    className="bg-blue-100 text-gray-600 px-2 py-0.5 rounded-sm"
                                  >
                                    #{tag.name}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Image Thumbnail */}
                      {post.previews.imageUrl && (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
                      )}
                    </div>
<<<<<<< HEAD
=======
                    
                    {/* Image Thumbnail */}
                    {post.hasImage && post.imageUrl && (
                      <img 
                        src={getAbsoluteUrl(post.imageUrl)} 
                        alt={post.title}
                        className="w-16 h-16 object-cover rounded-lg shrink-0"
                        onError={(e) => {
                          console.error('이미지 로드 실패:', post.imageUrl);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {post.hasImage && !post.imageUrl && (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
                    )}
>>>>>>> dfcf9f6d91d745b0a54b43967b7fb88228cd93fb
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;