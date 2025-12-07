import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Bell, Settings, ChevronRight, Heart, MessageCircle, Info, Star } from 'lucide-react';
import { KeywordItem, PostItem, FavoriteItem } from '../../types';
import { motion } from 'framer-motion';

const CommunityHomePage: React.FC = () => {
  const navigate = useNavigate();

  // Helper to get board type from name for Recommended posts
  const getBoardType = (name: string) => {
    if (name.includes('자유')) return 'free';
    if (name.includes('취업') || name.includes('진로')) return 'career';
    if (name.includes('동아리')) return 'club';
    if (name.includes('데이터')) return 'major';
    return 'generic';
  };

  // Mock Data - Positions adjusted for layout
  const preferredKeywords: KeywordItem[] = [
    { id: 1, text: '크리스마스', top: '15%', left: '30%' },
    { id: 2, text: '졸업', top: '25%', left: '60%' },
    { id: 3, text: '핫초코', top: '55%', left: '15%' },
    { id: 4, text: '제로콜라', top: '65%', left: '40%' },
    { id: 5, text: '마우스', top: '60%', left: '75%' },
  ];

  const preferredHashtags: KeywordItem[] = [
    { id: 1, text: '#굿잡', top: '20%', left: '15%' },
    { id: 2, text: '#취업', top: '60%', left: '25%' },
    { id: 3, text: '#포리프', top: '40%', left: '45%' },
    { id: 4, text: '#저메추', top: '15%', left: '65%' },
    { id: 5, text: '#ㅊㅊ', top: '55%', left: '80%' },
  ];

  const recommendedPosts: PostItem[] = [
    {
      id: 1,
      boardName: '자유게시판',
      title: '크리스마스 기다리는데',
      highlightedWord: '크리스마스',
      contentPreview: '캐롤 ㅊㅊ',
      date: '11/30',
      time: '11:30',
      likes: 5,
      comments: 2,
    },
    {
      id: 2,
      boardName: '자유게시판',
      title: '오늘 졸업식 가는 사람???',
      highlightedWord: '졸업식',
      contentPreview: '나랑 사진 찍자 ㅏㅏㅏ',
      date: '11/30',
      time: '11:30',
      likes: 10,
      comments: 5,
    },
    {
      id: 3,
      boardName: '취업/진로게시판',
      title: '지금 ㅎㅇㄴㅅ 결과 나옴',
      highlightedWord: '#취업',
      contentPreview: '', 
      date: '11/30',
      time: '11:30',
      likes: 23,
      comments: 23,
      isHot: true,
    },
  ];

  const favoriteBoards: FavoriteItem[] = [
    {
      id: 1, 
      boardName: '자유게시판',
      description: '친애하는 X에게 보는 사람 중에....',
      date: '11/30',
      time: '11:30',
      boardType: 'free'
    },
    {
      id: 2, 
      boardName: '취업/진로게시판',
      description: '나 어제 면접봤는데 나 말고 혹시....',
      date: '11/30',
      time: '11:30',
      boardType: 'career'
    },
    {
      id: 3, 
      boardName: '동아리게시판',
      description: '한양대 최대규모 IT 동아리 포리프....',
      date: '11/30',
      time: '11:30',
      boardType: 'club'
    },
    {
      id: 4, 
      boardName: '데이터사이언스전공게시판',
      description: '오늘부터 간식사업 진행합니다. FTC....',
      date: '11/30',
      time: '11:30',
      boardType: 'major'
    },
  ];

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
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </Link>

          {/* Version without notification badge */}
          <Link to="/community/settings" className="p-1 hover:text-gray-900 transition-colors btn-press">
            <Settings className="w-6 h-6" />
          </Link>
        </div>
      </header>

      <main className="px-5 space-y-8">
        
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
            {preferredKeywords.map((kw, idx) => (
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
            ))}
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
            {preferredHashtags.map((tag, idx) => (
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
            ))}
          </div>
        </section>

        {/* Recommended Posts Section */}
        <section className="animate-fade-in-up delay-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">추천 게시판</h2>
          <div className="space-y-3">
            {recommendedPosts.map((post, idx) => (
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
                    {/* Style logic based on mock data to match spec visualization */}
                    {post.id === 1 ? (
                        <div className="font-bold">
                            <span className="bg-blue-200 px-1 py-0.5 rounded-sm mr-1.5 box-decoration-clone">크리스마스</span>
                            <span>기다리는데</span>
                        </div>
                    ) : post.id === 2 ? (
                        <div className="font-bold">
                            <span>오늘 </span>
                            <span className="bg-blue-200 px-1 py-0.5 rounded-sm mx-1 box-decoration-clone">졸업식</span>
                            <span>가는 사람???</span>
                        </div>
                    ) : (
                        <div className="font-bold">{post.title}</div>
                    )}
                </div>

                <div className="flex justify-between items-center text-sm text-gray-500">
                    <div className="flex items-center gap-2 truncate pr-2">
                        {post.id === 1 && (
                             <div className="flex items-center gap-1.5 truncate">
                                <span className="bg-blue-200 px-1.5 py-0.5 rounded text-gray-900 text-xs font-bold">크리스마스</span>
                                <span className="truncate">{post.contentPreview}</span>
                             </div>
                        )}
                         {post.id === 3 && post.highlightedWord && (
                             <span className="bg-orange-200 px-2 py-0.5 rounded text-gray-800 text-xs font-medium">
                                 {post.highlightedWord}
                             </span>
                        )}
                        {post.contentPreview && post.id !== 1 && <span className="truncate">{post.contentPreview}</span>}
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
            ))}
          </div>
        </section>

        {/* Favorites Section */}
        <section className="animate-fade-in-up delay-300">
          <h2 className="text-xl font-bold text-gray-900 mb-4">즐겨찾기</h2>
          <div className="space-y-3">
            {favoriteBoards.map((fav, idx) => (
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
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default CommunityHomePage;
