import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Plus, Trash2 } from 'lucide-react';

const PollCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Retrieve previous state to preserve post data when canceling/saving
  const previousState = location.state || {};
  const existingPollData = previousState.pollData;

  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (existingPollData) {
      setOptions(existingPollData.options.length > 0 ? existingPollData.options : ['', '']);
      setAllowMultiple(existingPollData.allowMultiple);
    }
  }, [existingPollData]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 1) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleCancelClick = () => {
      // Show confirmation modal
      setShowDeleteModal(true);
  };

  const confirmCancel = () => {
    // Navigate back to Create Post page without saving changes
    navigate(-1);
  };

  const handleDone = () => {
    // Filter out empty options
    const validOptions = options.filter(opt => opt.trim() !== '');
    
    // Requirement: At least 1 option required
    if (validOptions.length < 1) {
        alert("최소 1개 이상의 투표 항목을 입력해주세요.");
        return;
    }
    
    // Navigate back to Create Post page with new poll data and preserved post state
    navigate('/community/create', {
      state: {
        ...previousState,
        pollData: {
          options: validOptions,
          allowMultiple
        }
      },
      replace: true // Replace history to avoid circular navigation issues
    });
  };

  return (
    <div className="bg-white min-h-screen font-sans flex flex-col relative">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={handleCancelClick} className="p-1 -ml-1 text-gray-900">
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">투표 생성</h1>
        <button 
          onClick={handleDone}
          className="text-base font-bold text-blue-500 hover:text-blue-600 transition-colors"
        >
          완료
        </button>
      </header>

      {/* Content */}
      <div className="p-5 flex-1">
        <div className="space-y-3 mb-4">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
                <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`항목 ${index + 1}`}
                className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-base text-gray-900 placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-100 transition-shadow"
                />
                {options.length > 1 && (
                    <button 
                        onClick={() => removeOption(index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
          ))}
        </div>

        {options.length < 5 && (
          <button
            onClick={addOption}
            className="w-full border border-dashed border-gray-300 rounded-xl px-4 py-3 text-gray-500 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            항목 추가
          </button>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
          <span className="text-base text-gray-900 font-medium">복수 선택 허용</span>
          <button
            onClick={() => setAllowMultiple(!allowMultiple)}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              allowMultiple ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                allowMultiple ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white w-[280px] rounded-2xl overflow-hidden shadow-xl">
                  <div className="px-6 py-6 text-center">
                      <p className="text-base font-bold text-gray-900 leading-normal">
                          투표 생성을 정말로<br/>삭제할 것인가요?
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                          작성 중인 내용은 저장되지 않습니다.
                      </p>
                  </div>
                  <div className="flex border-t border-gray-100">
                      <button 
                          onClick={() => setShowDeleteModal(false)}
                          className="flex-1 py-3.5 text-base font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                          취소
                      </button>
                      <div className="w-[1px] bg-gray-100" />
                      <button 
                          onClick={confirmCancel}
                          className="flex-1 py-3.5 text-base font-bold text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                      >
                          확인
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PollCreationPage;

