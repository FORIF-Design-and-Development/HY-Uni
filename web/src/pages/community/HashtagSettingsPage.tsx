import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBoards, Board } from '../../api/community/board.api';
import {
  getBoardTags,
  getPreferredTags,
  addPreferredTags,
  deletePreferredTags,
  Tag,
} from '../../api/community/preferred-tag.api';

const HashtagSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State structure changed: Map<boardId, Set<tagId>>
  const [selectedTags, setSelectedTags] = useState<Map<number, Set<number>>>(new Map());
  
  // Game board and tag data
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardTags, setBoardTags] = useState<Map<number, Tag[]>>(new Map());
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [loadingBoards, setLoadingBoards] = useState<Set<number>>(new Set());
  
  // State to track which accordion sections are open. Default: first one open.
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));

  // Toast state for limit warning and errors
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Load boards and tags on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load boards
        const boardsResponse = await getBoards();
        let boardsList = boardsResponse.boards;
        
        // Filter out boards without hashtags (나의 게시판, HOT/BEST 게시판, 추천 게시판)
        const excludedBoardNames = ['나의 게시판', 'HOT/BEST 게시판', '추천 게시판'];
        boardsList = boardsList.filter(
          (board) => !excludedBoardNames.includes(board.name)
        );
        
        // Load tags and preferred tags for each board
        const tagsMap = new Map<number, Tag[]>();
        const selectedTagsMap = new Map<number, Set<number>>();
        const boardsWithTags: Board[] = [];
        
        for (const board of boardsList) {
          setLoadingBoards((prev) => new Set(prev).add(board.id));
          
          try {
            // Load available tags
            const tagsResponse = await getBoardTags(board.id);
            const tags = tagsResponse.availableTags;
            
            // Only include boards that have tags
            if (tags.length > 0) {
              tagsMap.set(board.id, tags);
              boardsWithTags.push(board);
              
              // Load preferred tags
              const preferredTagsResponse = await getPreferredTags(board.id);
              selectedTagsMap.set(
                board.id,
                new Set(preferredTagsResponse.preferredTags.map((tag) => tag.id))
              );
            }
          } catch (err: any) {
            console.error(`Failed to load tags for board ${board.id}:`, err);
            // Skip boards with errors
          } finally {
            setLoadingBoards((prev) => {
              const next = new Set(prev);
              next.delete(board.id);
              return next;
            });
          }
        }
        
        setBoards(boardsWithTags);
        setBoardTags(tagsMap);
        setSelectedTags(selectedTagsMap);
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || '데이터를 불러오는 중 오류가 발생했습니다.';
        triggerToast(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper to count selected tags for a specific board
  const getSelectedCount = (boardId: number) => {
    return selectedTags.get(boardId)?.size || 0;
  };

  const toggleTag = async (boardId: number, tagId: number) => {
    const currentSelected = selectedTags.get(boardId) || new Set<number>();
    const isSelected = currentSelected.has(tagId);
    
    if (isSelected) {
      // Removing a tag
      try {
        const response = await deletePreferredTags(boardId, [tagId]);
        const newSelected = new Set(response.preferredTags.map((tag) => tag.id));
        setSelectedTags((prev) => {
          const next = new Map(prev);
          next.set(boardId, newSelected);
          return next;
        });
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || '태그 삭제 중 오류가 발생했습니다.';
        triggerToast(errorMessage);
      }
    } else {
      // Adding a tag - check limit first
      const currentCount = getSelectedCount(boardId);
      if (currentCount >= 5) {
        triggerToast('해시태그는 게시판별\n최대 5개까지 선택 가능합니다.');
        return;
      }
      
      try {
        const response = await addPreferredTags(boardId, [tagId]);
        const newSelected = new Set(response.preferredTags.map((tag) => tag.id));
        setSelectedTags((prev) => {
          const next = new Map(prev);
          next.set(boardId, newSelected);
          return next;
        });
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || '태그 추가 중 오류가 발생했습니다.';
        triggerToast(errorMessage);
      }
    }
  };

  const toggleSection = (index: number) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(index)) {
      newOpenSections.delete(index);
    } else {
      newOpenSections.add(index);
    }
    setOpenSections(newOpenSections);
  };

  return (
    <div className="bg-white min-h-screen font-sans relative">
      {/* Header */}
      <header className="flex items-center h-14 px-4 border-b border-gray-100 sticky top-0 bg-white z-20">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors btn-press"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900 pr-8">선호 해시태그 설정</h1>
      </header>

      {/* Toast - Fixed to viewport center */}
      {showToast && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-gray-800/95 backdrop-blur text-white px-6 py-4 rounded-xl shadow-xl text-center animate-fade-in-up pointer-events-auto max-w-[80%]">
            <p className="text-sm font-bold break-keep leading-snug whitespace-pre-line">
              {toastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="px-5 py-6 pb-20">
        {/* Info Banner */}
        <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 text-gray-600 mb-6 animate-fade-in-up">
          <Info className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium">관심있는 해시태그를 선택하면 추천해드려요.</span>
        </div>

        {/* Boards List (Accordion Style) */}
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <span className="text-gray-400 text-sm">데이터를 불러오는 중...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {boards.map((board, boardIndex) => {
              const isOpen = openSections.has(boardIndex);
              const selectedCount = getSelectedCount(board.id);
              const tags = boardTags.get(board.id) || [];
              const isLoadingTags = loadingBoards.has(board.id);

              return (
                <div 
                  key={board.id} 
                  className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white animate-fade-in-up"
                  style={{ animationDelay: `${boardIndex * 50}ms` }}
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleSection(boardIndex)}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-900">{board.name}</span>
                      {selectedCount > 0 && (
                        <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {selectedCount}개 선택됨
                        </span>
                      )}
                    </div>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  
                  {/* Accordion Body */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <div className="p-4 pt-0 bg-white border-t border-gray-100">
                          {isLoadingTags ? (
                            <div className="flex justify-center items-center py-4">
                              <span className="text-gray-400 text-xs">태그를 불러오는 중...</span>
                            </div>
                          ) : tags.length === 0 ? (
                            <div className="flex justify-center items-center py-4">
                              <span className="text-gray-400 text-xs">사용 가능한 태그가 없습니다.</span>
                            </div>
                          ) : (
                            <div className="pt-4 grid grid-cols-4 gap-2">
                              {tags.map((tag) => {
                                const isSelected = selectedTags.get(board.id)?.has(tag.id) || false;
                                const tagText = tag.name.startsWith('#') ? tag.name : `#${tag.name}`;
                                return (
                                  <button
                                    key={tag.id}
                                    onClick={() => toggleTag(board.id, tag.id)}
                                    title={tagText}
                                    className={`
                                      py-2 px-1 rounded-lg text-xs font-medium transition-all duration-200 btn-press
                                      truncate overflow-hidden whitespace-nowrap
                                      ${isSelected 
                                        ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200 font-bold' 
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                      }
                                    `}
                                  >
                                    {tagText}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Bottom Save Button (Optional, purely visual for now) */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-gray-100 z-10">
          <button 
            onClick={() => navigate(-1)}
            className="w-full bg-blue-500 text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 active:scale-[0.98] transform transition-transform"
          >
            설정 저장하기
          </button>
      </div>
    </div>
  );
};

export default HashtagSettingsPage;

