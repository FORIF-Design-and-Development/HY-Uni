import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Bell, Home } from 'lucide-react';

interface BoardItem {
  id: number;
  name: string;
  isFavorite: boolean;
  isNotificationOn: boolean;
  routeType?: string; // To determine where to navigate
}

const BoardListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Initial data based on the images
  const [boards, setBoards] = useState<BoardItem[]>([
    { id: 1, name: '나의 게시판', isFavorite: false, isNotificationOn: true, routeType: 'my' },
    { id: 2, name: '추천 게시판', isFavorite: false, isNotificationOn: true, routeType: 'recommended' },
    { id: 3, name: 'HOT/BEST 게시판', isFavorite: false, isNotificationOn: true, routeType: 'hot' },
    { id: 4, name: '자유 게시판', isFavorite: false, isNotificationOn: true, routeType: 'free' },
    { id: 5, name: '동아리 게시판', isFavorite: false, isNotificationOn: true, routeType: 'club' },
    { id: 6, name: '취업/진로 게시판', isFavorite: false, isNotificationOn: true, routeType: 'career' },
    { id: 7, name: '단과대/학과 게시판', isFavorite: false, isNotificationOn: true, routeType: 'major' },
    { id: 8, name: 'International Board', isFavorite: false, isNotificationOn: true, routeType: 'international' },
  ]);

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setBoards(boards.map(board => 
      board.id === id ? { ...board, isFavorite: !board.isFavorite } : board
    ));
  };

  const toggleNotification = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setBoards(boards.map(board => 
      board.id === id ? { ...board, isNotificationOn: !board.isNotificationOn } : board
    ));
  };

  const handleBoardClick = (board: BoardItem) => {
    if (board.routeType === 'my') {
      navigate('/community/board/my');
    } else {
      navigate(`/community/board/${board.routeType || 'generic'}`);
    }
  };

  return (
    <div className="bg-white min-h-screen font-sans">
      <div className="px-5 py-6">
        {/* Header with Title and Home Button */}
        <div className="flex justify-between items-center mb-6 animate-fade-in-up">
            <h1 className="text-xl font-bold text-gray-900">커뮤니티</h1>
            <button 
                onClick={() => navigate('/community')}
                className="p-1 -mr-1 text-gray-900 rounded-full hover:bg-gray-100 transition-colors btn-press"
                aria-label="Go to Community Home"
            >
                <Home className="w-6 h-6" />
            </button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-2 animate-fade-in-up delay-75">
          <div className="flex-1 relative" onClick={() => navigate('/community/search')}>
            <input
              type="text"
              value={searchTerm}
              readOnly // Prevent typing here, force navigation to search page
              placeholder="검색어를 입력해주세요."
              className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm outline-none focus:border-gray-400 placeholder-gray-400 cursor-pointer bg-white transition-colors"
            />
          </div>
          <button 
            onClick={() => navigate('/community/search')}
            className="w-10 h-10 bg-gray-500 rounded-md flex items-center justify-center shrink-0 cursor-pointer hover:bg-gray-600 transition-colors btn-press"
          >
            <Search className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-8 animate-fade-in-up delay-100">검색창에서 인기 검색어를 확인하세요</p>

        {/* Board List */}
        <div className="space-y-6">
          {boards.map((board, idx) => (
            <div 
              key={board.id} 
              className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors animate-fade-in-up"
              style={{ animationDelay: `${150 + (idx * 50)}ms` }}
              onClick={() => handleBoardClick(board)}
            >
              <button 
                onClick={(e) => toggleFavorite(board.id, e)}
                className="focus:outline-none btn-press p-1"
                aria-label={board.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              >
                <Star 
                  className={`w-6 h-6 transition-all duration-300 ${
                    board.isFavorite 
                      ? 'text-yellow-400 fill-yellow-400 scale-110 drop-shadow-sm' 
                      : 'text-gray-300 hover:text-gray-400'
                  }`} 
                  strokeWidth={1.5}
                />
              </button>
              
              <button 
                onClick={(e) => toggleNotification(board.id, e)}
                className="focus:outline-none btn-press p-1"
                aria-label={board.isNotificationOn ? "알림 끄기" : "알림 켜기"}
              >
                <Bell 
                  className={`w-6 h-6 transition-all duration-300 ${
                    board.isNotificationOn 
                      ? 'text-blue-500 fill-blue-500 scale-110 drop-shadow-sm' 
                      : 'text-gray-300 hover:text-gray-400'
                  }`} 
                  strokeWidth={1.5} 
                />
              </button>

              <span className="text-base text-gray-900 font-medium">{board.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BoardListPage;

