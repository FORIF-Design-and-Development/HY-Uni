import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MyBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('게시글');

  const tabs = ['게시글', '댓글', '스크랩', '좋아요'];

  // Mock data tailored to the image
  const posts = [
    {
      id: 1,
      badge: '자유게시판',
      title: '제목',
      content: '내용',
      likes: 23,
      comments: 23,
      time: '1년 전',
      hashtags: ['#해시태그', '#해시태그'],
      hasImage: true,
    },
    {
      id: 2,
      badge: '자유게시판',
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: '1년 전',
      hashtags: ['#해시태그', '#해시태그'],
      hasImage: false,
    },
    {
      id: 3,
      badge: '자유게시판',
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: '2년 전',
      hashtags: ['#해시태그', '#해시태그'],
      hasImage: false,
    },
    {
      id: 4,
      badge: '자유게시판',
      title: '제목',
      content: '내용',
      likes: 8,
      comments: 5,
      time: '3년 전',
      hashtags: ['#해시태그', '#해시태그'],
      hasImage: false,
    },
  ];

  const handlePostClick = (post: typeof posts[0]) => {
    // Navigate with isMyPost flag to enable edit/delete features
    navigate(`/community/post/${post.id}`, { 
      state: { 
        boardName: post.badge,
        isMyPost: true,
        boardType: 'my'
      } 
    });
  };

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header with Tabs */}
      <header className="px-4 pt-3 pb-0 sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/community/board-list')}
            className="p-1 -ml-1 text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center ml-4 gap-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-lg transition-colors relative ${
                  activeTab === tab ? 'font-bold text-gray-900' : 'font-medium text-gray-300'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="underline"
                    className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-gray-900" 
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content List */}
      <div className="divide-y divide-gray-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* 
              In a real app, you would filter `posts` based on `activeTab` here.
              For now, we render the same mock list to demonstrate the transition animation.
            */}
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handlePostClick(post)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <span className="inline-block bg-blue-200 text-blue-600 text-[10px] px-2 py-0.5 rounded font-medium mb-1.5">
                      {post.badge}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{post.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{post.content}</p>
                    
                    <div className="flex items-center text-xs text-gray-400 gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        <Heart className="w-3.5 h-3.5" />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{post.comments}</span>
                      </div>
                      <span className="text-gray-300">|</span>
                      <span>{post.time}</span>
                      <span className="text-gray-300">|</span>
                      <div className="flex gap-2">
                          {post.hashtags.map((tag, idx) => (
                              <span key={idx} className="bg-blue-50 text-gray-500 px-2 py-0.5 rounded-sm">{tag}</span>
                          ))}
                      </div>
                    </div>
                  </div>
                  
                  {post.hasImage && (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MyBoardPage;

