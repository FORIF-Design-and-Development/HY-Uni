import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Bell, Home } from 'lucide-react';
import { getBoards, toggleBoardFavorite, toggleBoardSubscription, Board } from '../../api/community/board.api';

const BoardListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load boards on component mount
  useEffect(() => {
    const loadBoards = async () => {
      try {
        setIsLoading(true);
        const response = await getBoards();
        setBoards(response.boards);
      } catch (err: any) {
        console.error('게시판 목록 조회 실패:', err);
        // 에러 발생 시 빈 배열로 설정
        setBoards([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadBoards();
  }, []);

  // Helper function to get route type from board name
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

  const toggleFavorite = async (boardId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await toggleBoardFavorite(boardId);
      setBoards(boards.map(board =>
        board.id === boardId ? { ...board, isFavorite: response.isFavorite } : board
      ));
    } catch (err: any) {
      console.error('즐겨찾기 토글 실패:', err);
      // 에러 발생 시 상태는 변경하지 않음
    }
  };

  const toggleNotification = async (boardId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await toggleBoardSubscription(boardId);
      setBoards(boards.map(board =>
        board.id === boardId ? { ...board, isSubscribed: response.isSubscribed } : board
      ));
    } catch (err: any) {
      console.error('알림 설정 토글 실패:', err);
      // 에러 발생 시 상태는 변경하지 않음
    }
  };

  const handleBoardClick = (board: Board) => {
    const routeType = getRouteType(board.name);
    if (routeType === 'my') {
      navigate('/community/board/my');
    } else {
      navigate(`/community/board/${routeType}`);
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
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <span className="text-gray-400 text-sm">게시판 목록을 불러오는 중...</span>
          </div>
        ) : (
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
                  aria-label={board.isSubscribed ? "알림 끄기" : "알림 켜기"}
                >
                  <Bell 
                    className={`w-6 h-6 transition-all duration-300 ${
                      board.isSubscribed 
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
        )}
      </div>
    </div>
  );
};

export default BoardListPage;

