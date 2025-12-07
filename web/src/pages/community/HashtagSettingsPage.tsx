import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BoardCategory {
  name: string;
  hashtags: string[];
}

const HashtagSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Data resembling the mockup - updated to 30 items per category
  const categories: BoardCategory[] = [
    {
      name: '자유 게시판',
      hashtags: Array(30).fill('#해시태그'),
    },
    {
      name: '동아리 게시판',
      hashtags: Array(30).fill('#해시태그'),
    },
    {
      name: '취업/진로 게시판',
      hashtags: Array(30).fill('#해시태그'),
    },
    {
      name: '단과대/학과 게시판',
      hashtags: Array(30).fill('#해시태그'),
    },
    {
      name: 'International Board',
      hashtags: Array(30).fill('#해시태그'),
    },
  ];

  // Initialize with empty set (no hashtags selected by default)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  
  // State to track which accordion sections are open. Default: first one open.
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));

  // Toast state for limit warning
  const [showLimitToast, setShowLimitToast] = useState(false);

  // Helper to count selected tags in a specific category
  const getSelectedCount = (categoryIndex: number) => {
    let count = 0;
    categories[categoryIndex].hashtags.forEach((_, tagIndex) => {
      if (selectedTags.has(`${categoryIndex}-${tagIndex}`)) {
        count++;
      }
    });
    return count;
  };

  const toggleTag = (categoryIndex: number, tagIndex: number) => {
    const key = `${categoryIndex}-${tagIndex}`;
    const newSet = new Set(selectedTags);
    
    if (newSet.has(key)) {
      // Removing a tag is always allowed
      newSet.delete(key);
      setSelectedTags(newSet);
    } else {
      // Check limit before adding (Max 5 per category)
      const currentCount = getSelectedCount(categoryIndex);
      if (currentCount >= 5) {
        setShowLimitToast(true);
        // Hide toast after 2 seconds
        setTimeout(() => setShowLimitToast(false), 2000);
        return;
      }

      newSet.add(key);
      setSelectedTags(newSet);
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

        {/* Limit Warning Toast - Centered via Flexbox Overlay in Header */}
        {showLimitToast && (
          <div className="absolute top-0 left-0 w-full h-screen flex items-center justify-center pointer-events-none z-50">
            <div className="bg-gray-800/95 backdrop-blur text-white px-6 py-4 rounded-xl shadow-xl text-center animate-fade-in-up pointer-events-auto max-w-[80%]">
              <p className="text-sm font-bold break-keep leading-snug">
                해시태그는 게시판별<br/>최대 5개까지 선택 가능합니다.
              </p>
            </div>
          </div>
        )}
      </header>

      <div className="px-5 py-6 pb-20">
        {/* Info Banner */}
        <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 text-gray-600 mb-6 animate-fade-in-up">
          <Info className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium">관심있는 해시태그를 선택하면 추천해드려요.</span>
        </div>

        {/* Categories List (Accordion Style) */}
        <div className="space-y-4">
          {categories.map((category, catIndex) => {
            const isOpen = openSections.has(catIndex);
            const selectedCount = getSelectedCount(catIndex);

            return (
              <div 
                key={catIndex} 
                className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white animate-fade-in-up"
                style={{ animationDelay: `${catIndex * 50}ms` }}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleSection(catIndex)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-900">{category.name}</span>
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
                        <div className="pt-4 grid grid-cols-4 gap-2">
                          {category.hashtags.map((tag, tagIndex) => {
                            const isSelected = selectedTags.has(`${catIndex}-${tagIndex}`);
                            return (
                              <button
                                key={tagIndex}
                                onClick={() => toggleTag(catIndex, tagIndex)}
                                className={`
                                  py-2 px-1 rounded-lg text-xs font-medium transition-all duration-200 btn-press
                                  ${isSelected 
                                    ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200 font-bold' 
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                  }
                                `}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
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

