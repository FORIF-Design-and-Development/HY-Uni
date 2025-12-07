import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, PenSquare, Heart, MessageCircle, Info, BarChart2 } from 'lucide-react';

const BoardDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { type } = useParams<{ type: string }>();

  let title = '게시판';
  let bannerText = '게시판 규칙 설명';
  let showRightIcons = false;

  // Determine if this board requires sky blue hashtags
  const isSkyBlueHashtagBoard = ['club', 'career', 'major'].includes(type || '');
  const isFreeBoard = type === 'free';
  
  // Boards that should show the right icons (Search, Write)
  const isWriteableBoard = ['free', 'club', 'career', 'major'].includes(type || '');

  switch (type) {
    case 'recommended':
      title = '추천 게시판';
      bannerText = '추천 게시판 규칙 설명';
      break;
    case 'hot':
      title = 'HOT/BEST 게시판';
      bannerText = 'HOT/BEST 게시판 규칙 설명';
      break;
    case 'free':
      title = '자유 게시판';
      bannerText = '자유 게시판 규칙 설명';
      break;
    case 'club':
      title = '동아리 게시판';
      bannerText = '동아리 게시판 규칙 설명';
      break;
    case 'career':
      title = '취업/진로 게시판';
      bannerText = '취업/진로 게시판 규칙 설명';
      break;
    case 'major':
      title = '단과대/학과 게시판';
      bannerText = '단과대/학과 게시판 규칙 설명';
      break;
    default:
      title = `${type} 게시판`;
  }

  if (isWriteableBoard) {
      showRightIcons = true;
  }

  // Initial Mock data tailored to the images
  const initialPosts = [
    {
      id: 1,
      badge: isFreeBoard ? '#해시태그' : title,
      badgeIsHashtag: isFreeBoard,
      title: '제목',
      content: '내용',
      likes: 23,
      comments: 23,
      time: '11:30',
      hashtags: ['#해시태그', '#해시태그'], // For generic posts
      topHashtags: ['#해시태그', '#해시태그', '#해시태그'], // For Free Board top specific
      hasImage: true,
      hasPoll: true, // Added poll to the first post
    },
    {
      id: 2,
      badge: isFreeBoard ? '#해시태그' : title,
      badgeIsHashtag: isFreeBoard,
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: isFreeBoard ? '11:30' : '10:05',
      hasImage: true,
      imageGray: true, // Placeholder for gray box
    },
    {
      id: 3,
      badge: isFreeBoard ? '#해시태그' : title,
      badgeIsHashtag: isFreeBoard,
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: isFreeBoard ? '11:30' : '06:48',
      topHashtags: isFreeBoard ? undefined : ['#해시태그'],
      hasImage: false,
    },
    {
      id: 4,
      badge: isFreeBoard ? '#해시태그' : title,
      badgeIsHashtag: isFreeBoard,
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: isFreeBoard ? '11:30' : '3년 전',
      topHashtags: isFreeBoard ? undefined : ['#해시태그', '#해시태그'],
      hasImage: false,
    },
    {
      id: 5,
      badge: isFreeBoard ? '' : title,
      badgeIsHashtag: false,
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: isFreeBoard ? '11:30' : '3년 전',
      topHashtags: isFreeBoard ? undefined : ['#해시태그', '#해시태그'],
      hasImage: isFreeBoard,
    },
  ];

  const [posts, setPosts] = useState(initialPosts);

  // Effect to handle new post creation
  useEffect(() => {
    if (location.state?.newPost) {
      setPosts(prev => [location.state.newPost, ...prev]);
      // Clear the state to prevent duplicate additions on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handlePostClick = (postId: number) => {
    navigate(`/community/post/${postId}`, { state: { boardName: title, boardType: type } });
  };

  const handleWriteClick = () => {
      // Pass boardType and boardName to CreatePostPage
      navigate('/community/create', { state: { boardType: type, boardName: title } });
  };

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
                    {(post.topHashtags || ['#해시태그', '#해시태그']).map((tag, idx) => (
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
    </div>
  );
};

export default BoardDetailPage;

