import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, X, ChevronDown, Heart, MessageCircle } from 'lucide-react';
import { getAbsoluteUrl } from '../../utils/url';

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL to persist search context
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [sortBy, setSortBy] = useState('최신순');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Determine view mode based on URL query
  const showResults = !!initialQuery;

  // Sync searchTerm with URL changes (e.g. browser navigation)
  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  const popularSearches = [
    '학점포기제',
    '커뮤니티',
    '애국제',
    '푸드트럭',
    '한양대역',
    '기계공학부',
    '간식행사사업',
    '한사봉',
    '하이웹',
    '겨울학기',
  ];

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
                className="w-full h-10 pl-4 pr-20 bg-gray-700 rounded text-sm text-white placeholder-gray-400 outline-none"
                autoFocus={!showResults}
            />
            {searchTerm && (
                <button 
                    onClick={handleClear}
                    className="absolute right-11 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
            <button 
                onClick={handleSearch}
                className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center bg-gray-600 rounded-r hover:bg-gray-500 transition-colors"
            >
                <Search className="w-5 h-5 text-gray-200" />
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

            <div className="divide-y divide-gray-100">
              {popularSearches.map((item, index) => (
                <div 
                  key={index} 
                  onClick={() => handlePopularSearchClick(item)}
                  className="py-3 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
                >
                  <span className={`text-base font-bold w-4 text-center ${index < 3 ? 'text-gray-900' : 'text-gray-400'}`}>{index + 1}</span>
                  <span className="text-sm font-semibold text-gray-800">{item}</span>
                </div>
              ))}
            </div>
            
            <p className="text-[10px] text-gray-400 mt-4 text-right border-t border-gray-100 pt-2">
              2025.10.09. 18:29:42 기준
            </p>
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
                      <span className="inline-block bg-blue-200 text-blue-600 text-[10px] px-2 py-0.5 rounded font-medium mb-1.5">
                        {post.boardName}
                      </span>
                      
                      {/* Title & Content */}
                      <h3 className="text-base font-bold text-gray-900 mb-1">{post.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">{post.content}</p>
                      
                      {/* Metadata */}
                      <div className="flex items-center text-xs text-gray-400 gap-2 flex-wrap">
                        <div className="flex items-center gap-0.5">
                          <Heart className="w-3.5 h-3.5" />
                          <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{post.comments}</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span>{post.time}</span>
                        {(post.hashtags.length > 0) && (
                            <>
                             <span className="text-gray-300">|</span>
                             <div className="flex gap-1">
                              {post.hashtags.map((tag, idx) => (
                                <span 
                                  key={idx} 
                                  className="bg-blue-100 text-gray-600 px-2 py-0.5 rounded-sm"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            </>
                        )}
                      </div>
                    </div>
                    
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;