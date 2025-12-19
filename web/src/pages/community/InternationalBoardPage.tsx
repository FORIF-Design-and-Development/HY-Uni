import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PenSquare, Heart, MessageCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InternationalBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Free');

  const tabs = ['Free', 'Life', 'Info/Promo'];

  // Mock Data
  const posts = [
    { id: 1, hashtag: '#hashtag', title: 'Title', content: 'Contents', likes: 23, comments: 23, time: '11:30', hasImage: true },
    { id: 2, hashtags: ['#hashtag', '#hashtag'], title: 'Title', content: 'Contents', likes: 23, comments: 23, time: '11:30', hasImage: true },
    { id: 3, hashtag: '#hashtag', title: 'Title', content: 'Contents', likes: 23, comments: 23, time: '11:30', hasImage: false },
    { id: 4, hashtags: ['#hashtag', '#hashtag'], title: 'Title', content: 'Contents', likes: 23, comments: 23, time: '11:30', hasImage: false },
    { id: 5, title: 'Title', content: 'Contents', likes: 23, comments: 23, time: '11:30', hasImage: true },
  ];

  const handlePostClick = (postId: number) => {
    navigate(`/community/post/${postId}`, { state: { boardName: 'International Board', boardType: 'international' } });
  };

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header */}
      <header className="flex items-center h-14 px-4 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate('/community/board-list')} className="p-2 -ml-2 text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        {/* Tabs in Header */}
        <div className="flex ml-2 gap-4">
            {tabs.map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-lg transition-colors relative ${activeTab === tab ? 'font-bold text-gray-900' : 'font-medium text-gray-300'}`}
                >
                    {tab}
                    {activeTab === tab && (
                        <motion.div 
                            layoutId="underline-intl"
                            className="absolute -bottom-[16px] left-0 right-0 h-[2px] bg-gray-900" 
                        />
                    )}
                </button>
            ))}
        </div>

        <div className="flex-1" />
        
        <button 
            className="p-1 text-gray-900"
            onClick={() => navigate('/community/create')}
        >
            <PenSquare className="w-6 h-6" />
        </button>
      </header>

      {/* Banner */}
      <div className="px-5 py-4">
         <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 text-gray-600">
            <Info className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium">Board rule detail</span>
         </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100 border-t border-gray-100">
         <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
            >
                 {posts.map(post => (
                     <div 
                        key={post.id} 
                        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handlePostClick(post.id)}
                     >
                         <div className="flex justify-between items-start">
                             <div className="flex-1 pr-4">
                                 <h3 className="text-base font-bold text-gray-900 mb-1">{post.title}</h3>
                                 <p className="text-sm text-gray-500 mb-2">{post.content}</p>
                                 
                                 <div className="flex items-center text-xs text-gray-400 gap-2 flex-wrap">
                                     <div className="flex items-center gap-0.5"><Heart className="w-3.5 h-3.5" /><span>{post.likes}</span></div>
                                     <div className="flex items-center gap-0.5"><MessageCircle className="w-3.5 h-3.5" /><span>{post.comments}</span></div>
                                     <span className="text-gray-300">|</span>
                                     <span>{post.time}</span>
                                     <span className="text-gray-300">|</span>
                                     {/* Added hashtags here */}
                                     <div className="flex gap-1">
                                        {post.hashtag && <span className="bg-blue-100 text-gray-600 px-2 py-0.5 rounded-sm">{post.hashtag}</span>}
                                        {post.hashtags && post.hashtags.map((t, i) => (
                                            <span key={i} className="bg-blue-100 text-gray-600 px-2 py-0.5 rounded-sm">{t}</span>
                                        ))}
                                     </div>
                                 </div>
                             </div>
                             {post.hasImage && <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />}
                         </div>
                     </div>
                 ))}
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
};

export default InternationalBoardPage;

