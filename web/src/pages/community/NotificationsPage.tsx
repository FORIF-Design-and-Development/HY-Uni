import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type TabType = 'general' | 'my' | 'keyword';

interface NotificationItem {
  id: number;
  category?: string; // e.g., "자유게시판", "추석" (for keyword)
  title: string;
  content: string;
  date: string;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Mock Data for "General" Tab
  const generalNotifications: NotificationItem[] = Array(5).fill({
    category: '자유게시판',
    title: '25년 추석 연휴 미쳤네',
    content: '추석 연휴에 중간고사 준비해야 됨\n나만 본가 안가고 학교야ㅠㅠ 너무 우울한...',
    date: '9/29 13:01',
  }).map((item, idx) => ({ ...item, id: idx }));

  // Mock Data for "My" Tab
  const myNotifications: NotificationItem[] = [
    { id: 1, title: '내가 쓴 게시글에 새로운 댓글이 달렸습니다.', content: ': 세법의 이해 교재 구매 희망합니다!', date: '9/29 13:01' },
    { id: 2, title: '내가 쓴 댓글에 새로운 대댓글이 달렸습니다.', content: ': 근데 나는 이해가 안되는 게 왜 다들 부정적인 건지 모르겠음 그냥 좀 자기가 하고 싶은 거 하면서 살면...', date: '9/29 13:01' },
    { id: 3, title: '내가 쓴 게시글이 좋아요를 받았습니다.', content: '', date: '9/29 13:01' },
    { id: 4, title: '내가 쓴 댓글에 새로운 대댓글이 달렸습니다.', content: ': 근데 나는 이해가 안되는 게 왜 다들 부정적인 건지 모르겠음 그냥 좀 자기가 하고 싶은 거 하면서 살면...', date: '9/29 13:01' },
    { id: 5, title: '내가 쓴 게시글에 새로운 댓글이 달렸습니다.', content: ': 세법의 이해 교재 구매 희망합니다!', date: '9/29 13:01' },
    { id: 6, title: '내가 쓴 게시글이 싫어요를 받았습니다.', content: '', date: '9/29 13:01' },
    { id: 7, title: '내가 쓴 게시글이 싫어요를 받았습니다.', content: '', date: '9/29 13:01' },
    { id: 8, title: '내가 쓴 게시글이 스크랩되었습니다.', content: '', date: '9/29 13:01' },
  ];

  // Mock Data for "Keyword" Tab
  const keywordNotifications: NotificationItem[] = [
    { id: 1, category: '추석', title: '25년 추석 연휴 미쳤네', content: '추석 연휴에 중간고사 준비해야 됨\n나만 본가 안가고 학교야ㅠㅠ 너무 우울한...', date: '9/29 13:01' },
    { id: 2, category: '엔시티', title: '이번 엔시티 신곡', content: '나는 너무 좋은데 커뮤니티에서 왤케 까이는 거임???', date: '9/29 13:01' },
    { id: 3, category: '학점포기제', title: '25-2 학점포기제 일정', content: '이번 학기의 학점포기제는 10월 21일부터 24일까지 신청기간입니다. 자세한 일정은 아래의 첨부파일을...', date: '9/29 13:01' },
    { id: 4, category: '학점포기제', title: '이번 학기 학점포기제 언제 일정 나옴???', content: '근데 이거 해도 성적 똑같은 거 아님??\n해서 달라지는 게 머임...', date: '9/29 13:01' },
    { id: 5, category: '엔시티', title: '엔시티 최애 다들 누구야', content: 'ㅈㄱㄴ', date: '9/29 13:01' },
  ];

  const renderContent = () => {
    let data: NotificationItem[] = [];
    if (activeTab === 'general') data = generalNotifications;
    else if (activeTab === 'my') data = myNotifications;
    else if (activeTab === 'keyword') data = keywordNotifications;

    return (
      <div className="divide-y divide-gray-100">
        {data.map((item, idx) => (
          <div 
            key={item.id} 
            className="p-4 bg-white hover:bg-gray-50 transition-colors animate-fade-in-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {item.category && (
              <div className="text-xs text-gray-500 mb-1 font-medium">{item.category}</div>
            )}
            <h3 className="text-base font-bold text-gray-900 mb-1 leading-tight">{item.title}</h3>
            {item.content && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-1.5 whitespace-pre-wrap leading-relaxed">
                {item.content}
              </p>
            )}
            <div className="text-xs text-gray-400">{item.date}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header */}
      <header className="flex items-center h-14 px-4 bg-white sticky top-0 z-10 border-b border-gray-100 animate-fade-in-up">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors btn-press"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900 pr-8">알림</h1>
      </header>

      {/* Tabs */}
      <div className="px-4 py-3 bg-white sticky top-14 z-10 animate-fade-in-up delay-75">
        <div className="flex gap-2">
          {['general', 'my', 'keyword'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 btn-press ${
                activeTab === tab ? 'bg-blue-100 text-gray-900 scale-105' : 'bg-blue-50 text-gray-500'
              }`}
            >
              {tab === 'general' ? '일반' : tab === 'my' ? 'My' : '키워드'}
            </button>
          ))}
        </div>
      </div>

      {/* List Content */}
      <main key={activeTab}> {/* Key forces re-render for animation when tab changes */}
        {renderContent()}
      </main>
    </div>
  );
};

export default NotificationsPage;

