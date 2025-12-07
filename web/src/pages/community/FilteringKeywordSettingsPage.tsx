import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, X } from 'lucide-react';

const FilteringKeywordSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  // Initial state for filtering keywords
  const [keywords, setKeywords] = useState<string[]>(['크리스마스', '크리스마스', '크리스마스', '크리스마스']);
  const [inputValue, setInputValue] = useState('');
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleAddKeyword = () => {
    if (!inputValue.trim()) return;

    if (keywords.length >= 5) {
      triggerToast('필터링 키워드는 최대 5개까지 설정 가능합니다.');
      return;
    }

    setKeywords([inputValue.trim(), ...keywords]);
    setInputValue('');
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    if (keywords.length <= 1) {
      triggerToast('필터링 키워드는 최소 1개 이상 설정해야 합니다.');
      return;
    }
    setKeywords(keywords.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddKeyword();
    }
  };

  return (
    <div className="bg-white min-h-screen font-sans relative">
      {/* Header */}
      <header className="flex items-center h-14 px-4 border-b border-gray-100 sticky top-0 bg-white z-20">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900 pr-8">필터링 키워드 설정</h1>

        {/* Toast Container: Absolute overlay relative to sticky header to ensure viewport centering */}
        {showToast && (
          <div className="absolute top-0 left-0 w-full h-screen flex items-center justify-center pointer-events-none z-50">
            <div className="bg-gray-800/95 backdrop-blur text-white px-6 py-4 rounded-xl shadow-xl text-center animate-fade-in-up pointer-events-auto max-w-[80%]">
              <p className="text-sm font-bold break-keep leading-snug">
                {toastMessage}
              </p>
            </div>
          </div>
        )}
      </header>

      <div className="px-5 py-6">
        {/* Info Banner */}
        <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 text-gray-600 mb-10">
          <Info className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium">필터링 키워드 설명</span>
        </div>

        {/* Input Area (New Style) */}
        <div className="flex items-center gap-2 mb-8 border-b border-gray-200 pb-2">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="키워드를 입력해주세요."
                className="flex-1 text-base outline-none text-gray-900 placeholder-gray-400 py-2"
            />
            <button
                onClick={handleAddKeyword}
                className="px-5 py-1.5 rounded-3xl text-sm border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            >
                추가
            </button>
        </div>

        {/* Keyword List */}
        <div className="flex flex-col gap-3">
          {keywords.map((keyword, index) => (
            <div key={index} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <span className="text-base font-bold text-gray-800">{keyword}</span>
              <button
                onClick={() => handleRemoveKeyword(index)}
                className="text-gray-400 hover:text-gray-600 border border-gray-300 rounded md:rounded-sm p-0.5"
                aria-label="Remove keyword"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilteringKeywordSettingsPage;

