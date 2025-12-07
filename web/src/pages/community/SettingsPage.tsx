import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header */}
      <header className="flex items-center h-14 px-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button 
          onClick={() => navigate('/community')} 
          className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Go back to Community Home"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900 pr-8">설정</h1>
      </header>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Account Section */}
        <section className="mb-10">
          <h2 className="text-base font-bold text-gray-900 mb-5">계정</h2>
          <div className="flex flex-col space-y-6">
            <button className="text-left text-base text-gray-800 hover:text-gray-600 transition-colors">
              사용자 ID
            </button>
            <button className="text-left text-base text-gray-800 hover:text-gray-600 transition-colors">
              비밀번호 변경
            </button>
          </div>
        </section>

        {/* Community Section */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-5">커뮤니티</h2>
          <div className="flex flex-col space-y-6">
            <button 
              onClick={() => navigate('/community/keywords')}
              className="text-left text-base text-gray-800 hover:text-gray-600 transition-colors"
            >
              선호 키워드 설정
            </button>
            <button 
              onClick={() => navigate('/community/filtering-keywords')}
              className="text-left text-base text-gray-800 hover:text-gray-600 transition-colors"
            >
              필터링 키워드 설정
            </button>
            <button 
              onClick={() => navigate('/community/hashtags')}
              className="text-left text-base text-gray-800 hover:text-gray-600 transition-colors"
            >
              선호 해시태그 설정
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;